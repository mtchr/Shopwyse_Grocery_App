// ShopWyse — Kroger (Smith's) live price lookup.
//
// Runs as a Supabase Edge Function so the Kroger client secret never reaches the browser.
// The browser POSTs { term, zip, radius } (a search) or { productIds, zip, radius } (refresh
// prices for items already on a list). We find the nearest Smith's (any Kroger-family store
// if there's no Smith's), then return that store's prices for the matching products.
//
// Secrets (Supabase dashboard → Edge Functions → Secrets, or `supabase secrets set`):
//   kroger_client_key     Kroger application client ID     (KROGER_CLIENT_ID / KROGER_ID also accepted)
//   kroger_secret         Kroger application client secret (KROGER_CLIENT_SECRET also accepted)
//   KROGER_API_BASE (optional) defaults to production, https://api.kroger.com/v1
//
// Kroger limits: Products 10,000 calls/day, Locations 1,600 calls/day, shared by every user,
// so token, store and search results are cached in memory while the function stays warm.

type Json = Record<string, unknown>;

const env = (key: string): string | undefined =>
  (globalThis as any).Deno?.env.get(key) ?? (globalThis as any).process?.env?.[key];

// Accept the names the team set in Supabase as well as the original ones
const CLIENT_ID_NAMES = ['kroger_client_key', 'KROGER_CLIENT_KEY', 'KROGER_CLIENT_ID', 'kroger_client_id', 'KROGER_ID'];
const CLIENT_SECRET_NAMES = ['kroger_secret', 'KROGER_SECRET', 'KROGER_CLIENT_SECRET', 'kroger_client_secret'];
// Trims whitespace and surrounding quotes, which are easy to paste in by accident
const firstEnv = (names: string[]): string | undefined =>
  names.map(name => env(name)?.trim().replace(/^["']+|["']+$/g, '').trim()).find(Boolean);

const API_BASE = () => (env('KROGER_API_BASE') || 'https://api.kroger.com/v1').replace(/\/+$/, '');
const SEARCH_LIMIT = 20;            // Kroger allows 1–50
const FALLBACK_RADIUS_MILES = 50;   // used when no store is inside the user's radius
const LOCATION_TTL_MS = 24 * 60 * 60 * 1000;
const SEARCH_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function json(body: Json, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// ---------- Small TTL cache ----------
const cache = new Map<string, { expires: number; value: unknown }>();
function cacheGet<T>(key: string): T | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return hit.value as T;
}
function cacheSet(key: string, value: unknown, ttlMs: number) {
  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value as string);
  cache.set(key, { expires: Date.now() + ttlMs, value });
}

// ---------- OAuth2 client credentials ----------
let token: { value: string; expires: number } | null = null;

async function accessToken(): Promise<string> {
  if (token && token.expires > Date.now() + 60_000) return token.value;

  const id = firstEnv(CLIENT_ID_NAMES);
  const secret = firstEnv(CLIENT_SECRET_NAMES);
  if (!id || !secret) {
    console.error('Missing Kroger secrets. Set one of', CLIENT_ID_NAMES.join('/'), 'and one of', CLIENT_SECRET_NAMES.join('/'));
    throw new HttpError(500, 'Kroger credentials are not configured on the server.');
  }

  const res = await fetch(`${API_BASE()}/connect/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
    },
    body: 'grant_type=client_credentials&scope=product.compact',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    // Lengths only, never the values, to help spot a mis-pasted secret
    console.error('Kroger token request failed', res.status, body.error, body.error_description,
      `(client id length ${id.length}, secret length ${secret.length})`);
    throw new HttpError(502, 'Could not sign in to the Kroger API.');
  }
  token = { value: body.access_token, expires: Date.now() + Number(body.expires_in || 1800) * 1000 };
  return token.value;
}

async function krogerGet(path: string, params: Record<string, string>, retried = false): Promise<any> {
  const url = `${API_BASE()}${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${await accessToken()}` },
  });
  if (res.status === 401 && !retried) {
    token = null; // expired or revoked early: get a new one once
    return krogerGet(path, params, true);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Kroger API error', path, res.status, JSON.stringify(body.errors || body));
    if (res.status === 429) throw new HttpError(429, 'The Kroger API daily limit has been reached.');
    throw new HttpError(502, 'The Kroger API did not return results.');
  }
  return body;
}

// ---------- Store lookup ----------
type Store = { locationId: string; chain: string; name: string; address: Json; latitude: number | null; longitude: number | null };

async function nearestStore(zip: string, radius: number): Promise<{ store: Store; outsideRadius: boolean } | null> {
  const key = `loc:${zip}:${radius}`;
  const cached = cacheGet<{ store: Store; outsideRadius: boolean } | null>(key);
  if (cached !== undefined) return cached;

  const find = async (miles: number) => {
    const body = await krogerGet('/locations', {
      'filter.zipCode.near': zip,
      'filter.radiusInMiles': String(miles),
      'filter.limit': '25',
    });
    const stores = (body.data || []).filter((l: any) => l.chain && l.chain !== 'SHELL COMPANY');
    // Results come back nearest first; prefer Smith's (ShopWyse's Kroger banner in Utah).
    return stores.find((l: any) => l.chain === 'SMITHS') || stores[0] || null;
  };

  let outsideRadius = false;
  let loc = await find(radius);
  if (!loc && radius < FALLBACK_RADIUS_MILES) {
    loc = await find(FALLBACK_RADIUS_MILES);
    outsideRadius = Boolean(loc);
  }

  const result = loc
    ? {
        outsideRadius,
        store: {
          locationId: loc.locationId,
          chain: loc.chain,
          name: loc.name,
          address: loc.address || {},
          latitude: loc.geolocation?.latitude ?? null,
          longitude: loc.geolocation?.longitude ?? null,
        },
      }
    : null;
  cacheSet(key, result, LOCATION_TTL_MS);
  return result;
}

// ---------- Products ----------
function pickImage(images: any[] = []): string | null {
  const image = images.find(i => i.featured) || images.find(i => i.perspective === 'front') || images[0];
  const sizes: any[] = image?.sizes || [];
  const url = (sizes.find(s => s.size === 'medium') || sizes.find(s => s.size === 'thumbnail') || sizes[0])?.url;
  return typeof url === 'string' && url.startsWith('https://www.kroger.com/') ? url : null;
}

function toProduct(p: any): Json | null {
  // The first item that has a price at this store; products without one aren't comparable.
  const item = (p.items || []).find((i: any) => Number.isFinite(Number(i?.price?.regular)) && Number(i.price.regular) > 0);
  if (!item || !p.productId || !p.description) return null;
  const regular = Number(item.price.regular);
  const promo = Number(item.price.promo);
  const aisleInfo = (p.aisleLocations || [])[0];
  const aisleName = aisleInfo?.description ? String(aisleInfo.description) : null;
  const aisleNumber = aisleInfo?.number ? String(aisleInfo.number) : '';
  // Kroger sometimes repeats the number in the description ("AISLE 22"); produce uses number 0
  const aisle = aisleName && aisleNumber && aisleNumber !== '0' && !aisleName.includes(aisleNumber)
    ? `${aisleName} · Aisle ${aisleNumber}`
    : aisleName;
  return {
    productId: String(p.productId),
    description: String(p.description),
    brand: p.brand || null,
    categories: Array.isArray(p.categories) ? p.categories : [],
    size: item.size || null,
    soldBy: item.soldBy || null,
    regular,
    promo: promo > 0 && promo < regular ? promo : null,
    stockLevel: item.inventory?.stockLevel || null,
    aisle,
    image: pickImage(p.images),
    productPageURI: p.productPageURI || null,
  };
}

async function searchProducts(locationId: string, term: string) {
  const key = `search:${locationId}:${term.toLowerCase()}`;
  const cached = cacheGet<Json[]>(key);
  if (cached) return cached;
  const body = await krogerGet('/products', {
    'filter.term': term,
    'filter.locationId': locationId,
    'filter.limit': String(SEARCH_LIMIT),
  });
  const products = (body.data || []).map(toProduct).filter(Boolean) as Json[];
  cacheSet(key, products, SEARCH_TTL_MS);
  return products;
}

async function productsById(locationId: string, ids: string[]) {
  const body = await krogerGet('/products', {
    'filter.productId': ids.join(','),
    'filter.locationId': locationId,
  });
  return (body.data || []).map(toProduct).filter(Boolean) as Json[];
}

// ---------- Request handling ----------
function readInput(body: any) {
  const zip = String(body?.zip ?? '').trim();
  if (!/^\d{5}$/.test(zip)) throw new HttpError(400, 'Enter a valid 5-digit ZIP code.');

  const radius = Math.round(Number(body?.radius ?? 10));
  if (!Number.isFinite(radius) || radius < 1 || radius > 100) throw new HttpError(400, 'Radius must be between 1 and 100 miles.');

  if (Array.isArray(body?.productIds)) {
    const productIds = [...new Set(body.productIds.map(String))] as string[];
    if (!productIds.length || productIds.length > 50 || !productIds.every(id => /^\d{13}$/.test(id))) {
      throw new HttpError(400, 'productIds must be 1–50 Kroger product IDs.');
    }
    return { zip, radius, productIds, term: null };
  }

  const term = String(body?.term ?? '').trim().replace(/\s+/g, ' ');
  if (term.length < 3 || term.length > 127) throw new HttpError(400, 'Search for at least 3 characters.');
  return { zip, radius, productIds: null, term };
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  try {
    const { zip, radius, productIds, term } = readInput(await req.json().catch(() => null));
    const found = await nearestStore(zip, radius);
    if (!found) return json({ error: `No Smith's or Kroger-family store within ${FALLBACK_RADIUS_MILES} miles of ${zip}.` }, 404);

    const products = productIds
      ? await productsById(found.store.locationId, productIds)
      : await searchProducts(found.store.locationId, term as string);

    return json({ location: found.store, outsideRadius: found.outsideRadius, products, fetchedAt: new Date().toISOString() });
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error('kroger-search failed', error);
    return json({ error: 'Something went wrong looking up prices.' }, 500);
  }
}

if (typeof (globalThis as any).Deno?.serve === 'function') (globalThis as any).Deno.serve(handler);

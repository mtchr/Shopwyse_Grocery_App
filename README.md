# ShopWyse Grocery App

## App Summary

Grocery shopping is an essential but time-consuming task, and shoppers who want the best prices often have to check several stores to find them. Our primary persona, Stephanie Baldwin, is a 45-year-old shopping for a family of seven who is always looking to keep grocery costs down. She often discovers mid-trip that her groceries cost more than planned, and that another store nearby had the same items for less. ShopWyse solves this by letting shoppers search for their groceries ahead of time and compare prices across nearby stores (Walmart, Trader Joe's, Smith's, Costco, and Target in the Provo/Salt Lake area). Users enter a ZIP code and a driving radius, add items to a grocery list, and see which store gives them the lowest total. The app also includes a Hot Deals tab for recent low prices, a map of nearby stores, and notification preferences. It is designed to be simple and frictionless for a busy, older audience, with big buttons and a minimal login.

## ERD

Please see the ERD PDF for full ERD

### userstimes table

`userstimes` records one row per shopping trip, so we can track how long each user spends shopping.

| Column | Type | Notes |
| --- | --- | --- |
| `timeid` | `int8` | Primary key |
| `userid` | `int8` | Foreign key to `users.userid` (one user has many time entries) |
| `minutesspent` | `int8` | Length of the shopping trip in minutes |
| `loggedat` | `timestamptz` | When the trip was logged |

Column names are all lowercase, so unlike the camelCase columns in `users` (`"firstName"`, `"recentZip"`), they don't need double quotes in SQL.

## Tech Stack

| Layer | What we used | Why |
| --- | --- | --- |
| Frontend | A single HTML file (`shopwyseapp.html`) with plain JavaScript, styled with Tailwind CSS (CDN), plus Leaflet for the map and Font Awesome for icons | No build step or installs. Anyone on the team can open the file in a browser, make a change, and see it immediately, which fits a fast design-sprint prototype. |
| Backend / API | Supabase's auto-generated REST API, called with `supabase-js` (CDN) | Supabase creates an API for every table automatically, so we didn't have to write or host a server. |
| Database | Supabase (hosted PostgreSQL) | A real relational database that matches our ERD, with a web dashboard where the team can view and edit rows without writing SQL. |

This approach fits our team because we are a product design team building a prototype for user interviews, not a production system. Keeping everything in one file with a hosted database means less setup and more time spent testing with users. Because this is a demo, passwords are stored in plain text and Row Level Security is turned off. Use throwaway passwords only.

## How to Get It Running

1. Get a copy of the code:
   ```
   git clone https://github.com/mtchr/Shopwyse_Grocery_App.git
   ```
   Or, on GitHub, click **Code → Download ZIP** and unzip it.
2. Open the project folder and double-click `shopwyseapp.html` to open it in a web browser (Chrome, Edge, Firefox, or Safari). An internet connection is required, because the styling, map, and database are loaded online.
3. That's it. The Supabase project URL and publishable key are already in `shopwyseapp.html`, so the app connects to our shared database automatically.

**Using your own Supabase project instead (optional):**

1. Create a project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, create the users table:
   ```sql
   create table public.users (
     userid bigint generated always as identity primary key,
     created_at timestamptz not null default now(),
     "firstName" text not null,
     "lastName" text not null,
     email text not null,
     password text not null,
     notifications boolean,
     "recentZip" integer
   );
   alter table public.users disable row level security;
   ```
   Then create the `userstimes` table, which logs how long each user spends on a shopping trip:
   ```sql
   create table public.userstimes (
     timeid bigint generated always as identity primary key,
     userid bigint not null references public.users (userid) on delete cascade,
     minutesspent bigint not null,
     loggedat timestamptz not null default now()
   );
   alter table public.userstimes disable row level security;
   ```
3. Go to **Project Settings → API Keys** and copy the **Project URL** and **publishable key**. Never use the secret key in this app, because anyone who opens the page can read it.
4. In `shopwyseapp.html`, replace the values of `SUPABASE_URL` and `SUPABASE_ANON_KEY` near the top of the main `<script>` block, then open the file in a browser.

## Verifying the Vertical Slice

Our vertical slice is account creation and login: the **Complete Registration** button saves a new user to the Supabase `users` table, and the **Log In** button checks entered credentials against that table.

1. Open `shopwyseapp.html` and click **CREATE ACCOUNT** in the green banner on the home screen.
2. Enter a first name, last name, email, and password, then click **Complete Registration**. You should see "Account created successfully!" and your first name in the header.
3. **Refresh the page.** The app returns to its logged-out state, but your account is stored in the database.
4. Click **Account** in the header, then **Log In Now** in the pop-up. Enter the same email and password and click **Log In**. You should see "Successfully logged in!", your first name in the header, and "{First name}'s Grocery List" on the list screen. This proves the account survived the refresh.
5. To confirm it fails correctly, refresh the page again and try logging in with an email that has no account, or with the wrong password. You should see "Incorrect email or password" and stay on the login screen.
6. Optional: in the Supabase dashboard, open **Table Editor → users** to see the new row with the name, email, password, and notification preference you entered.

## Next Step: Average Shopping Time per User

Goal: given a `userid`, return that user's average `minutesspent` across all of their rows in `userstimes`.
Average time spent getting each item is 18.02 seconds.

### 1. The query

```sql
select
  userid,
  round(avg(minutesspent), 1) as avg_minutes,
  count(*)                    as trips
from public.userstimes
where userid = 42          -- the user you want
group by userid;
```

- `avg()` on an `int8` column returns a `numeric`, so `round(..., 1)` gives one decimal place (for example `37.5`).
- `count(*)` is included so the UI can say "based on N trips" and so we can tell the difference between "no data" and a real average.
- If the user has no rows, this returns **zero rows** (not a row with `0`). Handle that as "no trips logged yet" in the UI.
- To limit it to a time window, add a filter on `loggedat`, for example `and loggedat >= now() - interval '30 days'`.

Test it first in the Supabase **SQL Editor** with a real `userid` from the `users` table.

### 2. Expose it to the app as a function

`supabase-js` can't run raw SQL, and its table queries don't do `avg()` by default. The cleanest option is to wrap the query in a Postgres function and call it with `.rpc()`. Run this in the SQL Editor:

```sql
create or replace function public.avg_shopping_time(p_userid bigint)
returns table (avg_minutes numeric, trips bigint)
language sql
stable
as $$
  select round(avg(minutesspent), 1), count(*)
  from public.userstimes
  where userid = p_userid;
$$;
```

Without a `group by`, this always returns exactly one row: `avg_minutes` is `null` and `trips` is `0` when the user has no entries.

### 3. Call it from `index.html`

**Prerequisite:** the app doesn't keep the logged-in user's id yet. In `handleLogin`, next to `state.userFirstName = ...`, add `state.userId = data.userid;`. Do the same in `handleRegister`, adding `.select().single()` to the insert so the new row (and its `userid`) comes back.

```js
const { data, error } = await db.rpc('avg_shopping_time', { p_userid: state.userId });
if (error) {
  console.error(error);
} else if (data[0].trips === 0) {
  // show "No shopping trips logged yet"
} else {
  // show `${data[0].avg_minutes} min average over ${data[0].trips} trips`
}
```

`.rpc()` returns the rows as an array, which is why the result is read from `data[0]`.

### 4. Logging a trip (so there's data to average)

```js
await db.from('userstimes').insert({ userid: state.userId, minutesspent: 35 });
```

`timeid` is generated by the database and `loggedat` defaults to the current time, so neither needs to be sent.

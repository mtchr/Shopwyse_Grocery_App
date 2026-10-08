# ShopWyse Grocery App

## App Summary

Grocery shopping is an essential but time-consuming task, and shoppers who want the best prices often have to check several stores to find them. Our primary persona, Stephanie Baldwin, is a 45-year-old shopping for a family of seven who is always looking to keep grocery costs down. She often discovers mid-trip that her groceries cost more than planned, and that another store nearby had the same items for less. ShopWyse solves this by letting shoppers search for their groceries ahead of time and compare prices across nearby stores (Walmart, Trader Joe's, Smith's, Costco, and Target in the Provo/Salt Lake area). Users enter a ZIP code and a driving radius, add items to a grocery list, and see which store gives them the lowest total. The app also includes a Hot Deals tab for recent low prices, a map of nearby stores, and notification preferences. It is designed to be simple and frictionless for a busy, older audience, with big buttons and a minimal login.

## ERD

<img width="1282" height="555" alt="Shop Wyse ERD" src="https://github.com/user-attachments/assets/3e643844-3c99-497e-9de2-95931eee1718" />

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

# Setup and deployment

## 1. Install and configure

Install Node.js 22+ and npm, then run `npm ci` from the repository root. Copy `.env.example` to `.env`:

```powershell
Copy-Item .env.example .env
```

On macOS/Linux, use `cp .env.example .env` instead.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using credentials for your own disposable Supabase project. The client passes this key directly to `createClient`. Never put a service-role key in a `VITE_` variable: these values are embedded in the browser bundle. Restart Vite after changing the environment.

Firebase Analytics is optional. To enable it, populate the `VITE_FIREBASE_*` fields from your own Firebase web app configuration. The Firebase configuration previously tied to the original project has been moved out of source code. Existing local Supabase settings have been preserved.

## 2. Initialize a fresh demo backend

Read [SECURITY.md](SECURITY.md) first. The current UI authenticates against `profiles.password`, rather than Supabase Auth. Its requests therefore use anonymous database access, even after signing in.

1. Create a new Supabase project containing no real users or personal information.
2. Open the SQL Editor and execute [database/demo-schema.sql](../database/demo-schema.sql) once.
3. The script creates the eleven tables queried by the current UI, the `trip-images` public bucket, and demo-only database/storage access grants.
4. Configure the URL/key in `.env`, then run `npm run dev`.
5. Open `/auth`, choose **Sign Up**, and register a fictional account with a password you do not use elsewhere.
6. In the Supabase SQL Editor, approve and promote that account, replacing the example email:

```sql
UPDATE public.profiles
SET is_approved = true, role = 'admin'
WHERE email = 'your-demo-account@example.com';
```

7. Sign in. You can now approve other demo accounts through `/admin`.

The schema uses `CREATE TABLE` without replacement or drops; a second run will fail if those tables already exist. Its transaction prevents partial initialization if a statement fails. It is intended for fresh Supabase projects, not as an upgrade migration. It has not been exercised on a live backend during documentation preparation.

### Historical SQL files

The root SQL scripts are retained as development history. They do not form a complete fresh-install sequence:

| File | Original purpose / caveat |
| --- | --- |
| `update_schema.sql` | Earlier Supabase Auth trigger and approval changes; obsolete for the current login |
| `custom_auth_schema.sql` | Replaces profiles and auth relationships; drops data and disables RLS |
| `trips_extensions.sql` | Adds voting, comments, gallery links, and extra fields; drops several tables |
| `multiday_trip_schema.sql` | Earlier multi-day model; several column names differ from today's client |
| `create_admin.js` | Legacy Supabase Auth signup helper; does not provision the current custom-login admin |

Use only `database/demo-schema.sql` for the fresh demo flow above. Do not apply the historical scripts to an existing database without backups and a reviewed migration. Placeholder account values in the historical files are not usable credentials.

## 3. Explore the application

Create a trip through `/trips/new`. The creator is automatically inserted into `trip_members`. To see the Day Plan, Expenses, Transport, and Packing tabs, create a trip lasting more than one day. Add other approved accounts as members, then test comments and meeting votes with those demo accounts.

Photos, covers, and avatars are uploaded to the same `trip-images` bucket. The app uses public URLs, so uploads should contain only public demo media. Place search requires Nominatim; map previews require Google Maps. Resolving some shortened map links also requires the CodeTabs proxy.

## 4. Build and preview

```bash
npm run lint
npm run build
npm run preview
```

The build writes to `dist/`. The current bundle triggers Vite's 500 kB chunk warning; this is a performance follow-up, not a failed build.

## 5. Hosting configuration

Complete the security changes in [SECURITY.md](SECURITY.md) before exposing a real backend publicly.

`firebase.json` serves `dist/` and rewrites routes to `index.html`. Once you have selected your own Firebase project:

```bash
npx firebase login
npx firebase use --add
npm run build
npx firebase deploy --only hosting
```

`.firebaserc` is ignored because it identifies a local hosting project. Firebase Hosting can serve the app independently of Firebase Analytics. Other static hosts must serve `dist/` and rewrite non-file routes to `index.html` so `/trips/:id` works when opened directly.

Set environment variables before the build: Vite does not read server environment variables at runtime.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Blank page / Supabase URL error | Set both required environment values and restart Vite |
| Account pending approval | Set `is_approved = true` in the disposable database |
| Could not load trips / missing relation | Verify the fresh schema and the explicitly named member foreign keys |
| Expenses, transport, or packing fail | Older SQL uses different field names; compare the current demo schema |
| Upload fails | Verify the bucket name and storage policies |
| Maps do not load | Check network access and external service availability |
| Direct URL returns a hosting 404 | Configure the SPA rewrite to `index.html` |

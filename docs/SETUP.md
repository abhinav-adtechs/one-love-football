# Setting up One Love Football

Everything needed to go from an empty Supabase account to the app running on your phone. How the pieces fit together is in [`ARCHITECTURE.md`](ARCHITECTURE.md).

## 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com). A region near your players keeps things quick (the app was built for Bengaluru, so `ap-south-1`, Mumbai). From **Project settings → API**, copy the project URL and the `anon` key.

## 2. Run the migrations

In the **SQL editor**, run each file in [`supabase/migrations/`](../supabase/migrations) in order:

| File                                       | Adds                                                                                                                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `001_create_enums.sql`                     | Roles, match types and statuses, game formats, roster statuses, payment methods and statuses, ledger entry types, positions, attendance                                          |
| `002_create_profiles_and_auth_trigger.sql` | `profiles`, the `updated_at` helper, and `handle_new_user`, which creates a profile for every new sign-in                                                                        |
| `003`–`011`                                | `venues`, `matches` and `games`, `match_roster`, `match_billing`, `player_match_payments`, `ledger`, `venue_payments` and `venue_bookings`, `game_player_stats`, `notifications` |
| `012_create_indexes.sql`                   | Indexes for the common lookups                                                                                                                                                   |
| `013_create_rls_policies.sql`              | Row-level security on every table, and `is_host_or_admin()`                                                                                                                      |
| `014_create_storage_buckets.sql`           | `avatars` (public) and `payment-proofs` (private) buckets and their policies                                                                                                     |
| `015_add_ledger_update_policy.sql`         | Lets hosts and admins approve or reject ledger entries                                                                                                                           |
| `016_match_roster_payment_tracking.sql`    | `amount_collected` and `paid_at` on the roster for touchline cash; `venue_id` optional on turf payments                                                                          |
| `017_expand_game_format_enum.sql`          | 9v9, 10v10 and the three-team formats                                                                                                                                            |

> [!TIP]
> `supabase/schema.sql` is `001` to `014` in a single file. If you paste that instead, run `015`, `016` and `017` after it.

## 3. Turn on phone sign-in

Players sign in with a `+91` mobile number and a 6-digit code sent by SMS.

1. **Authentication → Providers → Phone**: enable it.
2. Connect one of the SMS providers Supabase supports and fill in its credentials there. They stay in Supabase; the app never sees them.
3. Optionally, add a test phone number and code under the Phone provider settings so you can sign in during development without sending real SMS.

## 4. Turn on live notifications

The notification bell subscribes to new rows in `notifications` through Supabase Realtime. No migration does this for you: in **Database → Publications**, add the `notifications` table to `supabase_realtime`. Without it, notifications still show, but only after a reload.

## 5. Make yourself an admin

Everyone starts as a `player`. Sign in to the app once (step 6) so your profile exists, then in the SQL editor:

```sql
update profiles set role = 'admin' where phone = '91XXXXXXXXXX';
```

Supabase stores phone numbers with the country code and without the `+`. Use `role = 'host'` for people who run matches and approve payments. An admin can do everything a host can.

## 6. Run it locally

```sh
npm install
cp .env.example .env
```

Fill in `.env`:

```sh
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

```sh
npm run dev      # http://localhost:5173
```

Sign in with your phone number, enter the code, and set your name, jersey number and positions.

> [!WARNING]
> `.env` is gitignored; keep it that way. Only the two `VITE_` values belong in it for the app. Never put the service-role key or a database URL in a variable starting `VITE_`, `NEXT_PUBLIC_` or `ONE_LOVE_`: `vite.config.ts` makes all three readable by client code.

## 7. Deploy to Vercel

1. **Add New → Project** and import the repository. Vercel detects Vite: build command `npm run build`, output directory `dist`.
2. Under **Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. They're baked in at build time, so redeploy after changing them.
3. Deploy. `vercel.json` rewrites every path to `index.html`, so links like `/matches/<id>` work when opened directly or refreshed.

## 8. Check it works

- `/login` loads in a private window; anything else sends you there.
- Signing in with a new number takes you to **Complete Your Profile**.
- As an admin, **New Match** and **Approve** appear in the bottom bar.
- Paste a WhatsApp match message on **New Match**, press **Parse Message**, and check the date, time and players.
- Submit a small top-up with a screenshot as a player; approve it as a host; the player's balance goes up and their bell shows **Payment Approved**.

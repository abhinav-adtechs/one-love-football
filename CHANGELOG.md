# Changelog

All notable changes to One Love Football are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- MIT `LICENSE`, `CONTRIBUTING.md`, this changelog, `docs/ARCHITECTURE.md` and `docs/SETUP.md`.
- A project banner and a README describing what the app does and how to run it.
- CI: `npm ci` and `npm run build` on every pull request and push to `main`.

## [0.1.0] - 2026-03-24

The first working version: from a pasted WhatsApp message to a billed match and a ledger per player.

### Added

- Phone sign-in with a +91 number and an SMS code, and a first-time profile: display name, jersey number and preferred positions.
- Roles (player, host, admin), protected routes and role-gated host screens.
- **New Match from WhatsApp:** paste a match message; the parser reads the title, date, time, venue and numbered player list with phone numbers, paid markers and guests, and matches players to profiles by phone.
- Game formats from 5v5 to 11v11 and three-team formats (6v6v6 to 9v9v9), with the fee per player split from the total cost.
- **Match billing:** turf cost, additional charges and round-off to a per-player share; mark players to pay, which creates their dues and a debit on their ledger.
- **Match page:** a players tab with touchline cash collection (per player, per team, with undo) and adding players or whole teams; a turf tab with turf payments against the booking cost.
- **Payments:** a balance per player from approved ledger entries, top-ups with method and screenshot proof, and a "Clear dues to join matches" flag below −₹300.
- **Approvals:** hosts approve or reject pending payments and record cash; the player is notified.
- **Notifications** with an unread count and realtime updates.
- **Community** directory with search and per-player stats.
- Supabase schema in 17 migrations: enums, tables, indexes, row-level security on every table, storage buckets for avatars and payment proofs.
- Vite + React + TypeScript single-page app with a Vercel rewrite for client-side routes.

[Unreleased]: https://github.com/abhinav-adtechs/one-love-football/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/abhinav-adtechs/one-love-football/commits/v0.1.0

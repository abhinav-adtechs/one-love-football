# Contributing to One Love Football

Thanks for helping. This app exists so the person who books the turf doesn't have to chase money all week, so the best contributions make a host's or a player's matchday simpler.

Please read the [Code of Conduct](https://github.com/abhinav-adtechs/.github/blob/main/CODE_OF_CONDUCT.md) before you take part. For security issues, don't open a public issue: follow the [security policy](https://github.com/abhinav-adtechs/.github/blob/main/SECURITY.md).

## Dev setup

You need Node.js 18 or newer (CI uses 22), npm, and a Supabase project of your own. Never develop against a live group's database.

```sh
git clone https://github.com/abhinav-adtechs/one-love-football.git
cd one-love-football
npm install
cp .env.example .env     # VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev              # http://localhost:5173
```

[`docs/SETUP.md`](docs/SETUP.md) walks through the Supabase side: migrations, phone sign-in, Realtime and making yourself an admin. A Supabase test phone number saves you real SMS while developing.

## Scripts

| Command            | Use it for                                                                 |
| ------------------ | -------------------------------------------------------------------------- |
| `npm run dev`      | The Vite dev server                                                        |
| `npm run build`    | A production build into `dist/` (CI runs this on every PR)                 |
| `npm run preview`  | Serving the production build locally                                       |
| `npx tsc --noEmit` | Type-checking. It doesn't pass yet (see the roadmap); don't add new errors |

## Where things go

- **Screens** in `src/pages/`, **data access** in `src/hooks/`, **pure helpers** in `src/lib/`.
- **Money** is always an integer number of paise. Convert at the edges with `rupeesToPaise` and `formatPaise` from `src/lib/currency.ts`.
- **Database changes** are a new numbered file in `supabase/migrations/` (the next is `019_…`). Never edit a migration that's been applied. Update `src/types.ts` to match.
- **Permissions** belong in row-level security, not only in `RoleGate`. If you add a table, add its policies in the same migration.
- **Phone numbers** go through `normalizePhone` and `phonesMatch` in `src/lib/parseWhatsApp.ts`.

## Branches and commits

- Branch from `main`: `feat/<short-name>`, `fix/<short-name>`, `docs/<short-name>`.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `feat: …`, `fix: …`, `docs: …`, `test: …`, `refactor: …`, `chore: …`, `ci: …`. Imperative mood, subject under 72 characters, and say _why_ in the body when it isn't obvious.
- Never commit `.env`, keys, real phone numbers or real payment screenshots.

## Filing issues

- **Bugs:** what you did, what you expected, what happened, your role (player, host, admin) and the device. For parser bugs, paste the WhatsApp message with names and numbers replaced.
- **Ideas:** start with the matchday problem it solves.
- Check [existing issues](https://github.com/abhinav-adtechs/one-love-football/issues) first.

## Pull request checklist

- [ ] `npm run build` passes
- [ ] No new `tsc --noEmit` errors
- [ ] Database changes are a new migration, with RLS policies and `src/types.ts` updated
- [ ] Amounts stay in paise end to end
- [ ] Tried on a phone-width screen as a player and as a host
- [ ] No secrets, real phone numbers or personal data in the diff
- [ ] The PR description says what changed and why, with a screenshot for UI changes

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).

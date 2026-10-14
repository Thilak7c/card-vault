# Card Vault

A private web app for business cards. Photograph a card, AI reads it, you check the fields, and it goes into a searchable directory you can also ask questions about.

Next.js 16 (App Router) · Tailwind 4 · TanStack Query · Drizzle + Turso (libSQL) · Auth.js v5 · Groq · Tesseract.js

## Run locally

```bash
npm install
cp .env.example .env.local      # then fill it in (see below)
npm run db:migrate              # creates tables in local.db (or your Turso DB)
npm run dev                     # http://localhost:3000
```

If `TURSO_DATABASE_URL` is not set, the app uses a local SQLite file, `local.db`.

| Variable | Notes |
|---|---|
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | `turso db show <db> --url`, `turso db tokens create <db>` |
| `GROQ_API_KEY` | Without it, Scan offers manual entry and Ask is unavailable |
| `GROQ_VISION_MODEL` | A current Groq vision model (check Groq's model list) |
| `GROQ_CHAT_MODEL` | A current Groq model with tool calling |

## Scripts

| Command | What it does |
|---|---|
| `npm run db:generate` | Create a migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to the database in `.env.local` |
| `npm run db:studio` | Browse the database |
| `npm run seed -- 2000` | Add fake cards (refuses a remote DB unless you pass `--remote`) |
| `npm run typecheck` / `npm run lint` | Checks |

## Deploy (Vercel + Turso)

1. `turso db create card-vault`, then get the URL and a token.
2. With those set in `.env.local`, run `npm run db:migrate`.
3. Push to a **private** GitHub repo and import it in Vercel.
4. Add every variable above in Project Settings → Environment Variables.
5. Deploy and use "Add to Home Screen" on your phone.

## Layout

```
src/
  db/schema.ts            cards, card_images, events, tags, card_tags
  lib/cards.ts            save, search, duplicates, export (server only)
  lib/agent.ts            Ask agent: Groq tool-calling loop over read-only tools
  lib/ocr.ts              on-device Tesseract fallback / Private mode
  app/api/*               extract, cards, cards/[id], cards/duplicates, events, tags, export, import, ask
  app/(app)/*             Cards, card detail, Scan + Review, Events, Ask, Settings
```

## Notes

- Rate limits (extract, ask) are kept in memory per server instance, so on Vercel they are a speed bump, not a hard limit.
- Ask only renders links that start with `/cards/`. Any other link in an answer is shown as plain text.
- Private mode and the last-export date are saved per device, in the browser.
- Imports with images can exceed Vercel's request body limit (about 4.5 MB). If that happens, import a backup made without images.

# LefokoConnect

LefokoConnect is a small public web prototype for learning Setswana vocabulary through a Botswana-themed word-connect and crossword game.

Current static content: 20 dictionary words and 20 validated levels. Admin content can add more words and levels locally in the browser.

## Tech Stack

- React, TypeScript, and Vite
- Tailwind CSS
- Express custom server
- Gemini API for cultural hints and admin-only puzzle generation
- Local browser storage for player progress
- Local browser storage plus JSON import/export for admin content
- Vitest for domain validation tests

## Local Setup

Prerequisites: Node.js 20+.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment example:

   ```bash
   copy .env.example .env
   ```

3. Edit `.env`:

   ```text
   GEMINI_API_KEY="your-gemini-api-key"
  ADMIN_TOKEN="a-long-random-admin-token"
  APP_URL="http://localhost:3000"
  GEMINI_MODEL="gemini-3.5-flash"
  PORT=3000
  ```

4. Run locally:

   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` starts the Express server with Vite middleware.
- `npm run lint` runs TypeScript checks.
- `npm test` runs Vitest tests.
- `npm run build` builds the frontend and bundled server.
- `npm start` runs the production build from `dist/server.cjs`.
- `npm run clean` removes generated build output.

## Admin And Gemini Behavior

The normal game is public. The admin console is hidden in production builds and is intended for local/admin use only.

Admin-created words and levels are stored in browser `localStorage` under `lefoko_admin_content_bundle`. Static words and levels in `src/data/dictionary.ts` remain the fallback content. Use the admin export JSON action to back up local content before clearing browser data or changing devices.

Imported level JSON must pass the same `validateLevel()` checks as static and AI-generated levels before it can be enabled for gameplay. Invalid levels are rejected by the admin tools and are not merged into active play.

Admin import supports merge or replace. Merge skips duplicate custom words and duplicate level identifiers; replace intentionally overwrites the local admin bundle after validation.

Minimal uploaded level shape:

```json
{
  "title": "Water Blessing",
  "letters": ["M", "E", "T", "S", "I"],
  "mainWords": ["METSI", "TSE"],
  "bonusWords": ["ME", "SE"],
  "gridSize": 5,
  "difficulty": "beginner",
  "themeName": "Okavango Waterways",
  "gridWords": [
    { "word": "METSI", "r": 1, "c": 0, "direction": "H", "clue": "Water." },
    { "word": "TSE", "r": 1, "c": 2, "direction": "V", "clue": "These ones." }
  ]
}
```

`POST /api/puzzle/generate` requires:

```text
Authorization: Bearer <ADMIN_TOKEN>
```

Generated AI levels are normalized and validated before being accepted. If Gemini fails, the API returns a controlled error and may include a validated fallback level for session use.

`POST /api/hint/explain` is public but rate limited.

## Deployment Notes

LefokoConnect uses a custom Node/Express server. Deploy it to Node hosting that can run `npm start` and provide environment variables.

Required environment variables:

- `GEMINI_API_KEY`
- `ADMIN_TOKEN`
- `APP_URL`
- `GEMINI_MODEL` optional
- `PORT` if your host does not inject one

Plain static hosting is not enough unless the API routes are adapted separately.

See `DEPLOYMENT.md` for the production smoke-test checklist.

## Phone Play Notes

The gameplay shell is designed around a no-scroll phone play surface for common mobile sizes, including 360x640, 390x844, and 430x932. Modals and admin panels may scroll independently.

Reward farming is blocked with a local reward-claim ledger. Replays remain playable for practice, including Daily replays, but duplicate XP, coins, gems, bonus word rewards, and achievement progress are not paid again.

## Mini-Project Limitations

- No user accounts or database.
- Player progress is stored in browser `localStorage`.
- Admin-added dictionary words, imported levels, and saved AI-generated levels are local to the current browser until exported as JSON.
- No database or cloud sync exists yet for admin content.
- Admin analytics and alert previews are demo data, not real telemetry or push notifications.
- Setswana wording and cultural context should still be reviewed by a fluent Setswana speaker before wider launch.

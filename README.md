# LefokoConnect

LefokoConnect is a small public web prototype for learning Setswana vocabulary through a Botswana-themed word-connect and crossword game.

## Tech Stack

- React, TypeScript, and Vite
- Tailwind CSS
- Express custom server
- Gemini API for cultural hints and admin-only puzzle generation
- Local browser storage for player progress
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
- `PORT` if your host does not inject one

Plain static hosting is not enough unless the API routes are adapted separately.

## Mini-Project Limitations

- No user accounts or database.
- Player progress is stored in browser `localStorage`.
- Admin-added dictionary words and AI-generated levels are session/browser-only.
- Admin analytics and alert previews are demo data, not real telemetry or push notifications.
- Setswana wording and cultural context should still be reviewed by a fluent Setswana speaker before wider launch.

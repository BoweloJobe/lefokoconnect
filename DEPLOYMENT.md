# LefokoConnect Deployment

LefokoConnect is a Node/Express deployment. The React app is built by Vite and served by the bundled Express server.

## Build And Start

```bash
npm install
npm run build
npm start
```

Production start runs `dist/server.cjs`, so the build step is required before `npm start`.

## Environment Variables

Required for AI-backed features:

- `GEMINI_API_KEY`: server-side Gemini key for cultural hints and admin puzzle generation.
- `ADMIN_TOKEN`: long random token required by `POST /api/puzzle/generate`.
- `APP_URL`: deployed public origin.
- `PORT`: optional if the host injects one.
- `GEMINI_MODEL`: optional model override, defaults to `gemini-3.5-flash`.

Base gameplay works without Gemini. If Gemini is missing, admin AI generation returns a configuration error and cultural hints use a safe fallback.

## Hosting Notes

Use a host that can run a persistent Node process. Plain static hosting can serve the built frontend only if API routes are adapted elsewhere.

Admin content is browser-local. Custom words, imported levels, and saved AI-generated levels live in `localStorage` and should be exported as JSON for backup or transfer.

## Smoke Test After Deploy

- Open the root URL.
- Open `/api/health` and confirm it returns `status: ok`.
- Play Classic level 1 on a phone-sized viewport.
- Complete Daily once, refresh, and replay it to confirm no duplicate rewards.
- Start Time Attack and let it fail; confirm Retry and Return to Classic both recover cleanly.
- Open the dictionary.
- In local/dev admin mode, add a custom word, refresh, export JSON, and import it again.
- Call `POST /api/puzzle/generate` without a token and confirm it returns 401 or 503.
- Call `POST /api/hint/explain` and confirm it returns either Gemini text or the fallback explanation.

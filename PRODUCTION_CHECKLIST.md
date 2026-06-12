# LefokoConnect Production Checklist

Before a public launch:

- [ ] `.env` or host environment variables configured.
- [ ] `GEMINI_API_KEY` set.
- [ ] `ADMIN_TOKEN` set to a long random value.
- [ ] `APP_URL` set to the deployed URL.
- [ ] `PORT` provided by host or default `3000` is acceptable.
- [ ] `npm install` completed from `package-lock.json`.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] `npm start` serves the built frontend.
- [ ] Static levels validate successfully.
- [ ] Gemini endpoints are rate limited.
- [ ] Admin puzzle generation rejects missing/invalid tokens.
- [ ] Mock admin analytics and local alert previews are not presented as real telemetry.
- [ ] Generated AI levels are validated before use.
- [ ] Imported/admin levels validate before they are enabled.
- [ ] Admin content export JSON has been downloaded/copied as a backup if custom browser content matters.
- [ ] Team understands admin content is localStorage-only; there is no database or cloud sync yet.
- [ ] Manual mobile check completed for game board, letter wheel, and modals.
- [ ] Manual keyboard check completed for modal open/close controls.
- [ ] Gemini quota/billing limits reviewed in the Google AI/Gemini console.

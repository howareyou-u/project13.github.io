# Backend (serverless) for Project13

This folder contains two Vercel-compatible serverless functions used for Discord OAuth flows:

- `callback.js` — exchanges the OAuth2 `code` for tokens (uses CLIENT_ID and CLIENT_SECRET) and fetches user + guilds, then redirects to the frontend with `?token=...&user=...&guilds=...`.
- `verify.js` — receives a POST with `{ token }` and calls `https://discord.com/api/users/@me` to verify the token.

Important environment variables (set these in Vercel project settings or other host):

- `CLIENT_ID` — Discord application client id
- `CLIENT_SECRET` — Discord application client secret (keep private)
- `REDIRECT_URI` — The backend callback URL (e.g. `https://<your-backend>.vercel.app/api/callback`)
- `FRONTEND_URI` — Your frontend site (e.g. `https://howareyou-u.github.io/project13.github.io`)

Deployment notes
- This code is written for serverless Node environments like Vercel. If you deploy elsewhere, ensure the host supports Node serverless functions and that `process.env` variables are configured.
- The Discord token exchange must run server-side (Discord does not allow cross-origin token exchange). Keep `CLIENT_SECRET` secret.

Testing locally
- You can test locally using Vercel CLI (see root `DEPLOY_VERCEL.md`). When testing locally, make sure `REDIRECT_URI` is set to the public URL Vercel provides (or use a tool like ngrok to expose a local server).

Security
- Never commit secrets to the repository. Use the hosting provider's environment variables feature.

How it integrates with the frontend
- The frontend (GitHub Pages) should trigger the OAuth flow with `redirect_uri` pointing to the backend (`/api/callback`). The backend will then redirect back to the frontend `FRONTEND_URI` adding `?token=...&user=...&guilds=...`. The frontend reads those params (see `callback.html`) and stores them in `localStorage`.

If you need help deploying this to Vercel, see `../DEPLOY_VERCEL.md` for step-by-step commands.

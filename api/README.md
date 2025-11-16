# Backend (serverless) for Project13

This folder contains Vercel-compatible serverless functions used for Discord OAuth flows and bot configuration:

- `callback.js` — exchanges the OAuth2 `code` for tokens (uses CLIENT_ID and CLIENT_SECRET) and fetches user + guilds, then redirects to the frontend with `?token=...&user=...&guilds=...`.
- `verify.js` — receives a POST with `{ token }` and calls `https://discord.com/api/users/@me` to verify the token.
- `guilds.js` — gets list of guilds where user is admin
- `guild-config.js` — gets/sets guild configuration (requires BOT_TOKEN if bot is hosted, works with user token if bot is local)
- `save-config.js` — saves guild configuration to MongoDB

## Important environment variables (set these in Vercel project settings):

### Required:
- `CLIENT_ID` — Discord application client id
- `CLIENT_SECRET` — Discord application client secret (keep private)
- `REDIRECT_URI` — The backend callback URL (e.g. `https://<your-backend>.vercel.app/api/callback`)
- `FRONTEND_URI` — Your frontend site (e.g. `https://howareyou-u.github.io/project13.github.io`)

### Optional (but recommended):
- `BOT_TOKEN` — Discord bot token (required if bot is hosted on server, optional if bot runs locally)
  - **If bot runs locally**: You can omit this, the API will use user token to get basic info
  - **If bot is hosted**: Set this to allow full bot functionality from the dashboard
- `MONGODB_URI` — MongoDB connection string (for storing guild configs)
- `MONGODB_DB` — MongoDB database name (default: 'discord-bot')

## Deployment notes
- This code is written for serverless Node environments like Vercel. If you deploy elsewhere, ensure the host supports Node serverless functions and that `process.env` variables are configured.
- The Discord token exchange must run server-side (Discord does not allow cross-origin token exchange). Keep `CLIENT_SECRET` secret.

## Testing locally
- You can test locally using Vercel CLI (see root `DEPLOY_VERCEL.md`). When testing locally, make sure `REDIRECT_URI` is set to the public URL Vercel provides (or use a tool like ngrok to expose a local server).

## Security
- Never commit secrets to the repository. Use the hosting provider's environment variables feature.

## How it integrates with the frontend
- The frontend (GitHub Pages) should trigger the OAuth flow with `redirect_uri` pointing to the backend (`/api/callback`). The backend will then redirect back to the frontend `FRONTEND_URI` adding `?token=...&user=...&guilds=...`. The frontend reads those params (see `callback.html`) and stores them in `localStorage`.

## Bot running locally
If your bot runs locally (not on a server), the API will:
- Use the user's token to get guild information
- Still allow configuration to be saved to MongoDB
- The bot will read configurations from MongoDB when it starts

If you need help deploying this to Vercel, see `../DEPLOY_VERCEL.md` for step-by-step commands.

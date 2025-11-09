# Deploy backend to Vercel (step-by-step)

This guide shows the minimal steps to deploy the `api/` functions on Vercel and configure Discord redirect URIs.

1) Create a Vercel account and connect your GitHub repository

- Go to https://vercel.com and sign in with GitHub.
- Import the repository `project13.github.io` (or the repo where these files live).

2) Deploy for the first time

- Vercel will detect the `vercel.json` and the `api/` functions and create a project. Deploy once to get the project domain (e.g. `https://project-name.vercel.app`).

3) Set environment variables in Vercel (Project Settings → Environment Variables)

- Add the following variables (do NOT store secrets in the repo):

  - `CLIENT_ID` = (your Discord client id)
  - `CLIENT_SECRET` = (your Discord client secret)
  - `REDIRECT_URI` = `https://<your-project>.vercel.app/api/callback`  (replace `<your-project>` with your Vercel project domain)
  - `FRONTEND_URI` = `https://howareyou-u.github.io/project13.github.io`

4) Update Redirect URI in Discord Developer Portal

- In your Discord application settings → OAuth2 → Redirects, remove the GitHub Pages callback and add the backend callback URL (exact):

  `https://<your-project>.vercel.app/api/callback`

  Replace `<your-project>` with your Vercel project domain. Save changes.

5) Test the flow

- From your frontend (GitHub Pages), initiate the OAuth flow. Discord will redirect to the Vercel backend at `/api/callback` with `?code=...`.
- The backend will exchange the code for a token and redirect back to the frontend `FRONTEND_URI` with `?token=...&user=...&guilds=...`.
- The frontend's `callback.html` will parse these params and store the token in `localStorage`.

CLI alternative (optional)

- Install Vercel CLI (if you prefer deploying from your machine):

```powershell
npm i -g vercel
vercel login
vercel --prod
```

- To set env vars via CLI (replace values and project scope as needed):

```powershell
vercel env add CLIENT_ID production
vercel env add CLIENT_SECRET production
vercel env add REDIRECT_URI production
vercel env add FRONTEND_URI production
```

Notes & security

- Keep `CLIENT_SECRET` private. Use Vercel's environment variables; do not commit secrets.
- After updating environment variables, trigger a new deployment so the functions pick up the new values.

If you want, I can prepare a small checklist of the exact values you should paste into the Discord panel and the Vercel env fields (you provide the Vercel project name when it's created), and I can validate your `callback.html` / `dashboard.js` wiring again.

# Walkthru App

Next.js 16 web app for the Walkthru developer comprehension platform.

## Environment Variables

| Variable | Description |
|---|---|
| `GITHUB_CLIENT_ID` | OAuth App client ID from GitHub |
| `GITHUB_CLIENT_SECRET` | OAuth App client secret from GitHub |
| `NEXTAUTH_SECRET` | Random string (reserved for future signing) |
| `NEXT_PUBLIC_APP_URL` | Deployed app URL, e.g. `https://walkthru.replit.app` |

On Replit these are set as Secrets. For local dev, create a `.env.local` file:

```
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
NEXTAUTH_SECRET=any-random-string
NEXT_PUBLIC_APP_URL=http://localhost:3000
REPLIT_DB_URL=your_replit_db_url
```

## Register a GitHub OAuth App

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
2. Set **Application name**: `Walkthru` (or any name)
3. Set **Homepage URL**: your app URL (e.g. `https://walkthru.replit.app`)
4. Set **Authorization callback URL**: `https://walkthru.replit.app/api/auth/github/callback`
   - For local dev: `http://localhost:3000/api/auth/github/callback`
5. Click **Register application**, then generate a client secret
6. Copy the Client ID and Client Secret into your environment variables

## Running Locally

**Note:** `@replit/database` requires `REPLIT_DB_URL` to be set. You can get your Replit DB URL from the Replit shell via `echo $REPLIT_DB_URL`, then add it to `.env.local`.

```bash
npm install
npm run dev
```

Open [http://localhost:3000/test](http://localhost:3000/test) to use the test page.

Because Replit Auth works via injected headers (`X-Replit-User-Id`, `X-Replit-User-Name`), local dev won't have a real Replit identity. To test locally, use a reverse proxy or curl with fake headers:

```bash
# Test status endpoint with fake Replit headers
curl -H "X-Replit-User-Id: test123" -H "X-Replit-User-Name: testuser" \
  http://localhost:3000/api/auth/status
```

## Running on Replit

1. Add the four environment variables as Replit Secrets
2. Click **Run** — `npm run dev` starts automatically
3. Visit the `/test` route on your Replit app URL
4. Sign in via Replit (automatic on Replit), then click **Connect GitHub**
5. After OAuth, you'll be redirected back to `/test` with GitHub connected

## API Routes

| Route | Auth | Description |
|---|---|---|
| `GET /api/auth/github` | none | Redirects to GitHub OAuth |
| `GET /api/auth/github/callback` | Replit header | Exchanges code for token, stores it |
| `GET /api/auth/status` | none | `{ replit_authed, github_connected, username }` |
| `GET /api/repos` | Replit + GitHub | Returns 20 most-recent repos |
| `GET /api/commits?owner=&repo=&limit=` | Replit + GitHub | Returns up to `limit` commits (default 500) |

# 2026-03-06 — Cloudflare Pages Setup Guide & Gotchas

## Step 1: Create API token
Cloudflare dashboard → **My Profile** → **API Tokens** → **Create Token** → Custom token. The critical permission is **Account → Cloudflare Pages → Edit**. Without it, every deploy fails with `Authentication error [code: 10000]`. The token created for this project ("doodler build token") was given broad permissions including Pages, Workers, R2, KV, D1, etc. — only Pages Edit is actually needed.

## Step 2: Initial deploy from Cloudflare dashboard (failed multiple times)

**Gotcha #1 — Workers vs Pages deploy command.** The Cloudflare dashboard pre-fills the deploy command as `npx wrangler deploy`, which is for **Workers** (serverless functions), not **Pages** (static sites). For a static Vite app the correct command is:
```
npx wrangler pages deploy dist --project-name=doodler
```

**Gotcha #2 — Project must exist before deploying.** Running `wrangler pages deploy` against a project name that doesn't exist fails with `Project not found [code: 8000007]`. The Pages project must be created first. The fix was a two-part deploy command for the first run:
```
npx wrangler pages project create doodler --production-branch=master && npx wrangler pages deploy dist --project-name=doodler
```
After the first successful deploy, simplify back to just the deploy command.

**Gotcha #3 — `--commit-dirty=true` flag.** Without this flag, wrangler may refuse to deploy if there are uncommitted changes in the build environment. Adding it avoids false failures in CI.

## Step 3: Move to GitHub Actions (final approach)
Rather than relying on Cloudflare's built-in CI (which requires connecting the GitHub repo via the dashboard), we added a deploy step to the existing GitHub Actions workflow. This keeps everything in one pipeline: build → unit tests → e2e tests → deploy.

Two **repository secrets** (not environment secrets) were added in GitHub repo → **Settings** → **Secrets and variables** → **Actions**:
- `CLOUDFLARE_API_TOKEN` — the token from Step 1
- `CLOUDFLARE_ACCOUNT_ID` — found in the Cloudflare dashboard URL or error messages (e.g. `da9e717e0a9f0bd50eaa489d60e7627a`)

**Gotcha #4 — Repository vs environment secrets.** GitHub offers both. Environment secrets require setting up a "deployment environment" with approval rules — unnecessary overhead. Repository secrets are available to all workflow runs and are the right choice here.

## Step 4: Clean up
The initial manual deploy via the Cloudflare dashboard created a Worker alongside the Pages project. The Worker is unnecessary and can be safely deleted from the dashboard — only the Pages project is needed.

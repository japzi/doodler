# 2026-03-06 — Cloudflare Pages Deployment

## Files modified
- `.github/workflows/ci.yml` (22 lines) — added Cloudflare Pages deploy step

## Problem statement
The app had no hosting or automated deployment. Needed a way to deploy the static Vite build to Cloudflare Pages automatically on every push to master.

## Solution implementation
Added a deploy step to the existing GitHub Actions CI workflow that runs after build and tests pass. It only triggers on pushes to master (not PRs):

```yaml
- name: Deploy to Cloudflare Pages
  if: github.ref == 'refs/heads/master' && github.event_name == 'push'
  run: npx wrangler pages deploy dist --project-name=doodler
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

Two repository secrets were added to GitHub: `CLOUDFLARE_API_TOKEN` (reused the existing "doodler build token" which already had Cloudflare Pages Edit permission) and `CLOUDFLARE_ACCOUNT_ID`.

The Cloudflare Pages project was initially created manually via:
```
npx wrangler pages project create doodler --production-branch=master && npx wrangler pages deploy dist --project-name=doodler
```

## Testing/validation
- CI workflow pushed to master — triggers build, unit tests, e2e tests, then deploys to Cloudflare Pages

## Development learnings
See also: `journal/2026-03-06-cloudflare-pages-setup-guide.md` for the full setup walkthrough and gotchas.

- **Cloudflare Pages vs Workers**: The Cloudflare dashboard default deploy command `npx wrangler deploy` is for Workers, not Pages. For static sites, use `npx wrangler pages deploy dist --project-name=<name>`.
- **Project must exist first**: `wrangler pages deploy` fails with "Project not found" if the Pages project hasn't been created yet. Need `wrangler pages project create` on first deploy.
- **API token permissions**: The Cloudflare API token needs explicit **Cloudflare Pages → Edit** permission or deploys fail with authentication error code 10000.
- **GitHub secrets type**: Use repository secrets (not environment secrets) for GitHub Actions — environment secrets require extra deployment environment setup.

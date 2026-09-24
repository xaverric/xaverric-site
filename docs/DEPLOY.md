# Deploying xaverric.cz

The **Deploy** workflow deploys the Worker `xaverric-site` on every push to `main` (and on a manual run from `main`). These steps are needed once.

## 1. DNS

The Worker claims `xaverric.cz` and `www.xaverric.cz` as custom domains (see `routes` in `wrangler.toml`). A custom domain can only be attached when the hostname has no conflicting DNS record, so before the first deploy remove the existing `A`/`AAAA`/`CNAME` records for:

- `xaverric.cz` (apex)
- `www.xaverric.cz`

Cloudflare creates the records for the custom domains itself during the deploy. Other records in the zone (for example `leaderborder.xaverric.cz`) stay untouched.

## 2. Cloudflare API token

Cloudflare dashboard > My Profile > API Tokens > Create Token > template **Edit Cloudflare Workers**, limited to:

| Scope | Permission |
|---|---|
| Account > Workers Scripts | Edit |
| Account > Account Settings | Read |
| User > User Details | Read |
| Zone > Zone | Read |
| Zone > Workers Routes | Edit |

Account resources: only your account. Zone resources: only `xaverric.cz`. Set an expiry and rotate it.

## 3. GitHub environment and secrets

Create the environment `production` (Settings > Environments), optionally with yourself as required reviewer and a deployment branch policy that allows only `main`:

```sh
gh api -X PUT repos/xaverric/xaverric-site/environments/production \
  -F "deployment_branch_policy[protected_branches]=false" \
  -F "deployment_branch_policy[custom_branch_policies]=true"
gh api -X POST repos/xaverric/xaverric-site/environments/production/deployment-branch-policies -f name=main -f type=branch
```

Store the Cloudflare values as environment secrets (the value is read from stdin, so it never lands in shell history):

```sh
gh secret set CLOUDFLARE_API_TOKEN --env production --repo xaverric/xaverric-site
gh secret set CLOUDFLARE_ACCOUNT_ID --env production --repo xaverric/xaverric-site
```

Without them the deploy job succeeds with a "Deploy skipped" notice.

## Optional

- `GITHUB_TOKEN` Worker secret: `/api/live` calls the GitHub API unauthenticated, which is rate limited per IP and Cloudflare egress IPs are shared. The last good value is served when GitHub refuses, but a fine-grained token with no permissions raises the limit: `npx wrangler secret put GITHUB_TOKEN`.
- HSTS is sent as `max-age=31536000` without `includeSubDomains`, because on the apex it would force HTTPS on every `*.xaverric.cz` host. Add it (and `preload`) in `src/http.js` and `public/_headers` once every subdomain serves HTTPS.

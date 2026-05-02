# Env + JWT Setup

Auth fails quietly when env is malformed. Treat setup like explosives handling, not checkbox clicking.

## Convex Dashboard Env

Set on target deployment:

```text
RESEND_API_KEY=re_...
AUTH_RESEND_FROM=noreply@example.com
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----"
JWKS={"keys":[...]}
```

`CONVEX_SITE_URL` may be built-in on Convex Cloud. If Convex says it is forbidden, stop trying to set it. Use dashboard-provided site URL.

## Generate JWT Keys

Use official Convex Auth manual setup pattern: RS256 keypair, private key as PKCS8, public key as JWKS.

```js
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const keys = await generateKeyPair("RS256", { extractable: true });
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

console.log("JWT_PRIVATE_KEY=" + JSON.stringify(privateKey.trimEnd().replace(/\n/g, " ")));
console.log("JWKS=" + jwks);
```

If `jose` is unavailable, use Node `crypto.generateKeyPairSync("rsa", { modulusLength: 2048 })`, export private key as `pkcs8/pem`, public key as `jwk`, and wrap public key in `{ "keys": [{ "use": "sig", ...jwk }] }`.

## Setting Env

Prefer Convex MCP env tools when available. If MCP times out, use CLI fallback:

```bash
bunx convex env set AUTH_RESEND_FROM "noreply@example.com"
bunx convex env set JWT_PRIVATE_KEY -- "-----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----"
bunx convex env set JWKS '{"keys":[...]}'
```

The `--` separator matters when value starts with dashes. PEM starts with dashes. Shell CLIs are dumb; compensate.

## Frontend Env

Next app needs only public Convex URL:

```env
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

Do not put `RESEND_API_KEY`, `JWT_PRIVATE_KEY`, OAuth secrets, or JWKS in frontend env.

## Verification

Run:

```bash
bun run build
bun run typecheck
bunx convex env list
```

Avoid printing secret values in chat/logs. If secret leaks in terminal transcript, tell user to rotate it. No denial, no vibes.

## Anti-Patterns

- Do not commit `.env`, `.env.local`, generated JWT dumps, or temporary key files.
- Do not use same JWT keypair across reusable templates and production apps.
- Do not use malformed multi-line PEM without quote handling.
- Do not set `CONVEX_SITE_URL` if deployment treats it as built-in.

# PayZone Environment Variables

## CRITICAL: Two Different Keys

PayZone provides **two separate secret keys** for different purposes. Using the wrong key is the #1 cause of integration failures.

| Key | Purpose | Used In | Runtime |
|-----|---------|---------|---------|
| `PAYZONE_SECRET_KEY` | Sign outbound payment payloads | Next.js Server Action | Node.js |
| `PAYZONE_NOTIFICATION_KEY` | Verify inbound webhook signatures | Convex HTTP Router | Edge/V8 |

**⚠️ Common Mistake:** Using `PAYZONE_SECRET_KEY` for webhook verification or vice versa will cause signature mismatches.

## Required Variables

### Next.js Application (.env.local)

```bash
# PayZone Merchant Configuration
PAYZONE_MERCHANT_ACCOUNT="your_merchant_id_here"
PAYZONE_SECRET_KEY="sk_xxxxxxxxxxxxxxxxxxxxxxxx"
PAYZONE_URL="https://payzone.ma/api/payment"

# Application URLs
NEXT_PUBLIC_APP_URL="https://yourapp.com"
CONVEX_HTTP_URL="https://your-deployment.convex.site"

# Note: PAYZONE_NOTIFICATION_KEY is NOT needed in Next.js
# It's only used in the Convex backend
```

### Convex Backend (Environment Variables in Dashboard)

```bash
# Webhook Verification Key (different from SECRET_KEY!)
PAYZONE_NOTIFICATION_KEY="nk_xxxxxxxxxxxxxxxxxxxxxxxx"

# Optional: For additional verification
PAYZONE_MERCHANT_ACCOUNT="your_merchant_id_here"
```

## Variable Details

### `PAYZONE_MERCHANT_ACCOUNT`
- **Source:** PayZone Dashboard → Account Settings
- **Format:** Alphanumeric string
- **Example:** `MERCH123456`
- **Used in:** Both payload and webhook verification

### `PAYZONE_SECRET_KEY`
- **Source:** PayZone Dashboard → API Keys → Secret Key
- **Format:** `sk_` prefix + 32 alphanumeric characters
- **Example:** `sk_live_a1b2c3d4e5fxxxxxxxk1l2m3n4o5p6`
- **Security:** Never expose to client, never commit to git
- **Usage:** Concatenated with JSON payload for SHA-256 signature

### `PAYZONE_NOTIFICATION_KEY`
- **Source:** PayZone Dashboard → Webhook Settings → Notification Key
- **Format:** `nk_` prefix + 32 alphanumeric characters  
- **Example:** `nk_live_q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2`
- **Security:** Store only in Convex environment variables
- **Usage:** HMAC-SHA256 key for webhook signature verification

### `PAYZONE_URL`

```bash
# Sandbox (Development)
PAYZONE_URL="https://sandbox.payzone.ma/api/payment"

# Production (Live)
PAYZONE_URL="https://payzone.ma/api/payment"
```

### `NEXT_PUBLIC_APP_URL`
- **Purpose:** User-facing redirect URLs (success/failure/cancel pages)
- **Examples:**
  - Development: `http://localhost:3000`
  - Staging: `https://staging.yourapp.com`
  - Production: `https://yourapp.com`

### `CONVEX_HTTP_URL`
- **Purpose:** Webhook endpoint URL (server-to-server)
- **Format:** Must end with `.convex.site`
- **Examples:**
  - Development: `https://keen-fox-123.convex.site`
  - Production: `https://your-project.convex.site`
- **Note:** This URL must be publicly accessible from the internet

## Environment-Specific Configuration

### Development (.env.local)

```bash
# Use sandbox URLs
PAYZONE_URL="https://sandbox.payzone.ma/api/payment"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
CONVEX_HTTP_URL="https://keen-fox-123.convex.site"

# Sandbox keys (different from production!)
PAYZONE_MERCHANT_ACCOUNT="test_merchant_123"
PAYZONE_SECRET_KEY="sk_test_xxxxxxxxxxxxxxxxxxxxxxxx"
```

### Production

```bash
# Use production URLs
PAYZONE_URL="https://payzone.ma/api/payment"
NEXT_PUBLIC_APP_URL="https://yourapp.com"
CONVEX_HTTP_URL="https://your-project.convex.site"

# Production keys
PAYZONE_MERCHANT_ACCOUNT="your_live_merchant_id"
PAYZONE_SECRET_KEY="sk_live_xxxxxxxxxxxxxxxxxxxxxxxx"
PAYZONE_NOTIFICATION_KEY="nk_live_xxxxxxxxxxxxxxxxxxxxxxxx"
```

## Validation Checklist

Before running the application, verify:

- [ ] `PAYZONE_SECRET_KEY` starts with `sk_` (or `sk_test_`)
- [ ] `PAYZONE_NOTIFICATION_KEY` starts with `nk_` (or `nk_test_`)
- [ ] `CONVEX_HTTP_URL` ends with `.convex.site`
- [ ] `NEXT_PUBLIC_APP_URL` does NOT include trailing slash
- [ ] `PAYZONE_URL` matches your environment (sandbox vs production)
- [ ] All keys are copied correctly (no extra spaces or characters)

## Security Best Practices

1. **Never commit `.env.local`** - Add to `.gitignore`
2. **Use different keys per environment** - Sandbox and production keys are separate
3. **Rotate keys regularly** - PayZone allows key regeneration
4. **Monitor webhook logs** - Check Convex logs for failed signature verifications
5. **Restrict CORS** - webhook endpoint doesn't need CORS (server-to-server)

## Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid signature" | Wrong key used | Verify `SECRET_KEY` for payload, `NOTIFICATION_KEY` for webhooks |
| "Missing environment variables" | Variable not set | Check `.env.local` and Convex dashboard |
| "URL not accessible" | `CONVEX_HTTP_URL` wrong | Verify Convex deployment URL ends with `.convex.site` |
| "Merchant not found" | Wrong merchant ID | Copy exact value from PayZone dashboard |

## Getting Keys from PayZone Dashboard

1. **Log in** to PayZone Merchant Dashboard
2. **API Keys:**
   - Navigate to Settings → API Keys
   - Copy `Merchant Account ID`
   - Generate/Copy `Secret Key`
3. **Webhook Keys:**
   - Navigate to Settings → Webhooks
   - Copy `Notification Key`
4. **Sandbox Access:**
   - Request sandbox credentials from PayZone support
   - Or use test mode toggle (if available)

# PayZone Production Deployment Checklist

## Pre-Deployment Verification

### 1. Environment Variables ✅

- [ ] `PAYZONE_URL` points to production (not sandbox)
- [ ] `PAYZONE_MERCHANT_ACCOUNT` is live merchant ID
- [ ] `PAYZONE_SECRET_KEY` is production key (starts with `sk_live_`)
- [ ] `PAYZONE_NOTIFICATION_KEY` is production key (starts with `nk_live_`)
- [ ] `NEXT_PUBLIC_APP_URL` uses HTTPS (not HTTP)
- [ ] `CONVEX_HTTP_URL` points to production deployment
- [ ] All keys have been regenerated for production (not reused from sandbox)

### 2. Code Verification ✅

- [ ] No `console.log` statements exposing sensitive data
- [ ] Error handling implemented for all async operations
- [ ] Loading states prevent double-submission
- [ ] Webhook signature verification uses `PAYZONE_NOTIFICATION_KEY` (not `SECRET_KEY`)
- [ ] Payload signature uses `PAYZONE_SECRET_KEY` (not `NOTIFICATION_KEY`)
- [ ] All hardcoded test values removed

### 3. Security Hardening ✅

- [ ] Webhook endpoint rate limited (if applicable)
- [ ] Convex mutations are idempotent (safe to retry)
- [ ] Database transactions prevent race conditions
- [ ] Booking reference IDs are unique and unguessable
- [ ] No sensitive data logged to console or error tracking

## Deployment Steps

### Step 1: Deploy Convex Backend

```bash
# Deploy Convex functions
npx convex deploy

# Verify deployment
npx convex status
```

**Verification:**
- [ ] HTTP router accessible at `CONVEX_HTTP_URL`
- [ ] Webhook endpoint responds to OPTIONS request
- [ ] Environment variables set in Convex dashboard

### Step 2: Configure PayZone Webhook

1. Log in to PayZone Merchant Dashboard
2. Navigate to **Settings → Webhooks**
3. Add webhook URL: `https://your-project.convex.site/payzone/webhook`
4. Select events: `payment.success`, `payment.failure`
5. Save and verify endpoint responds with 200 OK

**Verification:**
- [ ] Webhook URL is publicly accessible
- [ ] Test webhook delivery from PayZone dashboard
- [ ] Check Convex logs for incoming webhooks

### Step 3: Deploy Next.js Frontend

```bash
# Build production
npm run build

# Deploy to Vercel/Railway/etc
vercel --prod
```

**Verification:**
- [ ] Build completes without errors
- [ ] Environment variables injected correctly
- [ ] Success/failure pages accessible

### Step 4: End-to-End Testing

#### Test 1: Happy Path
1. Create a test booking
2. Select "Carte bancaire" payment
3. Use sandbox credentials (even in production, PayZone provides test mode)
4. Complete payment
5. **Verify:**
   - [ ] Redirected to success page
   - [ ] Webhook received in Convex logs
   - [ ] Database updated with `isPaid: true`
   - [ ] Email confirmation sent (if applicable)

#### Test 2: Failure Path
1. Create a test booking
2. Select "Carte bancaire" payment
3. Cancel payment on PayZone page
4. **Verify:**
   - [ ] Redirected to failure page
   - [ ] Booking status remains "pending"
   - [ ] User can retry payment

#### Test 3: Webhook Reliability
1. Create a test booking
2. Complete payment
3. Check database update happened within 5 seconds
4. **Verify:**
   - [ ] No duplicate database mutations
   - [ ] Idempotency works (replay webhook, only one update)

## Post-Deployment Monitoring

### Critical Metrics to Watch

| Metric | Alert Threshold | Where to Check |
|--------|----------------|----------------|
| Webhook failures | > 1% error rate | Convex logs |
| Signature mismatches | Any occurrence | Error tracking (Sentry/etc) |
| Payment timeouts | > 30 seconds | PayZone dashboard |
| Database mutations | Duplicates | Convex data dashboard |

### Daily Checks (First Week)

- [ ] Review webhook logs for errors
- [ ] Check failed payments in PayZone dashboard
- [ ] Verify all paid bookings have `payzoneTransactionId`
- [ ] Monitor for duplicate transactions

### Weekly Checks (Ongoing)

- [ ] Review payment success rate (should be >95%)
- [ ] Check webhook latency (should be 㰞5 seconds)
- [ ] Verify no signature validation failures
- [ ] Review refund/chargeback rates

## Rollback Plan

If critical issues detected:

1. **Immediately:** Disable PayZone payment method in UI (feature flag)
2. **Within 1 hour:** Investigate logs, identify root cause
3. **If unresolvable:** Switch to sandbox keys temporarily
4. **Communication:** Notify users of payment disruption
5. **Fix & Redeploy:** After issue resolved

## Common Post-Deployment Issues

### Issue: Webhooks Not Received

**Diagnosis:**
```bash
# Check Convex logs
npx convex logs

# Verify webhook URL
curl -X POST https://your-project.convex.site/payzone/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Solutions:**
- Verify `CONVEX_HTTP_URL` is correct
- Check PayZone dashboard webhook status
- Ensure Convex deployment is not paused

### Issue: Signature Verification Fails

**Diagnosis:**
- Check which key is being used (should be `PAYZONE_NOTIFICATION_KEY`)
- Verify key hasn't been regenerated recently

**Solutions:**
- Update environment variable in Convex dashboard
- Verify no extra whitespace in key value

### Issue: Payments Not Updating Database

**Diagnosis:**
- Check webhook response codes (should be 200)
- Review Convex mutation logs
- Verify booking reference exists

**Solutions:**
- Check database query in webhook handler
- Ensure mutation is not throwing errors
- Verify idempotency logic

## Production Test Card

For final verification, process a small real payment:

- Amount: 10 MAD (minimum)
- Use real credit card
- Verify end-to-end flow
- **Immediately refund** via PayZone dashboard

## Sign-Off Checklist

- [ ] All pre-deployment checks passed
- [ ] End-to-end testing completed
- [ ] Monitoring dashboards configured
- [ ] Rollback plan documented
- [ ] Team notified of deployment
- [ ] Customer support briefed on new payment flow

**Deployment Approved By:** _______________  Date: _______________

**Notes:**
_________________________________________________________________
_________________________________________________________________

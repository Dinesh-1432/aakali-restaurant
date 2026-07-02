# Razorpay Payment Integration

Production-ready Razorpay Checkout SDK integration. UPI, Cards, Netbanking,
Wallets, and EMI. HMAC-verified signatures on the browser callback plus a
server-to-server webhook as fallback.

## Flow

```
Customer clicks Pay Now
      │
      ▼
POST /api/orders  ─────────────►  Razorpay Orders API (creates order_id)
      │                                     │
      │            gatewayOrderId ◄─────────┘
      ▼
Razorpay Checkout modal opens (in-browser SDK)
      │
      ▼
Customer completes payment on Razorpay
      │
      ├─► BROWSER: handler(response) → POST /api/orders/verify
      │              │
      │              ▼
      │        HMAC verify + amount/order_id check → finalizePaidOrder()
      │
      └─► WEBHOOK: Razorpay → POST /api/webhooks/razorpay (payment.captured)
                     │
                     ▼
              HMAC verify (raw body) → finalizePaidOrder()
                     │
              (idempotent — safe even if both fire)
```

The webhook is what makes this reliable — even if the customer's browser
crashes right after paying, the order still gets finalized.

## Required environment variables

Put these in `.env`:

```
# Razorpay merchant credentials
# Get from https://dashboard.razorpay.com → Settings → API Keys
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# Webhook secret — you set this yourself, must match Dashboard → Webhooks
RAZORPAY_WEBHOOK_SECRET=<pick any long random string>
```

**Do not commit real keys.** The `.env` file is already in `.gitignore`.

## Fixing "Authentication failed" from Razorpay

If `POST /api/orders` returns
`Failed to create payment gateway order: Authentication failed`,
your keys aren't valid. Fresh checklist:

1. Log into <https://dashboard.razorpay.com>.
2. Confirm the **Test / Live** toggle in the top-right is on **Test**.
3. Go to **Account & Settings → Website & App Settings → API Keys**.
4. Click **Regenerate Test Key** (or **Generate Test Key** if none exists).
5. Razorpay shows the **Key Secret only once** — copy both `Key ID` and
   `Key Secret` immediately, before closing the dialog.
6. Paste both into `.env`. No quotes, no spaces, no trailing newline.
7. Restart the server (`npm start`).

Sanity-check with:

```powershell
# From the project root; replace <ID> and <SECRET>
$b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("<ID>:<SECRET>"))
Invoke-WebRequest -Uri https://api.razorpay.com/v1/orders `
  -Method POST -Body '{"amount":100,"currency":"INR"}' `
  -Headers @{Authorization="Basic $b64";"Content-Type"="application/json"}
```

You should get HTTP 200 and a JSON order back.

## Webhook setup (do this once)

1. Expose your server publicly so Razorpay can reach it.
   For local dev, keep the Cloudflare tunnel running; for production, use
   your real domain.
2. On the Razorpay Dashboard, go to **Account & Settings → Webhooks → Add
   New Webhook**.
3. Fill in:
   - **URL**: `https://<your-domain>/api/webhooks/razorpay`
   - **Secret**: any long random string — copy it, put the same value in
     `.env` as `RAZORPAY_WEBHOOK_SECRET`
   - **Active Events**: check these five
     - `payment.captured`
     - `payment.failed`
     - `order.paid`
     - `refund.processed`
     - `refund.failed`
4. Save.
5. Click **Test webhook** on the dashboard — a green tick confirms the whole
   loop works.

## Test data (Razorpay Test Mode)

| Method | Value |
|---|---|
| UPI (succeeds) | `success@razorpay` |
| UPI (fails) | `failure@razorpay` |
| Card | `4111 1111 1111 1111` — any future expiry, any CVV, any name |
| OTP prompt | `1234` |
| Netbanking | Pick any bank; the sandbox lets you pass/fail on the next screen |

Nothing is charged in Test Mode.

## Endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/orders/razorpay-key` | user | Returns the public Key ID for the browser SDK |
| POST | `/api/orders` | user | Creates the internal order + Razorpay order |
| POST | `/api/orders/verify` | user | Verifies signature after browser callback |
| POST | `/api/orders/:id/refund` | admin | Issues a Razorpay refund |
| POST | `/api/webhooks/razorpay` | Razorpay | Server-to-server payment events |

## Security notes

The verify endpoint enforces:

1. Order ownership (authenticated user must own the order).
2. `razorpay_order_id` in the request must equal `order.gatewayOrderId`
   stored at creation time.
3. HMAC-SHA256 signature check with `crypto.timingSafeEqual`.
4. Independent fetch of the payment from Razorpay's API to confirm
   amount, order_id, and status — closes any client-side tampering.

The webhook endpoint uses raw-body signature verification (Express's
default JSON parser is bypassed for this route).

`finalizePaidOrder()` is idempotent — safe even if both the browser
callback and the webhook fire for the same payment.

## Going to production

- [ ] Regenerate keys in **Live Mode** on the dashboard and put them in
      `.env` (`rzp_live_...` prefix).
- [ ] Update `RAZORPAY_WEBHOOK_SECRET` to a fresh random string, mirror
      it in the Live Mode webhook config on the dashboard.
- [ ] Set `NODE_ENV=production` (turns on the API rate limiter).
- [ ] Point the webhook URL at your production domain over HTTPS.
- [ ] Configure Razorpay's **Payment methods** in the dashboard to only
      enable the ones you want to accept.
- [ ] Enable Razorpay's **KYC / activation** so live payments settle to
      your bank account.
- [ ] Confirm refund flow — `POST /api/orders/:id/refund` as an admin
      against a real captured payment.

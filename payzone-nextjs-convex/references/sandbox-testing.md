# PayZone Sandbox Testing Protocol

## The Golden Rule of Payment Testing
Client-side success screens are for users. Database records are for developers. 
Never trust a frontend redirect to `successUrl`. A transaction is only successful if the webhook fires and mutates the database.

## Official Test Credentials
Standard test cards (like Stripe's `4242`) will be rejected by the PayZone Sandbox. You must use these specific credentials:

* **Numéro de carte (Card Number):** `4111 1111 1111 1111`
* **Date d'expiration (Expiry):** Any future date (e.g., `12/26` or `07/27`)
* **CVV:** `000`
* **Nom et prénom (Name):** Any text (e.g., "Test User")

## Verification Workflow
1. Initiate a booking with the `carte_bancaire` method.
2. Complete the 3D Secure simulation on the PayZone hosted checkout using the credentials above.
3. Upon redirection back to your application's success page, immediately open the Convex Dashboard.
4. **Logs Tab:** Verify that a `POST /payzone/webhook` request was received and returned a `200 OK`.
5. **Data Tab:** Open the corresponding table (e.g., `bookings`). Verify that:
   - `status` is set to `"confirmed"`
   - `payment.isPaid` is `true`
   - `payment.payzoneTransactionId` is populated with the gateway ID
   - `payment.depositAmount` equals `payment.totalPrice`
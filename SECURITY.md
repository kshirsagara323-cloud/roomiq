# ROOMIQ – security review

## What is built in
| Area | Protection |
|---|---|
| Accounts | Firebase Auth (hashed passwords, rate limiting, reset by email). Password rule: 8+ chars with letters and numbers. Extra client-side lock after 5 wrong logins (30 s). Reset flow gives the same message whether or not the email exists. |
| Roles | `tenant` / `owner` stored in `users/{uid}`. Rules let a user choose the role **once at signup** and never change it. Each login page rejects the other role and signs the user out. Owner pages are also guarded in the router. |
| Database rules | Default deny. Every collection validates field names, types, lengths and ranges. Users only read their own profile, saved list, chats and bookings. |
| Listings | Only the owner can edit/delete their listing. Owners **cannot** set `verified` or rating totals. Public visitors only see `status == 'active'` listings. |
| Reviews | Tenants only, one per listing (doc id = uid), cannot be edited. Rating totals can only change by exactly that review (checked with `getAfter`), so ratings cannot be faked. |
| Bookings | Tenants create `pending` requests for real listings only; only the listing's owner can confirm/decline; tenants can only cancel their own. |
| Chat | Only the two participants can read or write; sender must be the signed-in user; message length capped. |
| Roommates | Opt-in, visible only to tenants, contains no email or phone unless the user types a contact line. |
| Storage (optional mode) | Images only (JPG/PNG/WebP), < 2 MB, written only by the owner inside their own folder. Everything else is closed. |
| Web | No `dangerouslySetInnerHTML`; all user text is rendered escaped. Inputs are trimmed, stripped of control characters and length-capped. Hosting sends CSP, X-Frame-Options, nosniff, HSTS, Referrer-Policy and Permissions-Policy headers (`firebase.json`). External links use `rel="noopener noreferrer"`. |
| Secrets | Firebase web config is public by design; real protection is the rules. `.env` and the service-account key are git-ignored. |

## Do before going public
1. **Deploy the rules** (`npm run deploy:rules`) and test them in Console → Firestore → Rules → *Rules Playground*.
2. Google Cloud Console → APIs & Services → Credentials → restrict the **Browser API key** to your website domain(s) (HTTP referrers).
3. Firebase **App Check** with reCAPTCHA v3 (free): create a key, put it in `VITE_RECAPTCHA_SITE_KEY`, then enforce it for Firestore and Auth.
4. Authentication → Settings: turn on **email enumeration protection** and the password policy.
5. Billing → set a **budget alert** so an unexpected traffic spike never surprises you.
6. Keep `scripts/serviceAccountKey.json` off shared drives; delete it after seeding.

## Honest limits
- I could not run `npm install`, a build or the Firebase emulator in my environment (no network), so this code has **not been executed end-to-end** and the rules have not been run against the emulator. Follow the test checklist in the README once and use the Rules Playground.
- The "verified" badge is set manually (Firestore console or Admin SDK). There is no automatic identity check; real Aadhaar/KYC verification is a paid, regulated service and storing Aadhaar numbers has legal limits, so it is intentionally not included.
- The 5-attempt login lock is client-side only (Firebase enforces its own server-side limits too).
- In the free image mode, photos live inside listing documents. This is fine for a small site; for many listings switch to Storage mode.
- Video calls open a Jitsi Meet room (free, no account). Room names are derived from the chat id, so treat them as private-link, not password-protected.
- No admin moderation panel or automatic spam detection yet.
- Deleting a listing does not delete its old reviews sub-collection (they become unreachable).

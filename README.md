# ROOMIQ – smart accommodation platform

React + Vite website with Firebase (Authentication, Firestore, optional Storage).
Two separate logins (tenant and house owner), live data everywhere, real maps (OpenStreetMap), real-time chat,
tour bookings, reviews and roommate matching. Everything runs on Firebase's free Spark plan by default.

## What is inside

| Area | Pages |
|---|---|
| Public | Home, Explore (filters + list/map), Property details |
| Tenant | `/login`, `/register`, Dashboard (saved stays, tour requests, profile), Roommates, Messages |
| House owner | `/owner/login`, `/owner/register`, Dashboard (stats, tour requests), Add / Edit property, Messages |

Changes sync live: an owner edits, pauses or deletes a listing → Home, Explore, Saved stays and the detail page update
instantly, with no refresh. Tour requests, chat messages and reviews work the same way.

## Setup – step by step

### 1. Install Node.js
Install Node 18 or newer (20 LTS recommended) from https://nodejs.org, then check: `node -v`

### 2. Install the project
```bash
cd roomiq
npm install
```

### 3. Create a free Firebase project
1. Go to https://console.firebase.google.com → **Add project** (Google Analytics can be off).
2. **Project settings (gear) → General → Your apps → Web (`</>`)** → register an app named `roomiq`.
3. Copy the config values into a new `.env` file:
   ```bash
   cp .env.example .env      # Windows: copy .env.example .env
   ```
   Fill in `VITE_FIREBASE_API_KEY`, `..._AUTH_DOMAIN`, `..._PROJECT_ID`, `..._STORAGE_BUCKET`, `..._MESSAGING_SENDER_ID`, `..._APP_ID`.

### 4. Turn on sign-in
Console → **Build → Authentication → Get started → Sign-in method**
- Enable **Email/Password**.
- Enable **Google** (optional – gives the "Continue with Google" button).
- Authentication → Settings → **Password policy**: require at least 8 characters (recommended).

### 5. Create the database
Console → **Build → Firestore Database → Create database** → start in **production mode** → pick a region near your users
(for India: `asia-south1`, Mumbai).

### 6. Publish the security rules (important – the site is not safe without this)
```bash
# edit .firebaserc and put your real project id in place of YOUR_FIREBASE_PROJECT_ID
npx firebase-tools login
npm run deploy:rules
```
No CLI? Open Firestore → **Rules** tab, paste the content of `firestore.rules`, press **Publish**.

### 7. Photos (images)
- **Default (free): `VITE_IMAGE_STORAGE=firestore`** – photos are resized in the browser and stored in Firestore (max 4 per listing).
- **Firebase Storage: `VITE_IMAGE_STORAGE=storage`** – full-quality photos (max 6). Since Feb 2026 Cloud Storage for
  Firebase needs the pay-as-you-go **Blaze** plan (card on file; the free allowance still applies). If you choose this:
  Console → Build → Storage → Get started, then `npm run deploy:storage-rules`.

### 8. (Optional) Add demo listings
1. Console → Project settings → **Service accounts → Generate new private key**.
2. Save the file as `scripts/serviceAccountKey.json` (it is git-ignored – never share it).
3. Run `npm run seed`. It prints a demo owner email + password once. Remove the demo data any time with `npm run seed -- --clear`.

### 9. Run it
```bash
npm run dev
```
Open http://localhost:5173

### 10. Deploy to the web (free Firebase Hosting)
```bash
npm run build
npx firebase-tools deploy --only hosting      # or: npm run deploy
```
Then add your live domain in Authentication → Settings → **Authorized domains** (the `*.web.app` domain is added automatically).

## Quick test checklist
1. Register a **house owner** at `/owner/register` → add a property with photos and a map pin.
2. In a private window register a **tenant** at `/register` → the listing is on Home and Explore instantly.
3. Save it, request a tour, chat with the owner – watch the owner dashboard update live.
4. Try logging in as the tenant on `/owner/login` → it must be refused (roles are separate).
5. Edit the price as owner → tenant's open page updates without reload.

## Useful commands
| Command | What it does |
|---|---|
| `npm install` | install dependencies |
| `npm run dev` | local dev server |
| `npm run build` / `npm run preview` | production build / test it locally |
| `npm run seed` | add demo data (needs service account key) |
| `npm run deploy:rules` | publish Firestore rules |
| `npm run deploy` | build + deploy hosting |

## Troubleshooting
- **"Almost there — connect Firebase" screen** → `.env` missing or empty; restart `npm run dev` after editing it.
- **"Missing or insufficient permissions"** → rules are not published yet (step 6), or you used the wrong login page for that account.
- **Google sign-in popup blocked** → allow pop-ups, and make sure Google is enabled (step 4) and the domain is authorized.
- **Map is grey** → check your internet connection; tiles load from OpenStreetMap.

See `SECURITY.md` for the security review and the pre-launch checklist.

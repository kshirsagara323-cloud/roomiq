// Adds a demo house-owner account and 12 demo listings so the site is not empty on day one.
// Usage:  npm run seed            (add / refresh demo data)
//         npm run seed -- --clear (remove demo data again)
// Needs scripts/serviceAccountKey.json  (Firebase Console → Project settings → Service accounts → Generate new private key)
import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const keyPath = new URL('./serviceAccountKey.json', import.meta.url);
if (!existsSync(keyPath)) {
  console.error('Missing scripts/serviceAccountKey.json – see README step 8.');
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });
const auth = admin.auth();
const db = admin.firestore();
const EMAIL = process.env.DEMO_OWNER_EMAIL || 'demo.owner@roomiq.example';
const clear = process.argv.includes('--clear');

const IMG = [
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
];
const pics = (n) => [IMG[n % 4], IMG[(n + 1) % 4], IMG[(n + 2) % 4]];

// [name, type, gender, city, area, price, deposit, beds, lat, lng, amenities]
const DATA = [
  ['Koregaon Park Co-living', 'PG', 'Any', 'Pune', 'Koregaon Park', 12500, 25000, 6, 18.5362, 73.894, ['WiFi', 'AC', 'Meals', 'Laundry', 'CCTV']],
  ['Kothrud Student Nest', 'PG', 'Boys', 'Pune', 'Kothrud', 7500, 15000, 10, 18.5074, 73.8077, ['WiFi', 'Meals', 'Geyser', 'Study Table']],
  ['Viman Nagar Ladies Hostel', 'Hostel', 'Girls', 'Pune', 'Viman Nagar', 8500, 10000, 14, 18.5679, 73.9143, ['WiFi', 'CCTV', 'Housekeeping', 'Power Backup']],
  ['Andheri West 1BHK Share', 'Flat', 'Any', 'Mumbai', 'Andheri West', 22000, 60000, 2, 19.1136, 72.8697, ['WiFi', 'AC', 'Washing Machine', 'Refrigerator']],
  ['Powai Lakeside PG', 'PG', 'Boys', 'Mumbai', 'Powai', 14000, 28000, 5, 19.1176, 72.906, ['WiFi', 'Meals', 'Gym', 'Laundry']],
  ['Koramangala Tech PG', 'PG', 'Any', 'Bengaluru', 'Koramangala', 13500, 27000, 8, 12.9352, 77.6245, ['WiFi', 'AC', 'Meals', 'Power Backup', 'Housekeeping']],
  ['HSR Layout Studio Flat', 'Flat', 'Any', 'Bengaluru', 'HSR Layout', 19000, 50000, 1, 12.9116, 77.6389, ['WiFi', 'AC', 'Parking', 'Refrigerator']],
  ['Gachibowli Girls PG', 'PG', 'Girls', 'Hyderabad', 'Gachibowli', 9500, 15000, 9, 17.4401, 78.3489, ['WiFi', 'Meals', 'CCTV', 'Geyser']],
  ['Madhapur Boys Hostel', 'Hostel', 'Boys', 'Hyderabad', 'Madhapur', 6500, 8000, 20, 17.4483, 78.3915, ['WiFi', 'Meals', 'Laundry', 'Power Backup']],
  ['Laxmi Nagar Budget Rooms', 'PG', 'Boys', 'Delhi', 'Laxmi Nagar', 6000, 8000, 12, 28.6304, 77.2777, ['WiFi', 'Geyser', 'Study Table']],
  ['Velachery Shared Flat', 'Flat', 'Any', 'Chennai', 'Velachery', 11000, 30000, 3, 12.9815, 80.218, ['WiFi', 'AC', 'Washing Machine', 'Parking']],
  ['Salt Lake Co-living', 'PG', 'Any', 'Kolkata', 'Salt Lake', 8000, 16000, 7, 22.5867, 88.4174, ['WiFi', 'Meals', 'CCTV', 'Housekeeping']],
];

if (clear) {
  const snap = await db.collection('properties').where('ownerName', '==', 'RoomIQ Demo Owner').get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
  console.log(`Removed ${snap.size} demo listings.`);
  process.exit(0);
}

let user;
let password = null;
try {
  user = await auth.getUserByEmail(EMAIL);
} catch {
  password = process.env.DEMO_OWNER_PASSWORD || `${randomBytes(9).toString('base64url')}a1`;
  user = await auth.createUser({ email: EMAIL, password, displayName: 'RoomIQ Demo Owner', emailVerified: true });
}
await db.doc(`users/${user.uid}`).set(
  { uid: user.uid, name: 'RoomIQ Demo Owner', email: EMAIL, role: 'owner', createdAt: admin.firestore.FieldValue.serverTimestamp() },
  { merge: true },
);

const batch = db.batch();
DATA.forEach(([name, type, gender, city, area, price, deposit, beds, lat, lng, amenities], i) => {
  batch.set(db.doc(`properties/demo-${i + 1}`), {
    ownerId: user.uid,
    ownerName: 'RoomIQ Demo Owner',
    name,
    description: `${type} in ${area}, ${city}. Demo listing added by the seed script – owners can replace it with their own photos and details.`,
    city,
    area,
    type,
    gender,
    price,
    deposit,
    beds,
    amenities,
    images: pics(i),
    lat,
    lng,
    status: 'active',
    verified: false,
    ratingSum: 0,
    ratingCount: 0,
    available: 'Available now',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
});
await batch.commit();

console.log(`\nSeeded ${DATA.length} demo listings for ${EMAIL}`);
if (password) console.log(`Demo owner password (shown once): ${password}`);
else console.log('Demo owner already existed – password unchanged.');
process.exit(0);

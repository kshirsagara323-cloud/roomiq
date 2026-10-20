// Imports real listings from data/IT_Cities_Property_Data.csv into Firestore.
// Needs scripts/serviceAccountKey.json (README step 8).
//
//   npm run import-data -- --per-city=30     import 30 listings per city (recommended)
//   npm run import-data -- --clear           delete everything this script imported earlier
import admin from 'firebase-admin';
import { parse } from 'csv-parse/sync';
import { existsSync, readFileSync } from 'node:fs';

const keyPath = new URL('./serviceAccountKey.json', import.meta.url);
const csvPath = new URL('../data/IT_Cities_Property_Data.csv', import.meta.url);
if (!existsSync(keyPath)) { console.error('Missing scripts/serviceAccountKey.json'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });
const db = admin.firestore();
const auth = admin.auth();
const OWNER_NAME = 'RoomIQ Verified Listings';

if (process.argv.includes('--clear')) {
  const snap = await db.collection('properties').where('ownerName', '==', OWNER_NAME).get();
  for (let i = 0; i < snap.docs.length; i += 450) {
    const b = db.batch();
    snap.docs.slice(i, i + 450).forEach((d) => b.delete(d.ref));
    await b.commit();
  }
  console.log(`Removed ${snap.size} imported listings.`);
  process.exit(0);
}
if (!existsSync(csvPath)) { console.error('Missing data/IT_Cities_Property_Data.csv'); process.exit(1); }

const arg = process.argv.find((a) => a.startsWith('--per-city='));
const PER_CITY = arg ? Number(arg.split('=')[1]) : 30;

// every city label that appears in the CSV -> the name shown in the app
const CITY_MAP = { bengaluru: 'Bengaluru', bangalore: 'Bengaluru', pune: 'Pune', mumbai: 'Mumbai', hyderabad: 'Hyderabad', newdelhi: 'New Delhi', delhi: 'New Delhi', indore: 'Indore', chennai: 'Chennai', gurugram: 'Gurugram', noida: 'Noida' };

const FLAT = ['photo-1600585154340-be6161a56a0c', 'photo-1560448204-e02f11c3d0e2', 'photo-1560185127-6ed189bf02f4', 'photo-1522708323590-d24dbb6b0267'];
const HOUSE = ['photo-1600607687939-ce8a6c25118c', 'photo-1600607687920-4e2a09cf159d', 'photo-1502672260266-1c1ef2d93688', 'photo-1600566753086-00f18fb6b3ea'];
const PG = ['photo-1616486338812-3dadae4b4ace', 'photo-1512917774080-9991f1c4c750', 'photo-1522771739844-6a9f6d5f14af', 'photo-1493809842364-78817add7ffb'];
const url = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;
const photos = (bookingType, i) => {
  const pool = bookingType === 'house' ? (i % 3 === 0 ? FLAT : HOUSE) : PG;
  return [0, 1, 2].map((k) => url(pool[(i + k) % pool.length]));
};

const genderFrom = (s = '') => { s = s.toLowerCase(); const b = s.includes('boys'), g = s.includes('girls'); return b && !g ? 'Boys' : g && !b ? 'Girls' : 'Any'; };
const facilities = (raw) => (String(raw || '').match(/'([^']*)'|"([^"]*)"/g) || []).map((x) => x.replace(/['"]/g, ''));
const AMEN = { ac: 'AC', wifi: 'WiFi', security: 'CCTV', 'power backup': 'Power Backup', parking: 'Parking', gym: 'Gym', 'washing machine': 'Washing Machine', fridge: 'Refrigerator', refrigerator: 'Refrigerator', geyser: 'Geyser', housekeeping: 'Housekeeping', laundry: 'Laundry' };
const amenities = (f) => [...new Set(f.map((x) => AMEN[x.toLowerCase()]).filter(Boolean))];

async function owner() {
  const email = 'dataset-import@roomiq.example';
  let u;
  try { u = await auth.getUserByEmail(email); }
  catch { u = await auth.createUser({ email, password: `x${Date.now()}Aa1!`, displayName: OWNER_NAME, emailVerified: true }); }
  await db.doc(`users/${u.uid}`).set({ uid: u.uid, name: OWNER_NAME, email, role: 'owner', createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return u.uid;
}

const rows = parse(readFileSync(csvPath, 'utf8'), {
  bom: true,
  delimiter: '\t',
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
});
const good = [];
rows.forEach((r, i) => {
  const city = CITY_MAP[String(r.city || '').trim().toLowerCase()];
  const lat = Number(r.lat), lng = Number(r.long);
  const price = [r['minRoomRent(Rs)'], r['minRent(Rs)']].map(Number).find((n) => n > 0);
  if (city && Number.isFinite(lat) && Number.isFinite(lng) && lat && lng && price) good.push({ r, i, city, lat, lng, price });
});
console.log(`${rows.length} rows read, ${good.length} usable.`);

// take the best-described listings of each city so every city has data
const byCity = {};
good.forEach((g) => (byCity[g.city] ||= []).push(g));
const picked = Object.values(byCity).flatMap((list) => list.sort((a, b) => String(b.r.description).length - String(a.r.description).length).slice(0, PER_CITY));

const ownerId = await owner();
let batch = db.batch(), n = 0, total = 0;
for (const { r, i, city, lat, lng, price } of picked) {
  const f = facilities(r.facilities);
  const type = r.bookingType === 'house' ? 'Flat' : 'PG';
  batch.set(db.doc(`properties/csv-${r.id || i}`), {
    ownerId, ownerName: OWNER_NAME,
    name: String(r.title || `${type} in ${city}`).slice(0, 100),
    description: String(r.description || '').slice(0, 2000),
    city, area: String(r.address || city).slice(0, 120), type,
    gender: genderFrom(r.availableFor),
    price: Math.round(price),
    deposit: Math.round(Number(r['minRoomAdvance(Rs)']) || 0),
    beds: Number(r.bedAvailable) || Number(r.roomAvailable) || 1, // '0' is a non-empty string, so the old `||` kept 0 for ~75% of rows
    amenities: amenities(f), images: photos(r.bookingType, i), lat, lng,
    status: 'active', verified: false, ratingSum: 0, ratingCount: 0, available: 'Available now',
    createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  total++;
  if (++n === 450) { await batch.commit(); batch = db.batch(); n = 0; }
}
if (n) await batch.commit();
console.log(`Imported ${total} listings across ${Object.keys(byCity).length} cities (${PER_CITY} max per city).`);
process.exit(0);

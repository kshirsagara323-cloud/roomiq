// Imports your real IT_Cities_Property_Data.csv into Firestore.
// Needs scripts/serviceAccountKey.json (see README step 8).
// Usage:  npm run import-data              (import everything)
//         npm run import-data -- --limit=300   (import only the first 300 – good for a quick test)
import admin from 'firebase-admin';
import { parse } from 'csv-parse/sync';
import { existsSync, readFileSync } from 'node:fs';

const keyPath = new URL('./serviceAccountKey.json', import.meta.url);
const csvPath = new URL('../data/IT_Cities_Property_Data.csv', import.meta.url);
if (!existsSync(keyPath)) { console.error('Missing scripts/serviceAccountKey.json – see README step 8.'); process.exit(1); }
if (!existsSync(csvPath)) { console.error('Missing data/IT_Cities_Property_Data.csv – copy it in first.'); process.exit(1); }

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });
const db = admin.firestore();
const auth = admin.auth();

const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

// CSV cities aren't consistently capitalised – map them onto the app's city list.
const CITY_MAP = { pune: 'Pune', mumbai: 'Mumbai', bengaluru: 'Bengaluru', bangalore: 'Bengaluru', hyderabad: 'Hyderabad', delhi: 'Delhi', chennai: 'Chennai', kolkata: 'Kolkata', ahmedabad: 'Ahmedabad' };

// Real, free-to-use stock photos, grouped by the kind of place so each listing gets a fitting one.
const FLAT_PHOTOS = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
];
const HOUSE_PHOTOS = [
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=80',
];
const PG_PHOTOS = [
  'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80',
];

const pickPhotos = (bookingType, i) => {
  const pool = bookingType === 'house' ? (i % 3 === 0 ? FLAT_PHOTOS : HOUSE_PHOTOS) : PG_PHOTOS;
  return [pool[i % pool.length], pool[(i + 1) % pool.length], pool[(i + 2) % pool.length]];
};

const genderFrom = (availableFor = '') => {
  const s = availableFor.toLowerCase();
  const boys = s.includes('boys'), girls = s.includes('girls');
  if (boys && !girls) return 'Boys';
  if (girls && !boys) return 'Girls';
  return 'Any';
};

const parseFacilities = (raw) => {
  try {
    return String(raw || '[]').replace(/'/g, '"').match(/"([^"]*)"/g)?.map((s) => s.replace(/"/g, '')).slice(0, 12) || [];
  } catch { return []; }
};

// this app's amenity chips are a fixed set – map whatever the CSV says onto the closest ones
const AMENITY_MAP = { ac: 'AC', wifi: 'WiFi', security: 'CCTV', 'power backup': 'Power Backup', parking: 'Parking', gym: 'Gym', 'washing machine': 'Washing Machine', fridge: 'Refrigerator', tv: 'Study Table', geyser: 'Geyser', housekeeping: 'Housekeeping' };
const mapAmenities = (facilities) => [...new Set(facilities.map((f) => AMENITY_MAP[f.toLowerCase()]).filter(Boolean))];

async function ensureImportOwner() {
  const email = 'dataset-import@roomiq.example';
  let user;
  try { user = await auth.getUserByEmail(email); }
  catch { user = await auth.createUser({ email, password: 'not-used-' + Date.now(), displayName: 'RoomIQ Verified Listings', emailVerified: true }); }
  await db.doc(`users/${user.uid}`).set({ uid: user.uid, name: 'RoomIQ Verified Listings', email, role: 'owner', createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return user.uid;
}

const csv = readFileSync(csvPath, 'utf8');
const rows = parse(csv, { columns: true, skip_empty_lines: true, relax_column_count: true });
console.log(`Read ${rows.length} rows from the CSV.`);

const ownerId = await ensureImportOwner();
let batch = db.batch();
let count = 0, written = 0, skipped = 0;

for (const [i, r] of rows.entries()) {
  if (written >= LIMIT) break;
  const city = CITY_MAP[String(r.city || '').trim().toLowerCase()];
  const lat = Number(r.lat), lng = Number(r.long);
  const price = Number(r['minRoomRent(Rs)'] || r['minRent(Rs)']);
  if (!city || !Number.isFinite(lat) || !Number.isFinite(lng) || !(price > 0)) { skipped++; continue; }

  const facilities = parseFacilities(r.facilities);
  const type = r.bookingType === 'house' ? 'Flat' : (String(r.houseType || '').toLowerCase().includes('hostel') ? 'Hostel' : 'PG');
  const id = `csv-${r.id || i}`;

  batch.set(db.doc(`properties/${id}`), {
    ownerId,
    ownerName: 'RoomIQ Verified Listings',
    name: (r.title || `${type} in ${r.address || city}`).slice(0, 100),
    description: (r.description || '').slice(0, 2000),
    city,
    area: (r.address || city).slice(0, 120),
    type,
    gender: genderFrom(r.availableFor),
    price: Math.round(price),
    deposit: Math.round(Number(r['minRoomAdvance(Rs)']) || 0),
    beds: Number(r.bedAvailable || r.roomAvailable) || 0,
    amenities: mapAmenities(facilities),
    images: pickPhotos(r.bookingType, i),
    lat, lng,
    status: 'active',
    verified: true,
    ratingSum: 0,
    ratingCount: 0,
    available: 'Available now',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  count++; written++;
  if (count === 450) { await batch.commit(); batch = db.batch(); count = 0; console.log(`...${written} written`); }
}
if (count) await batch.commit();

console.log(`\nDone. Wrote ${written} listings, skipped ${skipped} rows with missing city/price/coordinates.`);
process.exit(0);
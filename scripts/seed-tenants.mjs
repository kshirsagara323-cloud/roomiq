// Adds 12 clearly-labelled DEMO tenants (roommate profiles) so the Roommates page has people to match with.
// Real tenants who sign up and opt in appear alongside them.
//   npm run seed-tenants            add / refresh demo tenants
//   npm run seed-tenants -- --clear remove them again
import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'node:fs';

const keyPath = new URL('./serviceAccountKey.json', import.meta.url);
if (!existsSync(keyPath)) { console.error('Missing scripts/serviceAccountKey.json'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });
const db = admin.firestore();
const auth = admin.auth();

if (process.argv.includes('--clear')) {
  const snap = await db.collection('roommates').where('demo', '==', true).get();
  for (const d of snap.docs) {
    await d.ref.delete();
    await db.doc(`users/${d.id}`).delete().catch(() => {});
    await auth.deleteUser(d.id).catch(() => {});
  }
  console.log(`Removed ${snap.size} demo tenants.`);
  process.exit(0);
}

// name, city, budget, gender, sleep, clean, social, smoker, diet, bio
const T = [
  ['Aarav', 'Pune', 9000, 'Male', 'night', 3, 4, false, 'any', 'Software engineer, works late, loves cricket.'],
  ['Riya', 'Pune', 10000, 'Female', 'early', 5, 3, false, 'veg', 'MBA student, early riser, keeps things tidy.'],
  ['Kabir', 'Pune', 8000, 'Male', 'flexible', 4, 3, false, 'nonveg', 'Final-year engineering student.'],
  ['Ananya', 'Bengaluru', 14000, 'Female', 'flexible', 4, 4, false, 'any', 'Product designer, enjoys cooking at home.'],
  ['Rohan', 'Bengaluru', 12000, 'Male', 'night', 2, 5, true, 'nonveg', 'Startup founder, social and always busy.'],
  ['Meera', 'Bengaluru', 15000, 'Female', 'early', 5, 2, false, 'veg', 'Data analyst, quiet evenings, yoga.'],
  ['Vihaan', 'Mumbai', 16000, 'Male', 'flexible', 3, 3, false, 'any', 'Finance intern, commutes by train.'],
  ['Sara', 'Mumbai', 18000, 'Female', 'night', 4, 4, false, 'nonveg', 'Media student, creative and friendly.'],
  ['Arjun', 'Hyderabad', 9500, 'Male', 'early', 4, 3, false, 'veg', 'Works in HITEC City, gym every morning.'],
  ['Diya', 'Hyderabad', 8500, 'Female', 'flexible', 3, 4, false, 'any', 'Masters student, loves board games.'],
  ['Ishaan', 'New Delhi', 11000, 'Male', 'night', 3, 3, false, 'any', 'Civil services aspirant, studies at night.'],
  ['Naina', 'New Delhi', 12000, 'Female', 'early', 5, 3, false, 'veg', 'Law student, organised and calm.'],
];

for (const [first, city, budget, gender, sleep, clean, social, smoker, diet, bio] of T) {
  const email = `demo.tenant.${first.toLowerCase()}@roomiq.example`;
  let u;
  try { u = await auth.getUserByEmail(email); }
  catch { u = await auth.createUser({ email, password: `x${Date.now()}${first}Aa1!`, displayName: `${first} (demo)`, emailVerified: true }); }
  const name = `${first} (demo)`;
  await db.doc(`users/${u.uid}`).set({ uid: u.uid, name, email, role: 'tenant', city, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  await db.doc(`roommates/${u.uid}`).set({
    uid: u.uid, name, city, budget, gender, sameGenderOnly: true, sleep, clean, social, smoker, diet, bio, contact: '',
    demo: true, updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
console.log(`Added ${T.length} demo tenants (names end with "(demo)").`);
process.exit(0);

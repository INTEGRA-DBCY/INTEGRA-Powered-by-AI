const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    if (key) env[key] = val;
  }
});

const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const db = getFirestore(app);

async function inspect() {
  const collections = ['users', 'participants', 'events', 'refreshment_stalls', 'symposiums', 'teams', 'activity_logs', 'system_settings'];
  for (const c of collections) {
    const snap = await getDocs(collection(db, c));
    console.log(`\n=== Collection ${c} (${snap.size} docs) ===`);
    snap.docs.forEach(d => {
      const data = d.data();
      console.log(`  [${d.id}] name=${data.name || data.title} | role=${data.role} | email=${data.email} | symId=${data.symposiumId}`);
    });
  }
}

inspect().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });

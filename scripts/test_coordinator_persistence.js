const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDocs, collection, deleteDoc } = require('firebase/firestore');
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

const cleanDataForFirestore = (obj) => {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) {
    return obj.filter(item => item !== undefined).map(item => cleanDataForFirestore(item));
  }
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      result[key] = cleanDataForFirestore(val);
    }
  }
  return result;
};

async function testCoordPersistence() {
  console.log("=== Testing Coordinator Cloud Persistence & ID Keying ===");

  const testCoordId = "coord-test-" + Date.now();
  const testCoord = {
    id: testCoordId,
    name: "Prof. Sarah Miller",
    email: "sarah.miller@dbcyelagiri.edu.in",
    password: "coord@sarah123",
    role: "coordinator",
    symposiumId: "integra-2026",
    department: "Computer Science",
    phone: "+91 98451 23456"
  };

  // 1. Save to Cloud Firestore
  console.log("1. Saving test coordinator to Firestore 'users' collection...");
  await setDoc(doc(db, "users", testCoordId), cleanDataForFirestore(testCoord), { merge: true });
  console.log("   ✓ Coordinator doc written: " + testCoordId);

  // 2. Read all users from Cloud Firestore
  console.log("2. Pulling users from Firestore...");
  const snap = await getDocs(collection(db, "users"));
  const cloudUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const found = cloudUsers.find(u => u.id === testCoordId);
  if (!found || found.role !== "coordinator") {
    throw new Error("Test coordinator was not found as coordinator in Firestore snapshot!");
  }
  console.log("   ✓ Successfully verified test coordinator in Firestore:", found.name, `(${found.role})`);

  // 3. Clean up test coordinator
  console.log("3. Cleaning up test coordinator...");
  await deleteDoc(doc(db, "users", testCoordId));
  console.log("   ✓ Test coordinator deleted from Firestore.");

  console.log("\n=== Coordinator Cloud Persistence Test PASSED! ===");
}

testCoordPersistence().then(() => process.exit(0)).catch(e => {
  console.error("Test failed:", e);
  process.exit(1);
});

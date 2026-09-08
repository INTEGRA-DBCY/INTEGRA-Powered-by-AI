const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs } = require('firebase/firestore');
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

async function testPersistence() {
  console.log("=== Testing Real-Time Cloud Firestore Persistence ===");
  
  const testVolId = "vol-test-" + Date.now();
  const testVol = {
    id: testVolId,
    symposiumId: "integra-2026",
    name: "Automated Test Volunteer",
    email: "testvol@example.com",
    role: "volunteer",
    password: "volunteer123",
    department: "Computer Science",
    phone: "+91 99999 11111",
    volunteerDuty: {
      station: "Gate Entry",
      venueName: "Main Gate",
      shift: "Full Day",
      status: "Active",
      notes: "Test verification"
    }
  };

  // 1. Save volunteer to Firestore
  console.log("1. Saving volunteer to Firestore USERS collection...");
  await setDoc(doc(db, "users", testVolId), testVol, { merge: true });
  console.log("   ✓ Saved volunteer doc: " + testVolId);

  // 2. Read back from Firestore
  console.log("2. Verifying volunteer document exists in Firestore...");
  const snap = await getDoc(doc(db, "users", testVolId));
  if (!snap.exists()) {
    throw new Error("Volunteer document was not found in Firestore!");
  }
  console.log("   ✓ Retrieved volunteer from Firestore: " + snap.data().name + " (" + snap.data().role + ")");

  // 3. Clean up test volunteer
  console.log("3. Cleaning up test volunteer...");
  await deleteDoc(doc(db, "users", testVolId));
  const snapAfterDelete = await getDoc(doc(db, "users", testVolId));
  if (snapAfterDelete.exists()) {
    throw new Error("Volunteer document was not deleted!");
  }
  console.log("   ✓ Test volunteer cleaned up cleanly.");

  console.log("\n=== All Persistence Tests Passed Successfully! ===");
}

testPersistence().then(() => process.exit(0)).catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

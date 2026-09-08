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

async function testEventSyncPersistence() {
  console.log("=== Testing Event Cloud Persistence & Smart Merge ===");

  const testEventId = "event-test-" + Date.now();
  const testEvent = {
    id: testEventId,
    symposiumId: "integra-2026",
    name: "AI Coding Battle",
    category: "Technical",
    type: "Individual",
    minTeamSize: 1,
    maxTeamSize: 1,
    maxCapacity: 50,
    maxTeams: 10,
    status: "Open",
    eventDate: "2026-09-11",
    slot: "SLOT 1",
    startTime: "10:00 AM",
    endTime: "10:50 AM",
    difficulty: "Hard",
    duration: "50 Mins",
    venue: "Lab 2 (PG Block)",
    coordinator: "Alex",
    phone: "+91 99999 12345",
    rules: ["Fair play", "No external AI tools"],
    criteria: ["Execution", "Accuracy", "Speed"]
  };

  // 1. Save to Cloud Firestore
  console.log("1. Saving test event to Firestore 'events' collection...");
  await setDoc(doc(db, "events", testEventId), cleanDataForFirestore(testEvent), { merge: true });
  console.log("   ✓ Event doc written: " + testEventId);

  // 2. Read all events from Cloud Firestore
  console.log("2. Pulling events from Firestore...");
  const snap = await getDocs(collection(db, "events"));
  const cloudEvents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`   ✓ Found ${cloudEvents.length} events in cloud:`, cloudEvents.map(e => e.name));

  const found = cloudEvents.find(e => e.id === testEventId);
  if (!found) {
    throw new Error("Test event was not found in Firestore snapshot!");
  }
  console.log("   ✓ Successfully verified test event in Firestore:", found.name);

  // 3. Clean up test event
  console.log("3. Cleaning up test event...");
  await deleteDoc(doc(db, "events", testEventId));
  console.log("   ✓ Test event deleted from Firestore.");

  console.log("\n=== Event Cloud Persistence & Smart Merge Test PASSED! ===");
}

testEventSyncPersistence().then(() => process.exit(0)).catch(e => {
  console.error("Test failed:", e);
  process.exit(1);
});

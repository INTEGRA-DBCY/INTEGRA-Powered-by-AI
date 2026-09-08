import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCWTPC1Kv3bnGLfSZamIiwypYrdHw1KOlE",
  authDomain: "integra-ai-874eb.firebaseapp.com",
  projectId: "integra-ai-874eb",
  storageBucket: "integra-ai-874eb.firebasestorage.app",
  messagingSenderId: "1040119926005",
  appId: "1:1040119926005:web:7d5fd6f9adcc14db9009bc",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCloud() {
  console.log("Checking Firestore collections...");
  try {
    const pSnap = await getDocs(collection(db, "participants"));
    console.log(`PARTICIPANTS count: ${pSnap.docs.length}`);
    pSnap.docs.forEach(d => console.log("  Participant doc:", d.id, JSON.stringify(d.data())));

    const uSnap = await getDocs(collection(db, "users"));
    console.log(`USERS count: ${uSnap.docs.length}`);
    uSnap.docs.forEach(d => console.log("  User doc:", d.id, JSON.stringify(d.data())));

    const symSnap = await getDocs(collection(db, "symposiums"));
    console.log(`SYMPOSIUMS count: ${symSnap.docs.length}`);
    symSnap.docs.forEach(d => console.log("  Symposium doc:", d.id, JSON.stringify(d.data())));

    const eSnap = await getDocs(collection(db, "events"));
    console.log(`EVENTS count: ${eSnap.docs.length}`);
    eSnap.docs.forEach(d => console.log("  Event doc:", d.id, JSON.stringify(d.data())));
  } catch (e) {
    console.error("Error querying Firestore:", e);
  }
}

checkCloud().then(() => process.exit(0));

import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDocs } from "firebase/firestore";

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

const danielStudent = {
  id: "std-daniel-0001",
  name: "DANIEL ABISHEK B",
  email: "danielabishek65@gmail.com",
  phone: "9388928437",
  college: "Don Bosco College, Dharmapuri",
  department: "Computer Science",
  year: "3rd Year",
  gender: "Male",
  role: "student",
  participantId: "INT26-0001",
  registrationId: "INTEGRA-2026-0001",
  username: "INT26-0001",
  password: "int-2026-daniel",
  paymentStatus: "Pending",
  registrationStatus: "Registered",
  symposiumId: "integra-2026",
  registeredMissions: [],
  achievements: ["Registered"],
  badges: ["AI Novice"],
  xp: 0,
  isFirstLogin: true,
  createdAt: new Date().toISOString()
};

const defaultSymposium = {
  id: "integra-2026",
  name: "INTEGRA",
  theme: "Powered by AI",
  tagline: "INTER-COLLEGE TECHNICAL SYMPOSIUM",
  year: "2026",
  academicYear: "AY26-27",
  logoUrl: "/integra-logo.png",
  bannerUrl: "/integra-logo.png",
  description: "State-level inter-college technical competition and AI fest hosted by PG & Research Dept. of Computer Science.",
  regFee: 200,
  registrationOpen: true,
  regStartDate: "2026-08-01",
  regEndDate: "2026-09-10",
  symposiumDate: "September 11, 2026",
  venue: "Don Bosco College (Co-Ed), Yelagiri Hills",
  contactEmail: "integra@donbosco.ac.in",
  contactPhone: "+91 98765 43210",
  status: "current",
  resultsPublished: false
};

const defaultMissions = [
  {
    id: "prompt-master",
    symposiumId: "integra-2026",
    name: "Prompt Master",
    subtitle: "Generative AI Engineering Battle",
    category: "Technical",
    domain: "Artificial Intelligence",
    description: "Architect cutting-edge system prompts and jailbreak filters to solve real-world industry AI problems.",
    type: "Individual",
    minTeamSize: 1,
    maxTeamSize: 1,
    maxCapacity: 60,
    maxTeams: 60,
    status: "Open",
    slot: "SLOT 1",
    startTime: "10:00 AM",
    endTime: "10:50 AM",
    eventDate: "2026-09-11",
    difficulty: "Medium",
    duration: "50 Mins",
    venue: "Lab A",
    coordinator: "Prof. S. Ramesh",
    phone: "+91 98765 43211",
    rules: ["Individual participation only.", "Live scoring based on prompt accuracy."],
    criteria: ["Prompt Quality", "Constraint Adherence", "Speed"]
  },
  {
    id: "vision-ai",
    symposiumId: "integra-2026",
    name: "Vision AI",
    subtitle: "Computer Vision & Object Detection Sprint",
    category: "Technical",
    domain: "Computer Vision",
    description: "Build neural vision pipelines to classify and segment objects.",
    type: "Team",
    minTeamSize: 2,
    maxTeamSize: 2,
    maxCapacity: 50,
    maxTeams: 25,
    status: "Open",
    slot: "SLOT 1",
    startTime: "10:00 AM",
    endTime: "10:50 AM",
    eventDate: "2026-09-11",
    difficulty: "Hard",
    duration: "50 Mins",
    venue: "Lab B",
    coordinator: "Prof. Catherine S.",
    phone: "+91 96655 44332",
    rules: ["Team of 2 members.", "Model evaluation benchmarked on mystery dataset."],
    criteria: ["Accuracy", "Inference Speed"]
  },
  {
    id: "ai-quiz-arena",
    symposiumId: "integra-2026",
    name: "AI Quiz Arena",
    subtitle: "Speed Tech & Cognitive AI Trivia",
    category: "Technical",
    domain: "General AI & CS",
    description: "High-voltage buzzer battle covering LLMs, neural architectures, CS fundamentals, and tech history.",
    type: "Individual",
    minTeamSize: 1,
    maxTeamSize: 1,
    maxCapacity: 100,
    maxTeams: 100,
    status: "Open",
    slot: "SLOT 2",
    startTime: "11:00 AM",
    endTime: "11:50 AM",
    eventDate: "2026-09-11",
    difficulty: "Medium",
    duration: "50 Mins",
    venue: "Conference Hall",
    coordinator: "Prof. Sharon Rose",
    phone: "+91 94433 22110",
    rules: ["Individual participation.", "Buzzer and MCQ rounds."],
    criteria: ["Score", "Speed"]
  }
];

async function seedCloud() {
  console.log("Seeding Cloud Firestore with participant & symposium...");
  try {
    // 1. Save Daniel to PARTICIPANTS and USERS
    await setDoc(doc(db, "participants", danielStudent.id), danielStudent, { merge: true });
    await setDoc(doc(db, "participants", danielStudent.participantId), danielStudent, { merge: true });
    await setDoc(doc(db, "users", danielStudent.id), danielStudent, { merge: true });
    await setDoc(doc(db, "users", danielStudent.participantId), danielStudent, { merge: true });
    console.log("✅ Daniel Abishek saved to Cloud Firestore participants & users!");

    // 2. Save Symposium
    await setDoc(doc(db, "symposiums", defaultSymposium.id), defaultSymposium, { merge: true });
    await setDoc(doc(db, "symposiums", "Integra-AI"), { ...defaultSymposium, id: "Integra-AI" }, { merge: true });
    console.log("✅ Symposiums saved to Cloud Firestore!");

    // 3. Save Events
    for (const ev of defaultMissions) {
      await setDoc(doc(db, "events", ev.id), ev, { merge: true });
    }
    console.log(`✅ ${defaultMissions.length} Events saved to Cloud Firestore!`);

    console.log("ALL DATA SEEDED TO CLOUD FIRESTORE SUCCESSFULLY!");
  } catch (e) {
    console.error("Error seeding Firestore:", e);
  }
}

seedCloud().then(() => process.exit(0));

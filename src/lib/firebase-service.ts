import { hashPassword, hashPasswordSync } from "./security";
import { db, isFirebaseConfigured } from "./firebase";
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, 
  query, where, orderBy 
} from "firebase/firestore";

// Collection Names in Firebase Cloud Firestore
const PARTICIPANTS = "participants";
const USERS = "users";
const EVENTS = "events";
const TEAMS = "teams";
const JOIN_REQUESTS = "teamJoinRequests";
const ATTENDANCE = "attendance";
const RESULTS = "results";
const STALLS = "refreshment_stalls";
const REFRESHMENT_TXNS = "refreshment_transactions";
const ANNOUNCEMENTS = "announcements";
const SETTINGS = "system_settings";
const SYMPOSIUMS = "symposiums";
const COLLEGES = "colleges";
const ACTIVITY_LOGS = "activity_logs";
const GALLERY = "gallery";
const FAQS = "faqs";
const CERTIFICATES = "certificates";
const FOOD_TOKENS = "food_tokens";
const REFRESHMENT_TOKENS = "refreshment_tokens";
const CONTACT_MESSAGES = "contact_messages";
const FEEDBACKS = "feedbacks";
const VOLUNTEERS = "volunteers";
const VOLUNTEERS_ALT = "volunteer";
const HOST_VOLUNTEERS = "host_volunteers";
const COORDINATORS = "coordinators";
const COORDINATORS_ALT = "coordinator";
const STAFF = "staff";

// Deeply strip undefined values to prevent Firestore 'Unsupported field value: undefined' errors
export const cleanDataForFirestore = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== "object") return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => cleanDataForFirestore(item));
  }
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      result[key] = cleanDataForFirestore(val);
    }
  }
  return result;
};

export const firebaseService = {
  // Sync all data from Firebase Firestore to local cache as Single Source of Truth
  pullAllData: async (): Promise<{
    participants?: any[];
    users?: any[];
    events?: any[];
    teams?: any[];
    requests?: any[];
    stalls?: any[];
    refreshmentTxns?: any[];
    announcements?: any[];
    settings?: any;
    symposiums?: any[];
    scores?: any[];
    colleges?: any[];
    activityLogs?: any[];
    gallery?: any[];
    faqs?: any[];
    certificates?: any[];
    foodTokens?: any[];
    refreshmentTokens?: any[];
    feedbacks?: any[];
  } | null> => {
    if (!isFirebaseConfigured || !db) return null;

    const safeGetDocs = async (colName: string): Promise<any[]> => {
      try {
        const snap = await getDocs(collection(db, colName));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err: any) {
        return [];
      }
    };

    try {
      // 1. Pull users, participants, volunteers, coordinators, and staff safely
      const userList = await safeGetDocs(USERS);
      const partList = await safeGetDocs(PARTICIPANTS);
      const volList = await safeGetDocs(VOLUNTEERS);
      const volAltList = await safeGetDocs(VOLUNTEERS_ALT);
      const hostVolList = await safeGetDocs(HOST_VOLUNTEERS);
      const coordList = await safeGetDocs(COORDINATORS);
      const coordAltList = await safeGetDocs(COORDINATORS_ALT);
      const staffList = await safeGetDocs(STAFF);

      // Merge participants, volunteers, coordinators, and users intelligently
      const userMap = new Map<string, any>();
      const mergeUserRecord = (u: any) => {
        if (!u) return;
        const key = (u.email || u.participantId || u.id || "").toLowerCase().trim();
        if (!key) return;
        
        if (!userMap.has(key)) {
          userMap.set(key, u);
        } else {
          const existing = userMap.get(key);
          const isVerified = existing.paymentStatus === "Verified" || u.paymentStatus === "Verified";
          const paymentStatus = isVerified ? "Verified" : (u.paymentStatus || existing.paymentStatus || "Pending");
          userMap.set(key, {
            ...existing,
            ...u,
            id: existing.id || u.id,
            participantId: existing.participantId || u.participantId,
            registrationId: existing.registrationId || u.registrationId,
            role: u.role || existing.role,
            volunteerDuty: u.volunteerDuty || existing.volunteerDuty,
            paymentStatus,
            paymentDetails: isVerified ? (existing.paymentDetails || u.paymentDetails) : (u.paymentDetails || existing.paymentDetails),
            registeredEvents: Array.from(new Set([...(existing.registeredEvents || []), ...(u.registeredEvents || [])])),
            achievements: Array.from(new Set([...(existing.achievements || []), ...(u.achievements || [])]))
          });
        }
      };

      for (const u of userList) mergeUserRecord(u);
      for (const p of partList) mergeUserRecord(p);
      for (const v of [...volList, ...volAltList, ...hostVolList]) {
        if (!v) continue;
        const volRecord = {
          ...v,
          role: "volunteer",
          volunteerDuty: v.volunteerDuty || {
            station: v.station || "Gate Entry",
            venueName: v.venueName || v.venue || "Campus Main Gate Entry",
            shift: v.shift || "Full Day",
            status: v.status || "Active",
            notes: v.notes || ""
          }
        };
        mergeUserRecord(volRecord);
      }
      for (const c of [...coordList, ...coordAltList]) {
        if (!c) continue;
        mergeUserRecord({
          ...c,
          role: c.role || "coordinator"
        });
      }
      for (const s of staffList) {
        if (!s) continue;
        mergeUserRecord(s);
      }
      const mergedUsers = Array.from(userMap.values());

      // 2. Pull events
      const events = await safeGetDocs(EVENTS);

      // 3. Pull teams
      const teams = await safeGetDocs(TEAMS);

      // 4. Pull requests
      const requests = await safeGetDocs(JOIN_REQUESTS);

      // 5. Pull stalls
      const stalls = await safeGetDocs(STALLS);

      // 6. Pull transactions
      const refreshmentTxns = await safeGetDocs(REFRESHMENT_TXNS);

      // 7. Pull announcements
      const announcements = await safeGetDocs(ANNOUNCEMENTS);

      // 8. Pull symposiums
      const symposiums = await safeGetDocs(SYMPOSIUMS);

      // 9. Pull settings
      let settings = null;
      try {
        const setDocRef = doc(db, SETTINGS, "global_config");
        const setSnap = await getDoc(setDocRef);
        if (setSnap.exists()) {
          settings = setSnap.data();
        }
      } catch {}

      // 10. Pull results / scores
      const scores = await safeGetDocs(RESULTS);

      // 11. Pull colleges
      const colleges = await safeGetDocs(COLLEGES);

      // 12. Pull logs
      const activityLogs = await safeGetDocs(ACTIVITY_LOGS);

      // 13. Pull gallery
      const gallery = await safeGetDocs(GALLERY);

      // 14. Pull FAQs
      const faqs = await safeGetDocs(FAQS);

      // 15. Pull certificates
      const certificates = await safeGetDocs(CERTIFICATES);

      // 16. Pull food tokens
      const foodTokens = await safeGetDocs(FOOD_TOKENS);

      // 17. Pull refreshment tokens
      const refreshmentTokens = await safeGetDocs(REFRESHMENT_TOKENS);

      // 18. Pull feedbacks
      const feedbacks = await safeGetDocs(FEEDBACKS);

      return {
        participants: partList,
        users: mergedUsers,
        events,
        teams,
        requests,
        stalls,
        refreshmentTxns,
        refreshmentTokens,
        announcements,
        symposiums,
        settings,
        scores,
        colleges,
        activityLogs,
        gallery,
        faqs,
        certificates,
        foodTokens,
        feedbacks
      };
    } catch (e) {
      console.error("Error pulling data from Firebase:", e);
      return null;
    }
  },

  // ── Users & Passwords CRUD ───────────────────────────────────────────────
  saveUser: async (user: any) => {
    if (!user?.id) return;
    try {
      const clean = cleanDataForFirestore(user);
      if (clean.password && !/^[a-f0-9]{64}$/i.test(clean.password)) {
        clean.password = await hashPassword(clean.password);
      }

      // 1. Dual-Sync: Guaranteed server API persistence (when logged in as staff)
      if (typeof window !== "undefined") {
        try {
          await fetch("/api/admin/save-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ user: clean, action: "save" })
          });
        } catch {
          // Fallback handled by direct Firestore SDK below
        }
      }

      // 2. Direct Firestore SDK setDoc
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, USERS, String(user.id)), clean, { merge: true });
        if (user.participantId && user.participantId !== user.id) {
          await setDoc(doc(db, USERS, String(user.participantId)), clean, { merge: true });
        }
        if (user.role === "student") {
          await setDoc(doc(db, PARTICIPANTS, String(user.id)), clean, { merge: true });
          if (user.participantId && user.participantId !== user.id) {
            await setDoc(doc(db, PARTICIPANTS, String(user.participantId)), clean, { merge: true });
          }
        }
        if (user.role === "volunteer" || user.volunteerDuty || (Array.isArray(user.roles) && user.roles.includes("volunteer"))) {
          await setDoc(doc(db, VOLUNTEERS, String(user.id)), clean, { merge: true });
        }
      }
    } catch (e) {
      console.error("Error saving user to Firebase:", e);
      throw e;
    }
  },

  saveVolunteer: async (volunteer: any) => {
    return firebaseService.saveUser(volunteer);
  },

  deleteVolunteer: async (volunteerId: string) => {
    return firebaseService.deleteUser(volunteerId);
  },

  saveParticipant: async (p: any) => {
    if (!isFirebaseConfigured || !db || !p?.id) return;
    try {
      const clean = cleanDataForFirestore(p);
      await setDoc(doc(db, USERS, String(p.id)), clean, { merge: true });
      await setDoc(doc(db, PARTICIPANTS, String(p.id)), clean, { merge: true });
      if (p.participantId && p.participantId !== p.id) {
        await setDoc(doc(db, USERS, String(p.participantId)), clean, { merge: true });
        await setDoc(doc(db, PARTICIPANTS, String(p.participantId)), clean, { merge: true });
      }
    } catch (e) {
      console.error("Error saving participant to Firebase:", e);
    }
  },

  findUserByEmailOrId: async (emailOrId: string): Promise<any | null> => {
    if (!isFirebaseConfigured || !db || !emailOrId) return null;
    try {
      const clean = emailOrId.toLowerCase().trim();
      // 1. Try searching by direct document ID
      const docRef = doc(db, USERS, emailOrId);
      const dSnap = await getDoc(docRef);
      if (dSnap.exists()) {
        const d = dSnap.data();
        return {
          id: dSnap.id,
          ...d,
          password: d.password || d.Password || d.passcode || d.accessCode || d.pin || d.code
        };
      }

      // 2. Query USERS collection
      const qSnap = await getDocs(collection(db, USERS));
      for (const docItem of qSnap.docs) {
        const data: any = docItem.data();
        const docEmail = (data.email || data.Email || data.userEmail || "").toLowerCase().trim();
        const docPid = (data.participantId || data.participant_id || data.id || "").toLowerCase().trim();
        const docReg = (data.registrationId || data.reg_id || "").toLowerCase().trim();
        const docUser = (data.username || data.userName || "").toLowerCase().trim();
        const docPhone = (data.phone || data.mobile || "").replace(/[^0-9]/g, "");
        const cleanPhone = clean.replace(/[^0-9]/g, "");

        if (
          docEmail === clean ||
          docPid === clean ||
          docReg === clean ||
          docUser === clean ||
          (cleanPhone.length >= 10 && docPhone === cleanPhone)
        ) {
          return {
            id: docItem.id,
            ...data,
            password: data.password || data.Password || data.passcode || data.accessCode || data.pin || data.code
          };
        }
      }

      // 3. Query PARTICIPANTS collection
      const pSnap = await getDocs(collection(db, PARTICIPANTS));
      for (const docItem of pSnap.docs) {
        const data: any = docItem.data();
        const docEmail = (data.email || data.Email || data.userEmail || "").toLowerCase().trim();
        const docPid = (data.participantId || data.participant_id || data.id || "").toLowerCase().trim();
        const docReg = (data.registrationId || data.reg_id || "").toLowerCase().trim();
        const docUser = (data.username || data.userName || "").toLowerCase().trim();
        const docPhone = (data.phone || data.mobile || "").replace(/[^0-9]/g, "");
        const cleanPhone = clean.replace(/[^0-9]/g, "");

        if (
          docEmail === clean ||
          docPid === clean ||
          docReg === clean ||
          docUser === clean ||
          (cleanPhone.length >= 10 && docPhone === cleanPhone)
        ) {
          return {
            id: docItem.id,
            ...data,
            password: data.password || data.Password || data.passcode || data.accessCode || data.pin || data.code
          };
        }
      }

      return null;
    } catch (e) {
      console.error("Error finding user in Firebase:", e);
      return null;
    }
  },

  deleteUser: async (userOrId: any) => {
    if (!isFirebaseConfigured || !db || !userOrId) return;
    try {
      const idsToDelete = new Set<string>();
      let targetEmail = "";

      if (typeof userOrId === "object" && userOrId !== null) {
        if (userOrId.id) idsToDelete.add(String(userOrId.id));
        if (userOrId.participantId) idsToDelete.add(String(userOrId.participantId));
        if (userOrId.registrationId) idsToDelete.add(String(userOrId.registrationId));
        if (userOrId.email) targetEmail = String(userOrId.email).toLowerCase().trim();
      } else {
        idsToDelete.add(String(userOrId));
      }

      // 1. Dual-Sync: Call server API for guaranteed backend purge
      if (typeof window !== "undefined") {
        for (const tid of idsToDelete) {
          try {
            await fetch("/api/admin/save-user", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ userId: tid, action: "delete" })
            });
          } catch {}
        }
      }

      // Query & delete all matching docs from USERS collection
      const uSnap = await getDocs(collection(db, USERS));
      for (const d of uSnap.docs) {
        const data: any = d.data();
        const docEmail = (data.email || "").toLowerCase().trim();
        if (
          idsToDelete.has(d.id) ||
          (data.id && idsToDelete.has(String(data.id))) ||
          (data.participantId && idsToDelete.has(String(data.participantId))) ||
          (data.registrationId && idsToDelete.has(String(data.registrationId))) ||
          (targetEmail && docEmail === targetEmail)
        ) {
          await deleteDoc(doc(db, USERS, d.id));
        }
      }

      // Query & delete all matching docs from PARTICIPANTS collection
      const pSnap = await getDocs(collection(db, PARTICIPANTS));
      for (const d of pSnap.docs) {
        const data: any = d.data();
        const docEmail = (data.email || "").toLowerCase().trim();
        if (
          idsToDelete.has(d.id) ||
          (data.id && idsToDelete.has(String(data.id))) ||
          (data.participantId && idsToDelete.has(String(data.participantId))) ||
          (data.registrationId && idsToDelete.has(String(data.registrationId))) ||
          (targetEmail && docEmail === targetEmail)
        ) {
          await deleteDoc(doc(db, PARTICIPANTS, d.id));
        }
      }

      // Query & delete all matching docs from VOLUNTEERS collection
      try {
        const vSnap = await getDocs(collection(db, VOLUNTEERS));
        for (const d of vSnap.docs) {
          const data: any = d.data();
          const docEmail = (data.email || "").toLowerCase().trim();
          if (
            idsToDelete.has(d.id) ||
            (data.id && idsToDelete.has(String(data.id))) ||
            (data.participantId && idsToDelete.has(String(data.participantId))) ||
            (targetEmail && docEmail === targetEmail)
          ) {
            await deleteDoc(doc(db, VOLUNTEERS, d.id));
          }
        }
      } catch {}
    } catch (e) {
      console.error("Error deleting user from Firebase:", e);
    }
  },

  deleteParticipant: async (userOrId: any) => {
    return firebaseService.deleteUser(userOrId);
  },

  clearAllParticipantsFromCloud: async () => {
    if (!isFirebaseConfigured || !db) return;
    try {
      // 1. Delete all documents from PARTICIPANTS collection
      const pSnap = await getDocs(collection(db, PARTICIPANTS));
      for (const d of pSnap.docs) {
        await deleteDoc(doc(db, PARTICIPANTS, d.id));
      }

      // 2. Delete all student documents from USERS collection
      const uSnap = await getDocs(collection(db, USERS));
      for (const d of uSnap.docs) {
        const data: any = d.data();
        if (data.role === "student" || d.id.startsWith("std-") || d.id.startsWith("INT26-") || data.participantId) {
          await deleteDoc(doc(db, USERS, d.id));
        }
      }

      // 3. Delete teams & requests
      const tSnap = await getDocs(collection(db, TEAMS));
      for (const d of tSnap.docs) {
        await deleteDoc(doc(db, TEAMS, d.id));
      }

      const rSnap = await getDocs(collection(db, JOIN_REQUESTS));
      for (const d of rSnap.docs) {
        await deleteDoc(doc(db, JOIN_REQUESTS, d.id));
      }
    } catch (e) {
      console.error("Error clearing participants from Firebase:", e);
    }
  },

  // ── Events CRUD ──────────────────────────────────────────────────────────
  saveEvent: async (ev: any) => {
    if (!isFirebaseConfigured || !db || !ev?.id) return;
    try {
      await setDoc(doc(db, EVENTS, String(ev.id)), cleanDataForFirestore(ev), { merge: true });
    } catch (e) {
      console.error("Error saving event to Firebase:", e);
    }
  },

  deleteEvent: async (eventOrId: any) => {
    if (!isFirebaseConfigured || !db || !eventOrId) return;
    try {
      const idsToDelete = new Set<string>();
      let targetName = "";

      if (typeof eventOrId === "object" && eventOrId !== null) {
        if (eventOrId.id) idsToDelete.add(String(eventOrId.id));
        if (eventOrId.name) targetName = String(eventOrId.name).toLowerCase().trim();
      } else {
        const raw = String(eventOrId).trim();
        idsToDelete.add(raw);
        targetName = raw.toLowerCase();
      }

      // Delete exact doc ID and slug variants if present
      const expandedIds = new Set<string>(idsToDelete);
      for (const rawId of idsToDelete) {
        const clean = rawId.toLowerCase().trim();
        expandedIds.add(clean);
        if (clean.startsWith("event-")) {
          expandedIds.add(clean.replace("event-", ""));
        } else {
          expandedIds.add(`event-${clean}`);
        }
      }
      if (targetName) {
        const slug = targetName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        if (slug) {
          expandedIds.add(slug);
          expandedIds.add(`event-${slug}`);
        }
      }

      for (const idStr of expandedIds) {
        try { await deleteDoc(doc(db, EVENTS, idStr)); } catch {}
      }

      // Scan and delete all matching docs from EVENTS collection
      const eSnap = await getDocs(collection(db, EVENTS));
      for (const d of eSnap.docs) {
        const data: any = d.data();
        const docName = (data.name || "").toLowerCase().trim();
        const docId = String(d.id).toLowerCase().trim();
        const dataId = (data.id || "").toLowerCase().trim();

        if (
          idsToDelete.has(d.id) ||
          (data.id && idsToDelete.has(String(data.id))) ||
          (targetName && (docName === targetName || docId.includes(targetName) || targetName.includes(docId) || dataId.includes(targetName)))
        ) {
          await deleteDoc(doc(db, EVENTS, d.id));
        }
      }
    } catch (e) {
      console.error("Error deleting event from Firebase:", e);
    }
  },

  // ── Refreshment Stalls CRUD ──────────────────────────────────────────────
  saveStall: async (stall: any) => {
    if (!isFirebaseConfigured || !db || !stall?.id) return;
    try {
      await setDoc(doc(db, STALLS, String(stall.id)), cleanDataForFirestore(stall), { merge: true });
    } catch (e) {
      console.error("Error saving stall to Firebase:", e);
    }
  },

  deleteStall: async (id: string) => {
    if (!isFirebaseConfigured || !db || !id) return;
    try {
      await deleteDoc(doc(db, STALLS, String(id)));
    } catch (e) {
      console.error("Error deleting stall from Firebase:", e);
    }
  },

  saveRefreshmentTransaction: async (txn: any) => {
    if (!isFirebaseConfigured || !db || !txn?.id) return;
    try {
      await setDoc(doc(db, REFRESHMENT_TXNS, String(txn.id)), cleanDataForFirestore(txn), { merge: true });
    } catch (e) {
      console.error("Error saving refreshment txn to Firebase:", e);
    }
  },

  // ── Announcements CRUD ───────────────────────────────────────────────────
  saveAnnouncement: async (ann: any) => {
    if (!isFirebaseConfigured || !db || !ann?.id) return;
    try {
      await setDoc(doc(db, ANNOUNCEMENTS, String(ann.id)), cleanDataForFirestore(ann), { merge: true });
    } catch (e) {
      console.error("Error saving announcement to Firebase:", e);
    }
  },

  deleteAnnouncement: async (id: string) => {
    if (!isFirebaseConfigured || !db || !id) return;
    try {
      await deleteDoc(doc(db, ANNOUNCEMENTS, String(id)));
    } catch (e) {
      console.error("Error deleting announcement from Firebase:", e);
    }
  },

  // ── Teams & Join Requests CRUD ───────────────────────────────────────────
  saveTeam: async (t: any) => {
    if (!isFirebaseConfigured || !db || !t?.id) return;
    try {
      await setDoc(doc(db, TEAMS, String(t.id)), cleanDataForFirestore(t), { merge: true });
    } catch (e) {
      console.error("Error saving team to Firebase:", e);
    }
  },

  deleteTeam: async (id: string) => {
    if (!isFirebaseConfigured || !db || !id) return;
    try {
      await deleteDoc(doc(db, TEAMS, String(id)));
    } catch (e) {
      console.error("Error deleting team from Firebase:", e);
    }
  },

  saveJoinRequest: async (r: any) => {
    if (!isFirebaseConfigured || !db || !r?.id) return;
    try {
      await setDoc(doc(db, JOIN_REQUESTS, String(r.id)), cleanDataForFirestore(r), { merge: true });
    } catch (e) {
      console.error("Error saving join request to Firebase:", e);
    }
  },

  deleteJoinRequest: async (id: string) => {
    if (!isFirebaseConfigured || !db || !id) return;
    try {
      await deleteDoc(doc(db, JOIN_REQUESTS, String(id)));
    } catch (e) {
      console.error("Error deleting join request from Firebase:", e);
    }
  },

  // ── Attendance & Scorecard ───────────────────────────────────────────────
  logAttendance: async (logOrId: any, maybeLog?: any) => {
    if (!isFirebaseConfigured || !db) return;
    try {
      const id = maybeLog ? String(logOrId) : (logOrId?.id || `att-${Date.now()}`);
      const log = maybeLog || logOrId;
      await setDoc(doc(db, ATTENDANCE, String(id)), cleanDataForFirestore(log), { merge: true });
    } catch (e) {
      console.error("Error logging attendance to Firebase:", e);
    }
  },

  saveResult: async (resOrId: any, maybeRes?: any) => {
    if (!isFirebaseConfigured || !db) return;
    try {
      const id = maybeRes ? String(resOrId) : (resOrId?.id || `res-${Date.now()}`);
      const res = maybeRes || resOrId;
      await setDoc(doc(db, RESULTS, String(id)), cleanDataForFirestore(res), { merge: true });
    } catch (e) {
      console.error("Error saving result scorecard to Firebase:", e);
    }
  },

  // ── Colleges CRUD ────────────────────────────────────────────────────────
  saveCollege: async (col: any) => {
    if (!isFirebaseConfigured || !db || !col?.id) return;
    try {
      await setDoc(doc(db, COLLEGES, String(col.id)), cleanDataForFirestore(col), { merge: true });
    } catch (e) {
      console.error("Error saving college to Firebase:", e);
    }
  },

  deleteCollege: async (id: string) => {
    if (!isFirebaseConfigured || !db || !id) return;
    try {
      await deleteDoc(doc(db, COLLEGES, String(id)));
    } catch (e) {
      console.error("Error deleting college from Firebase:", e);
    }
  },

  // ── Settings CRUD ────────────────────────────────────────────────────────
  saveSettings: async (settings: any) => {
    if (!isFirebaseConfigured || !db) return;
    try {
      await setDoc(doc(db, SETTINGS, "global_config"), cleanDataForFirestore(settings), { merge: true });
    } catch (e) {
      console.error("Error saving settings to Firebase:", e);
    }
  },

  // ── Activity Logs ────────────────────────────────────────────────────────
  saveActivityLog: async (log: any) => {
    if (!isFirebaseConfigured || !db || !log?.id) return;
    try {
      await setDoc(doc(db, ACTIVITY_LOGS, String(log.id)), cleanDataForFirestore(log), { merge: true });
    } catch (e) {
      console.error("Error saving activity log to Firebase:", e);
    }
  },

  // ── Symposium Editions CRUD ──────────────────────────────────────────────
  saveSymposium: async (sym: any) => {
    if (!isFirebaseConfigured || !db || !sym?.id) return;
    try {
      await setDoc(doc(db, SYMPOSIUMS, String(sym.id)), cleanDataForFirestore(sym), { merge: true });
    } catch (e) {
      console.error("Error saving symposium to Firebase:", e);
    }
  },

  deleteSymposium: async (id: string) => {
    if (!isFirebaseConfigured || !db || !id) return;
    try {
      await deleteDoc(doc(db, SYMPOSIUMS, String(id)));
    } catch (e) {
      console.error("Error deleting symposium from Firebase:", e);
    }
  },

  // ── Gallery Showcase CRUD ────────────────────────────────────────────────
  saveGalleryItem: async (item: any) => {
    if (!isFirebaseConfigured || !db || !item?.id) return;
    try {
      await setDoc(doc(db, GALLERY, String(item.id)), cleanDataForFirestore(item), { merge: true });
    } catch (e) {
      console.error("Error saving gallery item to Firebase:", e);
    }
  },

  deleteGalleryItem: async (id: string) => {
    if (!isFirebaseConfigured || !db || !id) return;
    try {
      await deleteDoc(doc(db, GALLERY, String(id)));
    } catch (e) {
      console.error("Error deleting gallery item from Firebase:", e);
    }
  },

  // ── FAQs CRUD ────────────────────────────────────────────────────────────
  saveFAQItem: async (faq: any) => {
    if (!isFirebaseConfigured || !db || !faq?.id) return;
    try {
      await setDoc(doc(db, FAQS, String(faq.id)), cleanDataForFirestore(faq), { merge: true });
    } catch (e) {
      console.error("Error saving FAQ to Firebase:", e);
    }
  },

  deleteFAQItem: async (id: string) => {
    if (!isFirebaseConfigured || !db || !id) return;
    try {
      await deleteDoc(doc(db, FAQS, String(id)));
    } catch (e) {
      console.error("Error deleting FAQ from Firebase:", e);
    }
  },

  // ── Certificates CRUD ────────────────────────────────────────────────────
  saveCertificate: async (cert: any) => {
    if (!isFirebaseConfigured || !db || !cert?.id) return;
    try {
      await setDoc(doc(db, CERTIFICATES, String(cert.id)), cleanDataForFirestore(cert), { merge: true });
    } catch (e) {
      console.error("Error saving certificate to Firebase:", e);
    }
  },

  deleteCertificate: async (id: string) => {
    if (!isFirebaseConfigured || !db || !id) return;
    try {
      await deleteDoc(doc(db, CERTIFICATES, String(id)));
    } catch (e) {
      console.error("Error deleting certificate from Firebase:", e);
    }
  },

  // ── Food Tokens CRUD ─────────────────────────────────────────────────────
  saveFoodToken: async (token: any) => {
    if (!isFirebaseConfigured || !db || !token?.id) return;
    try {
      await setDoc(doc(db, FOOD_TOKENS, String(token.id)), cleanDataForFirestore(token), { merge: true });
    } catch (e) {
      console.error("Error saving food token to Firebase:", e);
    }
  },

  // ── Refreshment Tokens CRUD ──────────────────────────────────────────────
  saveRefreshmentToken: async (token: any) => {
    if (!isFirebaseConfigured || !db || !token?.id) return;
    try {
      await setDoc(doc(db, REFRESHMENT_TOKENS, String(token.id)), cleanDataForFirestore(token), { merge: true });
    } catch (e) {
      console.error("Error saving refreshment token to Firebase:", e);
    }
  },

  saveRefreshmentTxn: async (txn: any) => {
    if (!isFirebaseConfigured || !db || !txn?.id) return;
    try {
      await setDoc(doc(db, REFRESHMENT_TXNS, String(txn.id)), cleanDataForFirestore(txn), { merge: true });
    } catch (e) {
      console.error("Error saving refreshment transaction to Firebase:", e);
    }
  },

  // ── Contact Messages CRUD ─────────────────────────────────────────────────
  saveContactMessage: async (msg: any) => {
    if (!isFirebaseConfigured || !db || !msg?.id) return;
    try {
      await setDoc(doc(db, CONTACT_MESSAGES, String(msg.id)), cleanDataForFirestore(msg), { merge: true });
    } catch (e) {
      console.error("Error saving contact message to Firebase:", e);
    }
  },

  // ── Feedbacks CRUD ────────────────────────────────────────────────────────
  saveFeedback: async (fb: any) => {
    if (!isFirebaseConfigured || !db || !fb?.id) return;
    try {
      await setDoc(doc(db, FEEDBACKS, String(fb.id)), cleanDataForFirestore(fb), { merge: true });
    } catch (e) {
      console.error("Error saving feedback to Firebase:", e);
    }
  },

  clearFeedbacks: async () => {
    if (!isFirebaseConfigured || !db) return;
    try {
      const fbSnap = await getDocs(collection(db, FEEDBACKS));
      for (const d of fbSnap.docs) {
        await deleteDoc(doc(db, FEEDBACKS, d.id));
      }
    } catch (e) {
      console.error("Error clearing feedbacks from Firebase:", e);
    }
  }
};

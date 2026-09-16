import { NextRequest, NextResponse } from "next/server";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where 
} from "firebase/firestore";

export const dynamic = "force-dynamic";

function normalizeDept(dept: string): string {
  if (!dept) return "";
  const d = dept.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (d.includes("comp") || d === "cse" || d === "cs" || d.includes("software")) return "cse";
  if (d.includes("info") || d === "it") return "it";
  if (d.includes("ai") || d.includes("artificial") || d.includes("data") || d === "aids" || d === "aiml") return "ai";
  if ((d.includes("electr") && d.includes("comm")) || d === "ece") return "ece";
  if (d.includes("electr") || d === "eee") return "eee";
  if (d.includes("mech")) return "mech";
  if (d.includes("civil")) return "civil";
  if (d.includes("biotech") || d.includes("bio")) return "biotech";
  if (d.includes("mgmt") || d.includes("business") || d === "mba" || d === "bba") return "mgmt";
  if (d.includes("ca") || d === "bca" || d === "mca") return "ca";
  return d;
}

function normalizeCollege(col: string): string {
  if (!col) return "";
  return col.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Find participant across participants and users collections
async function findParticipantInFirestore(searchTerm: string): Promise<any> {
  if (!searchTerm || !isFirebaseConfigured || !db) return null;
  const clean = searchTerm.trim();
  const cleanLower = clean.toLowerCase();

  const idVariants = [clean, clean.toUpperCase(), clean.toLowerCase()];

  // 1. Direct doc lookup
  for (const variant of idVariants) {
    for (const col of ["participants", "users"]) {
      try {
        const snap = await getDoc(doc(db, col, variant));
        if (snap.exists()) {
          const d = snap.data();
          return { id: snap.id, ...d };
        }
      } catch {}
    }
  }

  // 2. Query where participantId == ...
  for (const col of ["participants", "users"]) {
    try {
      const qSnap = await getDocs(query(collection(db, col), where("participantId", "==", clean)));
      if (!qSnap.empty) {
        const d = qSnap.docs[0].data();
        return { id: qSnap.docs[0].id, ...d };
      }
      const qSnapUpper = await getDocs(query(collection(db, col), where("participantId", "==", clean.toUpperCase())));
      if (!qSnapUpper.empty) {
        const d = qSnapUpper.docs[0].data();
        return { id: qSnapUpper.docs[0].id, ...d };
      }
    } catch {}
  }

  // 3. Query where email == ...
  for (const col of ["participants", "users"]) {
    try {
      const qSnap = await getDocs(query(collection(db, col), where("email", "==", cleanLower)));
      if (!qSnap.empty) {
        const d = qSnap.docs[0].data();
        return { id: qSnap.docs[0].id, ...d };
      }
    } catch {}
  }

  // 4. Scan participants for case-insensitive match
  try {
    const snap = await getDocs(collection(db, "participants"));
    for (const d of snap.docs) {
      const data = d.data();
      const pId = (data.participantId || "").toLowerCase();
      const uId = (data.id || d.id || "").toLowerCase();
      const email = (data.email || "").toLowerCase();
      if (pId === cleanLower || uId === cleanLower || email === cleanLower) {
        return { id: d.id, ...data };
      }
    }
  } catch {}

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const participantId = (searchParams.get("participantId") || searchParams.get("studentId") || "").trim();
    const teamId = (searchParams.get("teamId") || "").trim();

    if (!isFirebaseConfigured || !db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    if (teamId) {
      const teamSnap = await getDoc(doc(db, "teams", teamId));
      if (!teamSnap.exists()) {
        return NextResponse.json({ error: "Team not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, team: { id: teamSnap.id, ...teamSnap.data() } });
    }

    if (!participantId) {
      return NextResponse.json({ error: "participantId or teamId required" }, { status: 400 });
    }

    const cleanPartId = participantId.toLowerCase();

    // Pull all teams
    const teamsSnap = await getDocs(collection(db, "teams"));
    const allTeams: any[] = [];
    teamsSnap.forEach(d => allTeams.push({ id: d.id, ...d.data() }));

    const userTeams = allTeams.filter(t => {
      const isLeader = (t.leaderId || "").toLowerCase() === cleanPartId;
      const isMember = Array.isArray(t.members) && t.members.some((m: any) => {
        const mId = typeof m === "string" ? m.toLowerCase() : (m.studentId || m.id || "").toLowerCase();
        return mId === cleanPartId;
      });
      return isLeader || isMember;
    });

    const ledTeamIds = new Set(
      allTeams
        .filter(t => (t.leaderId || "").toLowerCase() === cleanPartId)
        .map(t => t.id)
    );

    // Pull all join requests
    const reqSnap = await getDocs(collection(db, "join_requests"));
    const allRequests: any[] = [];
    reqSnap.forEach(d => allRequests.push({ id: d.id, ...d.data() }));

    const userRequests = allRequests.filter(r => {
      if ((r.status || "").toLowerCase() !== "pending") return false;

      const rStudentId = (r.studentId || "").toLowerCase();
      const rStudentPartId = (r.studentParticipantId || "").toLowerCase();
      const rLeaderId = (r.leaderId || "").toLowerCase();

      const isInvited = rStudentId === cleanPartId || rStudentPartId === cleanPartId;
      const isLeader = ledTeamIds.has(r.teamId) || rLeaderId === cleanPartId;

      return isInvited || isLeader;
    });

    return NextResponse.json({
      success: true,
      teams: userTeams,
      joinRequests: userRequests
    });
  } catch (err: any) {
    console.error("Error in GET /api/teams:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch teams data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isFirebaseConfigured || !db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const body = await req.json();
    const { action } = body;

    // ── 1. CREATE TEAM ────────────────────────────────────────────────────────
    if (action === "create_team") {
      const { 
        eventId, 
        eventName, 
        teamName, 
        leaderId, 
        leaderName, 
        leaderCollege, 
        leaderDept, 
        leaderEmail 
      } = body;

      if (!eventId || !teamName || !leaderId) {
        return NextResponse.json({ error: "eventId, teamName, and leaderId are required." }, { status: 400 });
      }

      const cleanLeaderId = String(leaderId).trim();
      const cleanTeamName = String(teamName).trim();

      // Check existing teams for this event
      const teamsSnap = await getDocs(collection(db, "teams"));
      const existingTeams: any[] = [];
      teamsSnap.forEach(d => existingTeams.push({ id: d.id, ...d.data() }));

      // 1. Leader cannot be in multiple teams for the same event
      const existingUserTeam = existingTeams.find(t => {
        const sameEvent = (t.missionId || t.eventId) === eventId;
        if (!sameEvent) return false;
        const isLeader = (t.leaderId || "").toLowerCase() === cleanLeaderId.toLowerCase();
        const isMember = Array.isArray(t.members) && t.members.some((m: any) => {
          const mId = typeof m === "string" ? m.toLowerCase() : (m.studentId || m.id || "").toLowerCase();
          return mId === cleanLeaderId.toLowerCase();
        });
        return isLeader || isMember;
      });

      if (existingUserTeam) {
        return NextResponse.json({
          error: `You are already part of Team "${existingUserTeam.teamName || existingUserTeam.name}" for this event. Participants can only belong to 1 team per event.`
        }, { status: 400 });
      }

      // 2. Only 1 team per department per college per event
      if (leaderCollege && leaderDept) {
        const sameDeptTeam = existingTeams.find(t => {
          const sameEvent = (t.missionId || t.eventId) === eventId;
          if (!sameEvent) return false;

          const tCol = normalizeCollege(t.college || "");
          const lCol = normalizeCollege(leaderCollege);
          const tDep = normalizeDept(t.department || "");
          const lDep = normalizeDept(leaderDept);

          return tCol === lCol && tDep === lDep;
        });

        if (sameDeptTeam) {
          return NextResponse.json({
            error: `Registration restricted: Team "${sameDeptTeam.teamName || sameDeptTeam.name}" from ${leaderDept} of ${leaderCollege} is already registered. Only 1 team per department per college is allowed per event.`
          }, { status: 400 });
        }
      }

      const teamId = `team-${Date.now()}`;
      const newTeam = {
        id: teamId,
        symposiumId: "integra-2026",
        name: cleanTeamName,
        teamName: cleanTeamName,
        missionId: eventId,
        eventId: eventId,
        missionName: eventName || "Team Event",
        eventName: eventName || "Team Event",
        leaderId: cleanLeaderId,
        leaderName: leaderName || "Team Leader",
        leaderEmail: leaderEmail || "",
        college: leaderCollege || "",
        department: leaderDept || "",
        status: "Waiting for Members",
        members: [{
          studentId: cleanLeaderId,
          studentName: leaderName || "Team Leader",
          joinedAt: new Date().toISOString()
        }],
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, "teams", teamId), newTeam);

      // Auto-enroll leader into event
      const leaderParticipant = await findParticipantInFirestore(cleanLeaderId);
      if (leaderParticipant) {
        const currentEvents = Array.isArray(leaderParticipant.registeredEvents) ? leaderParticipant.registeredEvents : [];
        if (!currentEvents.includes(eventId)) {
          const updatedEvents = [...currentEvents, eventId];
          const updatePayload = { registeredEvents: updatedEvents, updatedAt: new Date().toISOString() };
          await setDoc(doc(db, "participants", leaderParticipant.id), updatePayload, { merge: true });
          await setDoc(doc(db, "users", leaderParticipant.id), updatePayload, { merge: true });
        }
      }

      return NextResponse.json({
        success: true,
        message: "Team created successfully!",
        team: newTeam
      });
    }

    // ── 2. INVITE MEMBER ──────────────────────────────────────────────────────
    if (action === "invite_member") {
      const { teamId, leaderId, targetParticipantId } = body;

      if (!teamId || !targetParticipantId) {
        return NextResponse.json({ error: "teamId and targetParticipantId are required." }, { status: 400 });
      }

      const cleanTarget = String(targetParticipantId).trim();

      // 1. Fetch team
      const teamSnap = await getDoc(doc(db, "teams", teamId));
      if (!teamSnap.exists()) {
        return NextResponse.json({ error: "Team not found." }, { status: 404 });
      }
      const team = teamSnap.data() as any;

      // 2. Lookup target student in Firestore
      const student = await findParticipantInFirestore(cleanTarget);
      if (!student) {
        return NextResponse.json({
          error: `Participant "${cleanTarget}" not found in database. Please verify the Participant ID.`
        }, { status: 404 });
      }

      const studentPartId = student.participantId || student.id;
      const targetEventId = team.missionId || team.eventId;

      // 3. College & Department check
      if (team.college && student.college) {
        const tCol = normalizeCollege(team.college);
        const sCol = normalizeCollege(student.college);
        if (tCol && sCol && tCol !== sCol && !team.college.toLowerCase().includes(student.college.toLowerCase()) && !student.college.toLowerCase().includes(team.college.toLowerCase())) {
          return NextResponse.json({
            error: `Team restriction: All team members must belong to the same college (${team.college}).`
          }, { status: 400 });
        }
      }

      if (team.department && student.department) {
        const tDept = normalizeDept(team.department);
        const sDept = normalizeDept(student.department);
        if (tDept && sDept && tDept !== sDept && !team.department.toLowerCase().includes(student.department.toLowerCase()) && !student.department.toLowerCase().includes(team.department.toLowerCase())) {
          return NextResponse.json({
            error: `Team restriction: All team members must belong to the same department (${team.department}).`
          }, { status: 400 });
        }
      }

      // 4. Check if already member
      if (Array.isArray(team.members) && team.members.some((m: any) => {
        const mId = typeof m === "string" ? m.toLowerCase() : (m.studentId || m.id || "").toLowerCase();
        return mId === studentPartId.toLowerCase() || mId === student.id.toLowerCase();
      })) {
        return NextResponse.json({
          error: `Participant ${student.name} is already a member of this team.`
        }, { status: 400 });
      }

      // 5. Check if already pending invitation
      const reqSnap = await getDocs(collection(db, "join_requests"));
      for (const d of reqSnap.docs) {
        const r = d.data();
        if (r.teamId === teamId && (r.status || "").toLowerCase() === "pending") {
          const rStudentId = (r.studentId || "").toLowerCase();
          const rStudentPartId = (r.studentParticipantId || "").toLowerCase();
          if (rStudentId === student.id.toLowerCase() || rStudentPartId === studentPartId.toLowerCase()) {
            return NextResponse.json({
              error: `An invitation has already been sent to ${student.name}.`
            }, { status: 400 });
          }
        }
      }

      const reqId = `req-${Date.now()}`;
      const newRequest = {
        id: reqId,
        symposiumId: "integra-2026",
        teamId: teamId,
        teamName: team.teamName || team.name || "Squad",
        missionId: targetEventId,
        eventId: targetEventId,
        leaderId: team.leaderId,
        leaderName: team.leaderName || "Team Leader",
        studentId: student.id,
        studentParticipantId: studentPartId,
        studentName: student.name || "Participant",
        type: "invitation",
        status: "pending",
        timestamp: new Date().toISOString()
      };

      await setDoc(doc(db, "join_requests", reqId), newRequest);

      return NextResponse.json({
        success: true,
        message: `Team invitation sent to ${student.name}!`,
        request: newRequest,
        student: {
          id: student.id,
          participantId: studentPartId,
          name: student.name,
          college: student.college,
          department: student.department
        }
      });
    }

    // ── 3. JOIN TEAM ──────────────────────────────────────────────────────────
    if (action === "join_team") {
      const { searchTarget, eventId, studentId } = body;

      if (!searchTarget || !studentId) {
        return NextResponse.json({ error: "searchTarget and studentId are required." }, { status: 400 });
      }

      const cleanSearch = String(searchTarget).trim().toLowerCase();

      // 1. Find candidate student
      const student = await findParticipantInFirestore(studentId);
      if (!student) {
        return NextResponse.json({ error: "Participant not found." }, { status: 404 });
      }
      const studentPartId = student.participantId || student.id;

      // 2. Find target team
      const teamsSnap = await getDocs(collection(db, "teams"));
      const allTeams: any[] = [];
      teamsSnap.forEach(d => allTeams.push({ id: d.id, ...d.data() }));

      const team = allTeams.find(t => {
        const matchId = (t.id || "").toLowerCase().trim() === cleanSearch;
        const matchName = (t.teamName || t.name || "").toLowerCase().trim() === cleanSearch;
        const matchLeaderId = (t.leaderId || "").toLowerCase().trim() === cleanSearch;
        const matchCode = (t.code || "").toLowerCase().trim() === cleanSearch;

        const matchesQuery = matchId || matchName || matchLeaderId || matchCode;
        if (!matchesQuery) return false;

        if (!eventId) return true;
        const tEvent = (t.missionId || t.eventId || "").toLowerCase();
        return tEvent === eventId.toLowerCase();
      });

      if (!team) {
        return NextResponse.json({
          error: "Team not found for this event. Please verify the Team ID, Team Name, or Leader Participant ID."
        }, { status: 404 });
      }

      // 3. Check if already member
      if (Array.isArray(team.members) && team.members.some((m: any) => {
        const mId = typeof m === "string" ? m.toLowerCase() : (m.studentId || m.id || "").toLowerCase();
        return mId === studentPartId.toLowerCase() || mId === student.id.toLowerCase();
      })) {
        return NextResponse.json({ error: "You are already a member of this team." }, { status: 400 });
      }

      // 4. Check College & Department
      if (team.college && student.college) {
        const tCol = normalizeCollege(team.college);
        const sCol = normalizeCollege(student.college);
        if (tCol && sCol && tCol !== sCol && !team.college.toLowerCase().includes(student.college.toLowerCase()) && !student.college.toLowerCase().includes(team.college.toLowerCase())) {
          return NextResponse.json({
            error: `Team restriction: All team members must belong to the same college (${team.college}).`
          }, { status: 400 });
        }
      }

      if (team.department && student.department) {
        const tDept = normalizeDept(team.department);
        const sDept = normalizeDept(student.department);
        if (tDept && sDept && tDept !== sDept && !team.department.toLowerCase().includes(student.department.toLowerCase()) && !student.department.toLowerCase().includes(team.department.toLowerCase())) {
          return NextResponse.json({
            error: `Team restriction: All team members must belong to the same department (${team.department}).`
          }, { status: 400 });
        }
      }

      // 5. Check if already requested
      const reqSnap = await getDocs(collection(db, "join_requests"));
      for (const d of reqSnap.docs) {
        const r = d.data();
        if (r.teamId === team.id && (r.status || "").toLowerCase() === "pending") {
          const rStudentId = (r.studentId || "").toLowerCase();
          const rStudentPartId = (r.studentParticipantId || "").toLowerCase();
          if (rStudentId === student.id.toLowerCase() || rStudentPartId === studentPartId.toLowerCase()) {
            return NextResponse.json({
              error: "You have already sent a join request to this team."
            }, { status: 400 });
          }
        }
      }

      const targetEventId = team.missionId || team.eventId || eventId;
      const reqId = `req-${Date.now()}`;
      const newRequest = {
        id: reqId,
        symposiumId: "integra-2026",
        teamId: team.id,
        teamName: team.teamName || team.name || "Squad",
        missionId: targetEventId,
        eventId: targetEventId,
        leaderId: team.leaderId,
        leaderName: team.leaderName || "Team Leader",
        studentId: student.id,
        studentParticipantId: studentPartId,
        studentName: student.name || "Participant",
        type: "join_request",
        status: "pending",
        timestamp: new Date().toISOString()
      };

      await setDoc(doc(db, "join_requests", reqId), newRequest);

      return NextResponse.json({
        success: true,
        message: "Join request sent to team leader!",
        request: newRequest,
        team: {
          id: team.id,
          teamName: team.teamName || team.name,
          leaderName: team.leaderName
        }
      });
    }

    // ── 4. RESPOND REQUEST ────────────────────────────────────────────────────
    if (action === "respond_request") {
      const { requestId, accept } = body;

      if (!requestId) {
        return NextResponse.json({ error: "requestId is required." }, { status: 400 });
      }

      const reqSnap = await getDoc(doc(db, "join_requests", requestId));
      if (!reqSnap.exists()) {
        return NextResponse.json({ error: "Request not found." }, { status: 404 });
      }
      const reqData = reqSnap.data() as any;

      const newStatus = accept ? "accepted" : "rejected";

      if (accept) {
        const teamSnap = await getDoc(doc(db, "teams", reqData.teamId));
        if (!teamSnap.exists()) {
          return NextResponse.json({ error: "Team no longer exists." }, { status: 404 });
        }
        const teamData = teamSnap.data() as any;

        const student = await findParticipantInFirestore(reqData.studentParticipantId || reqData.studentId);
        const studentPartId = student?.participantId || reqData.studentParticipantId || reqData.studentId;
        const studentName = student?.name || reqData.studentName || "Member";

        const currentMembers = Array.isArray(teamData.members) ? [...teamData.members] : [];
        const alreadyInTeam = currentMembers.some((m: any) => {
          const mId = typeof m === "string" ? m.toLowerCase() : (m.studentId || m.id || "").toLowerCase();
          return mId === studentPartId.toLowerCase();
        });

        if (!alreadyInTeam) {
          currentMembers.push({
            studentId: studentPartId,
            studentName: studentName,
            joinedAt: new Date().toISOString()
          });

          await updateDoc(doc(db, "teams", reqData.teamId), {
            members: currentMembers,
            status: currentMembers.length > 1 ? "Complete" : "Waiting for Members",
            updatedAt: new Date().toISOString()
          });
        }

        // Auto-enroll student into registeredEvents
        const targetEventId = teamData.missionId || teamData.eventId || reqData.missionId || reqData.eventId;
        if (student && targetEventId) {
          const userEvents = Array.isArray(student.registeredEvents) ? [...student.registeredEvents] : [];
          if (!userEvents.includes(targetEventId)) {
            userEvents.push(targetEventId);
            const userUpdate = { registeredEvents: userEvents, updatedAt: new Date().toISOString() };
            await setDoc(doc(db, "participants", student.id), userUpdate, { merge: true });
            await setDoc(doc(db, "users", student.id), userUpdate, { merge: true });
          }
        }
      }

      await updateDoc(doc(db, "join_requests", requestId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        message: accept ? "Member successfully added to team!" : "Request rejected.",
        status: newStatus
      });
    }

    return NextResponse.json({ error: `Unknown action '${action}'` }, { status: 400 });
  } catch (err: any) {
    console.error("Error in POST /api/teams:", err);
    return NextResponse.json({ error: err.message || "Team action failed" }, { status: 500 });
  }
}

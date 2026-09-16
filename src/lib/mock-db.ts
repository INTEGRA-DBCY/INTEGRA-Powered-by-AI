import { hashPassword, hashPasswordSync, sanitizeUser, sanitizeUsers } from "./security";
// Local Storage & Firebase Sync Database for Symposium Management Platform
// Multi-Year / Multi-Symposium Architecture with Data Isolation, Offline Payments, Slot Clash Prevention, Food Tokens, and Activity Logging.

import { firebaseService } from "./firebase-service";
import { validateFullName, validateEmail, validateDepartment, validateCollege } from "./validation";

export interface Venue {
  id: string;
  name: string;
  capacity: number;
  location: string;
  assignedEventId?: string;
  coordinator?: string;
}

export interface ScheduleSlot {
  id: string;
  name: string; // e.g. "SLOT 1", "SLOT 2", "SLOT 3"
  startTime: string; // e.g. "10:00 AM"
  endTime: string; // e.g. "10:50 AM"
  description?: string;
}

export interface EvaluationCriterion {
  id: string;
  name: string; // e.g. "Prompt Quality", "Innovation", "Creativity"
  maxScore: number; // e.g. 20
}

export interface Symposium {
  id: string; // e.g. "integra-2026", "integra-2027"
  name: string; // e.g. "INTEGRA"
  theme?: string; // e.g. "Powered by AI"
  tagline?: string; // e.g. "INTER-COLLEGE TECHNICAL SYMPOSIUM"
  year: string; // e.g. "2026"
  academicYear?: string; // e.g. "AY26-27"
  logoUrl?: string;
  faviconUrl?: string;
  bannerUrl?: string;
  description?: string;
  regFee: number; // e.g. 150
  registrationOpen: boolean; // default false
  regStartDate?: string;
  regEndDate?: string;
  symposiumDate: string; // e.g. "September 11, 2026"
  venue: string; // e.g. "Don Bosco College (Co-Ed), Yelagiri Hills"
  contactEmail: string;
  contactPhone: string;
  primaryColor?: string;
  secondaryColor?: string;
  maxParticipants: number;
  maxEventsPerParticipant: number;
  status: "current" | "upcoming" | "archived";
  venues: Venue[];
  scheduleSlots: ScheduleSlot[];
  resultsPublished?: boolean;
  // Refreshment Stall & ₹20 Token System Configuration
  refreshmentEnabled?: boolean;
  refreshmentAllowance?: number; // e.g. 20 (configurable, not hard-coded)
  refreshmentValidFrom?: string; // e.g. "09:00 AM"
  refreshmentValidUntil?: string; // e.g. "05:00 PM"
  refreshmentMaxClaimPerTx?: number; // e.g. 20
}

export interface Mission {
  id: string;
  symposiumId?: string;
  name: string;
  subtitle?: string;
  category: string;
  domain?: string;
  description?: string;
  objective?: string;
  type: "Individual" | "Team";
  minTeamSize: number;
  maxTeamSize: number;
  maxCapacity: number; // Max individual participants
  maxTeams: number; // Max teams
  regStartDate?: string;
  regEndDate?: string;
  status: "Open" | "Closed";
  eventDate?: string;
  slot?: string; // e.g. "SLOT 1", "SLOT 2", "SLOT 3"
  startTime?: string; // e.g. "10:00 AM"
  endTime?: string; // e.g. "10:50 AM"
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  duration: string;
  venue: string;
  coordinator: string;
  phone: string;
  rules: string[];
  criteria: string[];
  evaluationCriteria?: EvaluationCriterion[];
  assignedJudgeId?: string;
  assignedJudgeName?: string;
  assignedJudgeIds?: string[];
  assignedJudgeNames?: string[];
  internetAllowed?: boolean;
  aiToolsAllowed?: boolean;
  prizeDetails?: string;
  logoUrl?: string;
}

export interface College {
  id: string;
  name: string;
  code: string;
  points: number;
  hasShifts?: boolean;
  shifts?: string[];
}

export type UserRole = "student" | "admin" | "judge" | "volunteer" | "coordinator" | "food_coordinator" | "stall_operator" | "super_admin";

export interface User {
  id: string;
  symposiumId?: string;
  email: string;
  password?: string;
  name: string;
  role: "student" | "admin" | "judge" | "volunteer" | "coordinator" | "food_coordinator" | "stall_operator" | "super_admin";
  roles?: UserRole[]; // Multiple assigned roles granted by Admin/SuperAdmin
  assignedStallId?: string;
  assignedStallName?: string;
  college?: string;
  shift?: string; // e.g. "Shift I" | "Shift II" | "Regular"
  department?: string;
  year?: string;
  phone?: string;
  gender?: string;
  participantId?: string; // e.g. INT26-0001
  registrationId?: string; // e.g. INTEGRA-2026-0001
  username?: string;
  passportNumber?: string;
  photoUrl?: string;
  registeredEvents?: string[];
  attendedEvents?: string[]; // Event IDs
  registrationStatus?: "Registered" | "Cancelled";
  paymentStatus?: "Pending" | "Verified" | "Rejected";
  paymentRejectionReason?: string;
  isFirstLogin?: boolean;
  paymentDetails?: {
    txId: string;
    date: string;
    mode?: "Cash" | "Bank Transfer" | "UPI Transfer" | "Other Offline Payment";
    verifiedBy?: string;
    remarks?: string;
  };
  checkInStatus?: {
    checkedIn: boolean;
    time?: string;
    scannedBy?: string;
    eventAttendance?: Record<string, { present: boolean; time: string; venue: string; volunteerId: string }>;
  };
  foodStatus?: {
    served: boolean;
    servedTime?: string;
    loggedBy?: string;
  };
  volunteerDuty?: {
    station: "event_entry" | "food_distributor" | "Event Entry" | "Food Distributor" | "Registration" | "Event Venue Pass Verification" | "Food Counters" | "Helpdesk" | "Gate Entry" | "Food Counter" | "Event Venue" | "Registration Desk" | "Helpdesk & Logistics";
    volunteerType?: "event_entry" | "food_distributor";
    eventId?: string; // Event ID if Event Entry
    eventName?: string;
    venueName?: string;
    shift?: "Full Day" | "Morning Shift (08:30 AM - 01:30 PM)" | "Afternoon Shift (01:30 PM - 05:30 PM)";
    assignedBy?: string;
    assignedAt?: string;
    contactNumber?: string;
    status?: "Active" | "On Duty" | "Relieved";
    notes?: string;
  };
  xp?: number;
  achievements?: string[];
  badges?: string[];
}

export interface VolunteerDuty {
  station: "event_entry" | "food_distributor" | "Event Entry" | "Food Distributor" | "Registration" | "Event Venue Pass Verification" | "Food Counters" | "Helpdesk" | "Gate Entry" | "Food Counter" | "Event Venue" | "Registration Desk" | "Helpdesk & Logistics";
  volunteerType?: "event_entry" | "food_distributor";
  eventId?: string;
  eventName?: string;
  venueName?: string;
  shift?: "Full Day" | "Morning Shift (08:30 AM - 01:30 PM)" | "Afternoon Shift (01:30 PM - 05:30 PM)";
  assignedBy?: string;
  assignedAt?: string;
  contactNumber?: string;
  status?: "Active" | "On Duty" | "Relieved";
  notes?: string;
}

export interface Team {
  id: string; // e.g. TEAM-INT-001
  symposiumId?: string;
  eventId?: string;
  eventName?: string;
  missionId?: string;
  missionName?: string;
  name?: string;
  teamName?: string;
  leaderId: string; // Participant ID
  leaderName: string;
  leaderEmail?: string;
  college?: string;
  department?: string;
  code?: string;
  members: any[];
  status?: "Draft" | "Waiting for Members" | "Complete" | "Confirmed" | "Locked" | "Cancelled" | string;
  createdAt?: string;
}

export interface TeamJoinRequest {
  id: string;
  symposiumId?: string;
  teamId: string;
  teamName: string;
  leaderId?: string;
  leaderName?: string;
  eventId?: string;
  missionId?: string;
  senderId?: string;
  senderName?: string;
  studentId?: string;
  studentParticipantId?: string;
  studentName?: string;
  type?: "invitation" | "join_request" | string;
  status: "Pending" | "Accepted" | "Rejected" | "pending" | "accepted" | "rejected" | string;
  timestamp?: string;
}

export interface FoodToken {
  id: string;
  symposiumId: string;
  participantId: string;
  participantName?: string;
  studentId?: string;
  studentName?: string;
  tokenNumber?: string;
  mealType?: string;
  foodType?: string;
  date?: string;
  status: "Active" | "Used" | "Unclaimed" | "Claimed" | string;
  issuedAt?: string;
  usedTime?: string;
  claimedAt?: string;
  scannedBy?: string;
}

// ── REFRESHMENT STALL & ₹20 FOOD TOKEN SYSTEM ─────────────────────────────
export interface RefreshmentItem {
  id: string;
  name: string;
  price: number;
  category?: string;
  availableQty?: number;
  available?: boolean;
  status?: "AVAILABLE" | "OUT_OF_STOCK";
}

export interface RefreshmentStall {
  id: string;
  symposiumId: string;
  name: string;
  location: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  operatorUsername?: string; // e.g. stall.snacks@integra.in or snacks_operator
  operatorEmail?: string;
  operatorPassword?: string; // e.g. snacks123
  assignedOperatorId?: string;
  assignedOperatorName?: string;
  status: "ACTIVE" | "INACTIVE";
  pricingMode: "MANUAL" | "ITEM_BASED";
  items?: RefreshmentItem[];
  totalClaimsCount: number;
  totalAmountClaimed: number;
  createdAt?: string;
}

export interface RefreshmentTransaction {
  id: string; // e.g. RTXN-0001
  symposiumId: string;
  tokenId?: string; // e.g. RT-INT26-0001
  participantId: string;
  participantName: string;
  studentName?: string;
  participantCollege?: string;
  stallId: string;
  stallName: string;
  operatorId?: string;
  operatorName?: string;
  amount: number;
  totalAmount?: number;
  itemPrice?: number;
  quantity?: number;
  previousBalance?: number;
  remainingBalance?: number;
  itemId?: string;
  itemName?: string;
  itemDescription?: string;
  date?: string;
  time?: string;
  timestamp: string;
  status: "COMPLETED" | "REVERSED" | string;
  reversalReason?: string;
  reversedAt?: string;
  reversedBy?: string;
  servedBy?: string;
  isManualAdjustment?: boolean;
  adjustmentReason?: string;
}

export interface RefreshmentToken {
  id: string; // e.g. RT-INT26-0001
  symposiumId: string;
  participantId: string;
  participantName: string;
  studentId?: string;
  studentName?: string;
  participantCollege?: string;
  totalAllowance: number; // e.g. 20 (configurable)
  initialAllowance?: number;
  usedAmount: number;
  totalClaimed?: number;
  remainingAmount: number;
  balance?: number;
  status: "AVAILABLE" | "PARTIALLY_USED" | "FULLY_USED" | "BLOCKED" | "EPointsIRED" | "Active" | string;
  createdAt?: string;
  lastClaimAt?: string;
  lastClaimedAt?: string;
  userId?: string;
  lastUsed?: string;
}

export interface ActivityLog {
  id: string;
  symposiumId: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface SystemSettings {
  id: string;
  eventTitle: string;
  eventYear: string;
  eventDateText: string;
  countdownTarget: string;
  organizerDept: string;
  hostCollege: string;
  hostLocation: string;
  tagline: string;
  feedbackEnabled: boolean;
  scoreboardEnabled: boolean;
  maxEventsSelection: number;
  heroDescription?: string;
  aboutText?: string;
  contactEmail?: string;
  contactPhone?: string;
  mapCoordinates?: string;
  feedbackQuestions?: string[];
  // Refreshment configuration
  refreshmentEnabled?: boolean;
  refreshmentAllowance?: number; // e.g. 20 (configurable)
  refreshmentValidFrom?: string;
  refreshmentValidUntil?: string;
  refreshmentMaxClaimPerTx?: number;
  // Dynamic Certificate Template Configuration
  collegeLogoUrl?: string;
  deptLogoUrl?: string;
  symposiumLogoUrl?: string;
  collegeName?: string;
  collegeTagline?: string;
  deptName?: string;
  deptTagline?: string;
  eventCoordinatorName?: string;
  eventCoordinatorRole?: string;
  hodName?: string;
  hodRole?: string;
  principalName?: string;
  principalRole?: string;
}

export interface GalleryItem {
  id: string;
  url: string;
  tag: string;
}

export interface FAQItem {
  id: string;
  q: string;
  a: string;
}

export interface Announcement {
  id: string;
  symposiumId?: string;
  title: string;
  content: string;
  timestamp: string;
  category: "General" | "Mission" | "Schedule" | "Emergency";
}

export interface Score {
  id: string;
  symposiumId?: string;
  missionId: string;
  studentId: string; // Participant ID or User ID or Team ID
  studentName: string;
  collegeName: string;
  criteriaScores: Record<string, number>;
  totalScore: number;
  remarks: string;
  submittedBy: string;
  timestamp: string;
  isLocked?: boolean;
}

export interface Certificate {
  id: string;
  symposiumId?: string;
  type: "Participation" | "Winner" | "Runner-up" | "Volunteer" | "Coordinator" | "Judge";
  recipientName: string;
  recipientId: string;
  collegeName?: string;
  departmentName?: string;
  yearOfStudy?: string;
  missionName?: string;
  awardText?: string;
  signatureUrl?: string;
  hash: string;
  dateGenerated: string;
  venue?: string;
  collegeLogoUrl?: string;
  deptLogoUrl?: string;
  symposiumLogoUrl?: string;
  symposiumName?: string;
  symposiumTheme?: string;
  symposiumSubtitle?: string;
  eventCoordinatorName?: string;
  eventCoordinatorRole?: string;
  hodName?: string;
  hodRole?: string;
  principalName?: string;
  principalRole?: string;
}

// -------------------------------------------------------------
// DEFAULT SEED DATA
// -------------------------------------------------------------

const DEFAULT_SYMPOSIUM: Symposium = {
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
  contactEmail: "integra@dbcyelagiri.edu.in",
  contactPhone: "+91 9363439807",
  primaryColor: "#0284C7",
  secondaryColor: "#7C3AED",
  maxParticipants: 500,
  maxEventsPerParticipant: 3,
  status: "current",
  resultsPublished: false,
  venues: [
    { id: "lab-a", name: "Lab A", capacity: 60, location: "PG Block - 1st Floor", assignedEventId: "prompt-master" },
    { id: "lab-b", name: "Lab B", capacity: 50, location: "PG Block - 1st Floor", assignedEventId: "vision-ai" },
    { id: "lab-c", name: "Lab C", capacity: 60, location: "Main Block - Ground Floor", assignedEventId: "cyber-quest" },
    { id: "conf-hall", name: "Conference Hall", capacity: 120, location: "Admin Block", assignedEventId: "ai-quiz-arena" },
    { id: "jubilee-hall", name: "Jubilee Hall", capacity: 400, location: "Main Auditorium", assignedEventId: "fusion-beats" },
    { id: "exam-hall", name: "Exam Hall", capacity: 150, location: "East Wing", assignedEventId: "hack-ai" },
    { id: "class-1", name: "Classroom 1", capacity: 40, location: "CS Department", assignedEventId: "creative-studio" },
    { id: "class-2", name: "Classroom 2", capacity: 40, location: "CS Department", assignedEventId: "startup-lab" },
    { id: "class-3", name: "Classroom 3", capacity: 40, location: "CS Department" }
  ],
  scheduleSlots: [
    { id: "slot-1", name: "SLOT 1", startTime: "10:00 AM", endTime: "10:50 AM", description: "Morning Technical Wave 1" },
    { id: "slot-2", name: "SLOT 2", startTime: "11:00 AM", endTime: "11:50 AM", description: "Morning Technical Wave 2" },
    { id: "slot-3", name: "SLOT 3", startTime: "12:00 PM", endTime: "12:50 PM", description: "Midday Challenge Wave 3" },
    { id: "slot-lunch", name: "LUNCH", startTime: "01:00 PM", endTime: "02:00 PM", description: "Networking & Dining" },
    { id: "slot-cultural", name: "CULTURAL", startTime: "02:00 PM", endTime: "03:15 PM", description: "Fusion Beats & Stage Events" },
    { id: "slot-valedictory", name: "VALEDICTORY", startTime: "03:15 PM", endTime: "03:50 PM", description: "Awards Ceremony" }
  ]
};

export const DEFAULT_MISSIONS: Mission[] = [
  {
    id: "event-ai-quiz-arena",
    symposiumId: "integra-2026",
    name: "AI Quiz Arena",
    category: "Technical",
    type: "Team",
    minTeamSize: 2,
    maxTeamSize: 2,
    maxCapacity: 60,
    maxTeams: 30,
    status: "Open",
    eventDate: "2026-09-11",
    slot: "Slot 1",
    startTime: "09:30 AM",
    endTime: "10:30 AM",
    difficulty: "Medium",
    duration: "60 Mins",
    venue: "Jubilee Hall",
    coordinator: "Dr. NAVEEN A",
    phone: "+91 9176404299",
    rules: [
      "Event Duration: 60 Minutes",
      "Participation: Team – 2 Participant per Team",
      "The quiz will be conducted using a screen-based digital quiz based on AI relevant questions.",
      "The competition consists of four progressive levels.",
      "Each question has a 30-second time limit.",
      "Participants may discuss the question only within their team during the allotted time.",
      "Once an answer is submitted, it cannot be changed.",
      "A chosen slot cannot be selected again.",
      "Mobile phones, smartwatches, internet searches, and external assistance are strictly prohibited.",
      "A tie-breaker round may be conducted in the event of a tie in scores.",
      "The decision of the Judges / Event Coordinator shall be final and binding."
    ],
    criteria: ["Accuracy", "Speed", "AI Knowledge"],
    logoUrl: "/events/ai-quiz-arena.jpg"
  },
  {
    id: "event-vision-ai",
    symposiumId: "integra-2026",
    name: "Vision AI",
    category: "Technical",
    type: "Team",
    minTeamSize: 2,
    maxTeamSize: 2,
    maxCapacity: 40,
    maxTeams: 20,
    status: "Open",
    eventDate: "2026-09-11",
    slot: "Slot 1",
    startTime: "09:30 AM",
    endTime: "10:30 AM",
    difficulty: "Hard",
    duration: "60 Mins",
    venue: "IoT AI Lab",
    coordinator: "Dr. IMMANUVEL S",
    phone: "+91 8072895697",
    rules: [
      "Event Duration: 60 Minutes",
      "Participation: Team – 2 Participant per Team",
      "The event will be conducted as a screen-based visual identification challenge.",
      "Images will be displayed on the screen for a specified duration.",
      "Each question has a 15-second time limit.",
      "Participants must observe, analyse, and identify the displayed visual.",
      "Answers must be based only on the visual presented on the screen.",
      "Once an answer is submitted, no changes will be permitted.",
      "Participants must not photograph, record, search, or externally identify the displayed images.",
      "Mobile phones, smartwatches, internet searches, and AI tools are strictly prohibited.",
      "Evaluation will be based primarily on accuracy and response time.",
      "A tie-breaker visual challenge may be conducted if required.",
      "The decision of the Judges / Event Coordinator shall be final and binding."
    ],
    criteria: ["Accuracy", "Response Time", "Visual Observation"],
    logoUrl: "/events/vision-ai.png"
  },
  {
    id: "event-prompt-master",
    symposiumId: "integra-2026",
    name: "Prompt Master",
    category: "Technical",
    type: "Individual",
    minTeamSize: 1,
    maxTeamSize: 1,
    maxCapacity: 50,
    maxTeams: 50,
    status: "Open",
    eventDate: "2026-09-11",
    slot: "Slot 2",
    startTime: "11:00 AM",
    endTime: "11:15 AM",
    difficulty: "Easy",
    duration: "15 Mins",
    venue: "Computer Lab 1",
    coordinator: "Mr. Naveen Kumar",
    phone: "+91 9789456123",
    rules: [
      "Event Duration: 15 Minutes",
      "Participation: Individual – 1 Participant per Team",
      "Participants will be given a real-world problem statement by the organizers.",
      "Participants must develop an effective AI prompt-based solution for the given problem.",
      "The prompt must be created during the event.",
      "Participants must follow the specified format and submission method.",
      "Internet access or AI assistance will not be allowed, pre-prepared prompts or copied solutions are not permitted.",
      "Evaluation will consider clarity, creativity, relevance, effectiveness, and quality of the resulting solution.",
      "Participants must complete the task within the allotted time.",
      "The decision of the Judges / Event Coordinator shall be final and binding."
    ],
    criteria: ["Clarity", "Creativity", "Relevance & Quality"],
    logoUrl: "/events/prompt-master.jpg"
  },
  {
    id: "event-startup-lab",
    symposiumId: "integra-2026",
    name: "Startup Lab",
    category: "Non-Technical",
    type: "Individual",
    minTeamSize: 1,
    maxTeamSize: 1,
    maxCapacity: 45,
    maxTeams: 45,
    status: "Open",
    eventDate: "2026-09-11",
    slot: "Slot 2",
    startTime: "11:00 AM",
    endTime: "11:45 AM",
    difficulty: "Medium",
    duration: "45 Mins",
    venue: "Seminar Hall B",
    coordinator: "Dr. RADHAKRISHNAN",
    phone: "+91 9443322110",
    rules: [
      "Event Duration: 45 Minutes",
      "Participation: Individual – 1 Participant per Team",
      "Participants must present an innovative startup idea addressing a real-world problem.",
      "Participants must prepare and display their concept using chart work as instructed by the organizers.",
      "The presentation should clearly communicate the problem, proposed solution, innovation, target users, and feasibility.",
      "Participants must bring the required materials for preparing and displaying their idea.",
      "Judges may ask questions regarding the proposed idea.",
      "Participants must answer the judges' questions within the allotted presentation time.",
      "Evaluation will consider innovation, feasibility, creativity, social/business impact, and presentation.",
      "The presentation must be completed within the specified time limit.",
      "The decision of the Judges / Event Coordinator shall be final and binding."
    ],
    criteria: ["Innovation", "Feasibility", "Presentation"],
    logoUrl: "/events/startup-lab.jpg"
  },
  {
    id: "event-creative-studio",
    symposiumId: "integra-2026",
    name: "Creative Studio",
    category: "Non-Technical",
    type: "Individual",
    minTeamSize: 1,
    maxTeamSize: 1,
    maxCapacity: 50,
    maxTeams: 50,
    status: "Open",
    eventDate: "2026-09-11",
    slot: "Slot 3",
    startTime: "12:15 PM",
    endTime: "01:00 PM",
    difficulty: "Easy",
    duration: "45 Mins",
    venue: "Design Lab 2",
    coordinator: "Miss. POOVARASI",
    phone: "+91 98765 12345",
    rules: [
      "Event Duration: 45 Minutes",
      "Participation: Individual – 1 Participant per Team",
      "Participants will be provided with a topic or theme by the organizers.",
      "Participants must create a poster or flyer using AI tools based on the given topic.",
      "Participants must bring the required device and accessories for the event.",
      "The design must be created within the allotted time.",
      "Pre-designed or previously prepared materials must not be submitted as the primary work.",
      "Participants must ensure that the final design is relevant, original, and appropriate.",
      "Evaluation will consider creativity, visual appeal, originality, relevance, composition, and effective use of AI.",
      "The final work must be submitted in the format specified by the organizers.",
      "The decision of the Judges / Event Coordinator shall be final and binding."
    ],
    criteria: ["Creativity", "Visual Appeal", "Originality & AI Use"],
    logoUrl: "/events/creative-studio.jpg"
  },
  {
    id: "event-ai-framecraft",
    symposiumId: "integra-2026",
    name: "AI FRAMECRAFT",
    category: "Non-Technical",
    type: "Team",
    minTeamSize: 2,
    maxTeamSize: 2,
    maxCapacity: 40,
    maxTeams: 20,
    status: "Open",
    eventDate: "2026-09-11",
    slot: "Slot 3",
    startTime: "12:15 PM",
    endTime: "02:15 PM",
    difficulty: "Medium",
    duration: "120 Mins",
    venue: "Media Studio 1",
    coordinator: "Dr. RADHAKRISHNAN",
    phone: "+91 91234 56789",
    rules: [
      "Event Duration: 120 Minutes",
      "Participation: Team – 2 Participant per Team",
      "Participants will receive a topic or theme from the organizers.",
      "Participants must create a video using AI tools based on the given topic.",
      "Participants must bring their own required device and accessories.",
      "The video must be created and submitted within the allotted time.",
      "The submission must comply with the specified duration and format.",
      "Participants must use only content that is original, permitted, or appropriately licensed.",
      "Evaluation will consider concept, creativity, storytelling, visual quality, editing, relevance, and effective use of AI.",
      "Late submissions will not be considered.",
      "The decision of the Judges / Event Coordinator shall be final and binding."
    ],
    criteria: ["Storytelling", "Visual Quality", "AI Video Synthesis"],
    logoUrl: "/events/ai-framecraft.jpg"
  },
  {
    id: "event-rhythm-ai",
    symposiumId: "integra-2026",
    name: "Rhythm AI",
    category: "Non-Technical",
    type: "Team",
    minTeamSize: 2,
    maxTeamSize: 2,
    maxCapacity: 40,
    maxTeams: 20,
    status: "Open",
    eventDate: "2026-09-11",
    slot: "Slot 4",
    startTime: "02:30 PM",
    endTime: "03:15 PM",
    difficulty: "Easy",
    duration: "45 Mins",
    venue: "Auditorium Annex",
    coordinator: "Mr. KAMALESHWAR",
    phone: "+91 99887 76655",
    rules: [
      "Event Duration: 45 Minutes",
      "Participation: Team – 2 Participant per Team",
      "Participants will be given a theme or topic by the organizers.",
      "Participants must compose an original musical piece using AI tools.",
      "The composition must be created within the allotted time.",
      "Participants must bring the required device and accessories.",
      "The final composition must comply with the specified duration and format.",
      "Participants must not submit pre-existing compositions as their original event entry.",
      "Evaluation will consider creativity, originality, composition, thematic relevance, presentation, and effective use of AI.",
      "Inappropriate or offensive content will result in disqualification.",
      "The decision of the Judges / Event Coordinator shall be final and binding."
    ],
    criteria: ["Originality", "Composition", "Effective AI Use"],
    logoUrl: "/events/rhythm-ai.jpg"
  },
  {
    id: "event-integra-vibe",
    symposiumId: "integra-2026",
    name: "INTEGRA Vibe",
    category: "Cultural",
    type: "Team",
    minTeamSize: 1,
    maxTeamSize: 7,
    maxCapacity: 70,
    maxTeams: 10,
    status: "Open",
    eventDate: "2026-09-11",
    slot: "Cultural",
    startTime: "03:15 PM",
    endTime: "04:15 PM",
    difficulty: "Medium",
    duration: "60 Mins",
    venue: "Main Stage Open Amphitheatre",
    coordinator: "Mrs. VASANTHARANI",
    phone: "+91 97654 32109",
    rules: [
      "Event Duration: 60 Minutes",
      "Participation: Team – 7 Participant per Team",
      "INTEGRA VIBE is a cultural dance performance event.",
      "Participants may perform as a team, according to the specified participation format.",
      "Each team shall be given a maximum of 3 minutes to complete their performance.",
      "Participants are responsible for their music, costumes, and required performance materials.",
      "The performance should demonstrate creativity, coordination, expression, energy, and stage presence.",
      "Music and performance content must be appropriate for a college cultural event.",
      "Flammable materials, fire, fireworks, and hazardous materials are strictly prohibited.",
      "No content shall be used that is against the Government of Tamil Nadu/India.",
      "Political slogans, words, symbols, or political messages are strictly prohibited.",
      "Any special props or equipment must be approved by the organizers before the performance.",
      "Evaluation will consider performance quality, synchronization, creativity, expression, and overall presentation.",
      "Topics / Themes: (1) Digital Life vs. Real Life, (2) The Future of Humanity with Technology, (3) A Dance Against Mobile Addiction.",
      "The decision of the Judges / Event Coordinator shall be final and binding."
    ],
    criteria: ["Performance Quality", "Synchronization", "Creativity & Theme"],
    logoUrl: "/events/integra-vibe.jpg"
  }
];

const DEFAULT_COLLEGES: College[] = [
  { id: "vit", name: "Vellore Institute of Technology", code: "VIT", points: 0, hasShifts: false },
  { id: "srm", name: "SRM Institute of Science & Tech", code: "SRM", points: 0, hasShifts: false },
  { id: "loyo", name: "Loyola College, Chennai", code: "LOYOLA", points: 0, hasShifts: true, shifts: ["Shift I", "Shift II"] },
  { id: "sac", name: "Sacred Heart College, Tirupattur", code: "SHC", points: 0, hasShifts: true, shifts: ["Shift I", "Shift II"] },
  { id: "dbc", name: "Don Bosco College, Yelagiri Hills", code: "DBC", points: 0, hasShifts: true, shifts: ["Shift I", "Shift II"] }
];

const DEFAULT_USERS: User[] = [
  {
    id: "user-superadmin",
    symposiumId: "integra-2026",
    email: "integra@dbcyelagiri.edu.in",
    name: "System Controller",
    role: "super_admin",
    department: "Administration",
    phone: "+91 98765 00000"
  },
  {
    id: "user-admin-2367",
    symposiumId: "integra-2026",
    email: "naveen@dbcyelagiri.edu.in",
    name: "Dr. NAVEEN A",
    role: "admin",
    department: "Computer Science",
    phone: "+91 9176404299"
  },
  {
    id: "user-admin-5426",
    symposiumId: "integra-2026",
    email: "immanuvel@dbcyelagiri.edu.in",
    name: "Dr. IMMANUVEL S",
    role: "admin",
    department: "Computer Science",
    phone: "+91 98765 43210"
  },
  {
    id: "user-admin-8425",
    symposiumId: "integra-2026",
    email: "danielabishek@dbcyelagiri.edu.in",
    name: "Mr. DANIEL ABISHEK B",
    role: "admin",
    department: "Computer Science",
    phone: "+91 90809 28437"
  },
  {
    id: "user-coord-radhakrishnan",
    symposiumId: "integra-2026",
    email: "radhakrishnan@dbcyelagiri.edu.in",
    name: "Dr. RADHAKRISHNAN",
    role: "coordinator",
    department: "Computer Science",
    phone: "+91 98765 11111"
  },
  {
    id: "user-coord-naveenkumar",
    symposiumId: "integra-2026",
    email: "naveenkumar@dbcyelagiri.edu.in",
    name: "Mr. Naveen Kumar",
    role: "coordinator",
    department: "Computer Science",
    phone: "+91 98765 22222"
  },
  {
    id: "user-coord-poovarasi",
    symposiumId: "integra-2026",
    email: "poovarasi@dbcyelagiri.edu.in",
    name: "Miss. POOVARASI",
    role: "coordinator",
    department: "Computer Science",
    phone: "+91 98765 33333"
  },
  {
    id: "user-coord-kamaleshwar",
    symposiumId: "integra-2026",
    email: "kamaleshwar@dbcyelagiri.edu.in",
    name: "Mr. KAMALESHWAR",
    role: "coordinator",
    department: "Computer Science",
    phone: "+91 98765 44444"
  },
  {
    id: "coordinator-1786910972866-qu04",
    symposiumId: "integra-2026",
    email: "vasantharani@dbcyelagiri.edu.in",
    name: "Mrs. VASANTHARANI",
    role: "coordinator",
    department: "Computer Science",
    phone: "+91 8678933014"
  }
];

export const DEFAULT_REFRESHMENT_STALLS: RefreshmentStall[] = [];

const DEFAULT_SETTINGS: SystemSettings = {
  id: "sys-settings",
  eventTitle: "INTEGRA",
  eventYear: "2026",
  eventDateText: "September 16, 2026",
  countdownTarget: "2026-09-16T09:00:00",
  organizerDept: "PG & Research Department of Computer Science",
  hostCollege: "Don Bosco College (Co-Ed)",
  hostLocation: "Yelagiri Hills",
  tagline: "INTER-COLLEGE TECHNICAL SYMPOSIUM",
  feedbackEnabled: false,
  scoreboardEnabled: true,
  maxEventsSelection: 3,
  heroDescription: "Step into the elite state-level inter-college technical competition and AI symposium organized by the PG & Research Dept. of Computer Science. Compete in high-stakes AI events, solve prompt challenges, code sprints, and win championship trophies!",
  aboutText: "INTEGRA is the premier annual state-level inter-college technical competition fest hosted by the PG & Research Department of Computer Science at Don Bosco College (Co-Ed), Yelagiri Hills.",
  contactEmail: "integra@dbcyelagiri.edu.in",
  contactPhone: "+91 9363439807",
  mapCoordinates: "12.5768° N, 78.6366° E",
  feedbackQuestions: [
    "Overall event organization?",
    "Quality of tech events and workspaces?",
    "Hospitality and dining coordination?",
    "Volunteer help and support services?"
  ],
  // Default Refreshment System Configuration
  refreshmentEnabled: true,
  refreshmentAllowance: 20, // Default ₹20 (configurable, not hard-coded)
  refreshmentValidFrom: "09:00 AM",
  refreshmentValidUntil: "05:00 PM",
  refreshmentMaxClaimPerTx: 20,
  // Default Certificate Template Branding
  collegeLogoUrl: "/college-logo.png",
  deptLogoUrl: "/dept-logo.png",
  symposiumLogoUrl: "/integra-logo.png",
  collegeName: "ABC ENGINEERING COLLEGE",
  collegeTagline: "Excellence Through Innovation",
  deptName: "DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING",
  deptTagline: "Innovate • Code • Elevate",
  eventCoordinatorName: "Prof. Event Coordinator",
  eventCoordinatorRole: "Event Coordinator",
  hodName: "Dr. Head of Department",
  hodRole: "Head of the Department",
  principalName: "Rev. Dr. Principal",
  principalRole: "Principal"
};


export const isMatchingSymposium = (itemSymposiumId?: string, targetSymposiumId?: string): boolean => {
  if (!itemSymposiumId || !targetSymposiumId) return true;
  const a = itemSymposiumId.toLowerCase().trim();
  const b = targetSymposiumId.toLowerCase().trim();
  if (a === b) return true;
  
  // Treat all variations of current INTEGRA editions (integra-2026, Integra-AI, integra-2027, integra, current) as matching
  const isIntegraA = a.startsWith("integra") || a === "integra" || a === "current";
  const isIntegraB = b.startsWith("integra") || b === "integra" || b === "current";
  if (isIntegraA && isIntegraB) return true;
  
  return false;
};

const setUsersSafe = (users: User[]) => {
  memoryStore.users = users;
};

// Database Initialization Helper

// ── 100% GOOGLE CLOUD FIRESTORE IN-MEMORY RUNTIME ENGINE ────────────────────
// ZERO LOCAL STORAGE RELIANCE FOR DATABASE ENTITIES
// ALL DATA IS SYNCHRONIZED DIRECTLY WITH GOOGLE CLOUD FIRESTORE

interface CloudDatabaseStore {
  users: User[];
  missions: Mission[];
  teams: Team[];
  joinRequests: any[];
  stalls: RefreshmentStall[];
  refreshmentTxns: RefreshmentTransaction[];
  refreshmentTokens: RefreshmentToken[];
  announcements: Announcement[];
  symposiums: Symposium[];
  scores: Score[];
  colleges: College[];
  settings: SystemSettings;
  activityLogs: ActivityLog[];
  gallery: any[];
  faqs: any[];
  certificates: Certificate[];
  foodTokens: FoodToken[];
  feedbacks: any[];
  activeSymposiumId: string;
  isInitialized: boolean;
  currentUser: User | null;
  deletedIds: Set<string>;
}

const memoryStore: CloudDatabaseStore = {
  users: [...DEFAULT_USERS],
  missions: [],
  teams: [],
  joinRequests: [],
  stalls: [...DEFAULT_REFRESHMENT_STALLS],
  refreshmentTxns: [],
  refreshmentTokens: [],
  announcements: [],
  symposiums: [DEFAULT_SYMPOSIUM],
  scores: [],
  colleges: [...DEFAULT_COLLEGES],
  settings: { ...DEFAULT_SETTINGS },
  activityLogs: [],
  gallery: [],
  faqs: [],
  certificates: [],
  foodTokens: [],
  feedbacks: [],
  activeSymposiumId: DEFAULT_SYMPOSIUM.id,
  isInitialized: false,
  currentUser: null,
  deletedIds: new Set<string>(["user-judge-alan", "user-judge-ada", "user-judge-saravanan", "turing.judge@gmail.com", "ada.lovelace@gmail.com", "saravanan.m@gmail.com", "std-seed-1", "std-seed-2", "std-seed-3", "kevinraj115@gmail.com", "moorthy@gmail.com", "arolayam143143@gmail.com", "user-coord-divya", "divya@dbcyelagiri.edu.in"])
};

// Purge any stale legacy localStorage keys left from old offline builds
const purgeLegacyLocalStorage = () => {
  if (typeof window === "undefined") return;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("integra_") || k.startsWith("int_"))) {
        localStorage.removeItem(k);
      }
    }
  } catch {}
};

// Current user session is stored strictly in sessionStorage (tab-scoped, discarded on close, zero localStorage)
const getSessionUser = (): User | null => {
  if (memoryStore.currentUser) return memoryStore.currentUser;
  if (typeof window === "undefined") return null;
  try {
    const s = sessionStorage.getItem("int_session_user");
    if (s) {
      const parsed = JSON.parse(s);
      memoryStore.currentUser = parsed;
      return parsed;
    }
  } catch {}
  return null;
};

const setSessionUser = (user: User | null) => {
  if (user) {
    const { password, ...safeUser } = user;
    memoryStore.currentUser = safeUser;
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem("int_session_user", JSON.stringify(safeUser));
      localStorage.removeItem("int_session_user");
    } catch {}
  } else {
    memoryStore.currentUser = null;
    if (typeof window === "undefined") return;
    try {
      sessionStorage.removeItem("int_session_user");
      localStorage.removeItem("int_session_user");
    } catch {}
  }
};

// LocalStorage caching is completely disabled — real-time Cloud Firestore is the single source of truth
const saveCloudSnapshotToLocalStorage = () => {
  // No-op: LocalStorage snapshot caching permanently removed
};

const loadCloudSnapshotFromLocalStorage = () => {
  // No-op: LocalStorage snapshot loading permanently removed
};

const markDeletedId = (id: string) => {
  if (!id) return;
  memoryStore.deletedIds.add(id);
};

const unmarkDeletedId = (id: string) => {
  if (!id) return;
  memoryStore.deletedIds.delete(id);
};

export const mockDB = {
  init: () => {
    if (!memoryStore.isInitialized) {
      purgeLegacyLocalStorage();
      memoryStore.isInitialized = true;
      if (typeof window !== "undefined") {
        mockDB.syncFromCloud(true).catch(console.error);
      }
    }
  },

  // ── 1. SYMPOSIUM / EDITION MANAGEMENT ─────────────────────────────────────
  getSymposiums: (): Symposium[] => {
    return memoryStore.symposiums.length > 0 ? memoryStore.symposiums : [DEFAULT_SYMPOSIUM];
  },

  getActiveSymposiumId: (): string => {
    return memoryStore.activeSymposiumId || DEFAULT_SYMPOSIUM.id;
  },

  setActiveSymposiumId: (id: string) => {
    memoryStore.activeSymposiumId = id;
    mockDB.logActivity("SYSTEM", "Administrator", "SWITCH_ACTIVE_SYMPOSIUM", `Active symposium switched to ID: ${id}`);
  },

  getActiveSymposium: (): Symposium => {
    const list = mockDB.getSymposiums();
    const activeId = mockDB.getActiveSymposiumId();
    return list.find(s => isMatchingSymposium(s.id, activeId)) || list[0] || DEFAULT_SYMPOSIUM;
  },

  createSymposium: (symposium: Symposium): Symposium => {
    const list = memoryStore.symposiums;
    if (list.some(s => s.id === symposium.id)) {
      throw new Error(`A symposium with ID '${symposium.id}' already exists.`);
    }
    list.push(symposium);
    mockDB.logActivity("SYSTEM", "Administrator", "CREATE_SYMPOSIUM", `Created new symposium edition: ${symposium.name} (${symposium.year})`);
    firebaseService.saveSymposium(symposium);
    return symposium;
  },

  updateSymposium: (symposium: Symposium): Symposium => {
    const list = memoryStore.symposiums;
    const idx = list.findIndex(s => s.id === symposium.id);
    if (idx !== -1) {
      list[idx] = symposium;
    } else {
      list.push(symposium);
    }
    mockDB.logActivity("SYSTEM", "Administrator", "UPDATE_SYMPOSIUM", `Updated symposium config for ${symposium.name}`);
    firebaseService.saveSymposium(symposium);
    return symposium;
  },

  updateSymposiumAsync: async (symposium: Symposium): Promise<Symposium> => {
    mockDB.updateSymposium(symposium);
    await firebaseService.saveSymposium(symposium);
    return symposium;
  },

  deleteSymposium: (id: string, adminName: string = "Super Admin") => {
    markDeletedId(id);
    const target = memoryStore.symposiums.find(s => s.id === id);
    memoryStore.symposiums = memoryStore.symposiums.filter(s => s.id !== id);

    if (memoryStore.activeSymposiumId === id && memoryStore.symposiums.length > 0) {
      mockDB.setActiveSymposiumId(memoryStore.symposiums[0].id);
    }

    if (target) {
      mockDB.logActivity("SYSTEM", adminName, "DELETE_SYMPOSIUM", `Deleted symposium edition '${target.name}' (${target.year})`);
    }
    firebaseService.deleteSymposium(id);
  },

  cloneSymposium: (sourceId: string, newConfig: {
    id: string;
    name: string;
    theme?: string;
    tagline?: string;
    year: string;
    academicYear?: string;
    symposiumDate: string;
    venue?: string;
    regFee?: number;
  }): Symposium => {
    const sourceSymposium = memoryStore.symposiums.find(s => isMatchingSymposium(s.id, sourceId)) || DEFAULT_SYMPOSIUM;

    const newSymposium: Symposium = {
      ...sourceSymposium,
      id: newConfig.id,
      name: newConfig.name,
      theme: newConfig.theme || sourceSymposium.theme,
      tagline: newConfig.tagline || sourceSymposium.tagline,
      year: newConfig.year,
      academicYear: newConfig.academicYear || `AY${newConfig.year}`,
      symposiumDate: newConfig.symposiumDate,
      venue: newConfig.venue || sourceSymposium.venue,
      regFee: newConfig.regFee ?? sourceSymposium.regFee,
      registrationOpen: false,
      status: "upcoming",
      resultsPublished: false
    };

    mockDB.createSymposium(newSymposium);

    // Clone all event blueprints associated with source symposium
    const allMissions = mockDB.getMissions(sourceId);
    const missionsToClone: Mission[] = allMissions.map(m => ({
      ...m,
      id: `${m.id}-${newConfig.year}`,
      symposiumId: newConfig.id,
      status: "Open"
    }));

    for (const m of missionsToClone) {
      memoryStore.missions.push(m);
      firebaseService.saveEvent(m);
    }

    mockDB.logActivity("SYSTEM", "Administrator", "CLONE_SYMPOSIUM", `Cloned symposium from ${sourceId} to ${newConfig.id} with ${missionsToClone.length} events.`);
    return newSymposium;
  },

  // ── 2. ACTIVITY LOGGING ───────────────────────────────────────────────────
  logActivity: (userId: string, userName: string, action: string, details: string) => {
    const activeId = mockDB.getActiveSymposiumId();
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      symposiumId: activeId,
      userId,
      userName,
      userRole: "admin",
      action,
      details,
      timestamp: new Date().toISOString()
    };
    memoryStore.activityLogs.unshift(newLog);
    if (memoryStore.activityLogs.length > 500) {
      memoryStore.activityLogs = memoryStore.activityLogs.slice(0, 500);
    }
    firebaseService.saveActivityLog(newLog);
  },

  getActivityLogs: (symposiumId?: string): ActivityLog[] => {
    const targetSym = symposiumId || mockDB.getActiveSymposiumId();
    return memoryStore.activityLogs.filter(l => isMatchingSymposium(l.symposiumId, targetSym));
  },

  // ── 3. USERS & PARTICIPANT REGISTRATION ───────────────────────────────────
  getUsers: (symposiumId?: string): User[] => {
    const targetSym = symposiumId || mockDB.getActiveSymposiumId();
    const deletedIds = memoryStore.deletedIds;
    const filtered = memoryStore.users.filter(u => 
      !deletedIds.has(u.id) &&
      !deletedIds.has((u.email || "").toLowerCase().trim()) &&
      (u.role !== "student" || isMatchingSymposium(u.symposiumId, targetSym))
    );
    
    // Deduplicate by multi-key indexing so each person appears exactly once with all their merged roles and payment state
    const userMap = new Map<string, User>();
    for (const u of filtered) {
      const emailKey = (u.email || "").toLowerCase().trim();
      const pidKey = (u.participantId || "").toLowerCase().trim();
      const idKey = (u.id || "").toLowerCase().trim();

      const existing = (emailKey ? userMap.get(emailKey) : null) ||
                       (pidKey ? userMap.get(pidKey) : null) ||
                       (idKey ? userMap.get(idKey) : null);

      const isVerified = (existing?.paymentStatus || "").toLowerCase() === "verified" ||
                         (u.paymentStatus || "").toLowerCase() === "verified" ||
                         (existing?.paymentStatus || "").toLowerCase() === "paid" ||
                         (u.paymentStatus || "").toLowerCase() === "paid";
      const paymentStatus = isVerified ? "Verified" : (u.paymentStatus || existing?.paymentStatus || "Pending");

      if (!existing) {
        const created: User = {
          ...u,
          paymentStatus,
          roles: Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [u.role || "coordinator"]
        };
        if (emailKey) userMap.set(emailKey, created);
        if (pidKey) userMap.set(pidKey, created);
        if (idKey) userMap.set(idKey, created);
      } else {
        const mergedRoles = Array.from(new Set([
          ...(existing.roles || [existing.role]),
          ...(u.roles || [u.role])
        ]));
        const merged: User = {
          ...existing,
          ...u,
          id: existing.id || u.id,
          participantId: existing.participantId || u.participantId,
          registrationId: existing.registrationId || u.registrationId,
          roles: mergedRoles,
          role: existing.role || u.role,
          department: u.department || existing.department,
          phone: u.phone || existing.phone,
          password: u.password || existing.password,
          paymentStatus,
          paymentDetails: isVerified ? (existing.paymentDetails || u.paymentDetails) : (u.paymentDetails || existing.paymentDetails),
          registeredEvents: Array.from(new Set([...(existing.registeredEvents || []), ...(u.registeredEvents || [])])),
          achievements: Array.from(new Set([...(existing.achievements || []), ...(u.achievements || [])]))
        };
        if (emailKey) userMap.set(emailKey, merged);
        if (pidKey) userMap.set(pidKey, merged);
        if (idKey) userMap.set(idKey, merged);
      }
    }
    return Array.from(new Set(userMap.values()));
  },

  getAllUsersRaw: (): User[] => {
    const userMap = new Map<string, User>();
    for (const u of memoryStore.users) {
      const emailKey = (u.email || "").toLowerCase().trim();
      const pidKey = (u.participantId || "").toLowerCase().trim();
      const idKey = (u.id || "").toLowerCase().trim();

      const existing = (emailKey ? userMap.get(emailKey) : null) ||
                       (pidKey ? userMap.get(pidKey) : null) ||
                       (idKey ? userMap.get(idKey) : null);

      const isVerified = (existing?.paymentStatus || "").toLowerCase() === "verified" ||
                         (u.paymentStatus || "").toLowerCase() === "verified" ||
                         (existing?.paymentStatus || "").toLowerCase() === "paid" ||
                         (u.paymentStatus || "").toLowerCase() === "paid";
      const paymentStatus = isVerified ? "Verified" : (u.paymentStatus || existing?.paymentStatus || "Pending");

      if (!existing) {
        const created: User = { ...u, paymentStatus };
        if (emailKey) userMap.set(emailKey, created);
        if (pidKey) userMap.set(pidKey, created);
        if (idKey) userMap.set(idKey, created);
      } else {
        const merged: User = {
          ...existing,
          ...u,
          id: existing.id || u.id,
          participantId: existing.participantId || u.participantId,
          registrationId: existing.registrationId || u.registrationId,
          paymentStatus,
          paymentDetails: isVerified ? (existing.paymentDetails || u.paymentDetails) : (u.paymentDetails || existing.paymentDetails),
          registeredEvents: Array.from(new Set([...(existing.registeredEvents || []), ...(u.registeredEvents || [])])),
          achievements: Array.from(new Set([...(existing.achievements || []), ...(u.achievements || [])]))
        };
        if (emailKey) userMap.set(emailKey, merged);
        if (pidKey) userMap.set(pidKey, merged);
        if (idKey) userMap.set(idKey, merged);
      }
    }
    return Array.from(new Set(userMap.values()));
  },

  getCurrentUser: (): User | null => {
    return getSessionUser();
  },

  setCurrentUser: (user: User | null) => {
    setSessionUser(user);
  },

  logoutUser: () => {
    memoryStore.currentUser = null;
    if (typeof window !== "undefined") {
      try {
        fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        document.cookie = "int_auth_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
        sessionStorage.removeItem("int_session_user");
        localStorage.removeItem("int_session_user");
        sessionStorage.removeItem("int_impersonator_admin");
        sessionStorage.removeItem("int_admin_active_tab");
        localStorage.removeItem("int_admin_active_tab");
        sessionStorage.removeItem("int_coord_active_tab");
        localStorage.removeItem("int_coord_active_tab");
        sessionStorage.removeItem("int_superadmin_active_tab");
        localStorage.removeItem("int_superadmin_active_tab");
        sessionStorage.clear();
      } catch {}
    }
  },

  updateUser: (user: User) => {
    const idx = memoryStore.users.findIndex(u =>
      u.id === user.id ||
      (u.participantId && user.participantId && u.participantId === user.participantId) ||
      (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase())
    );
    if (idx !== -1) {
      memoryStore.users[idx] = { ...memoryStore.users[idx], ...user };
    } else {
      memoryStore.users.push(user);
    }
    const curr = getSessionUser();
    if (curr && (curr.id === user.id || curr.email?.toLowerCase() === user.email?.toLowerCase())) {
      setSessionUser({ ...curr, ...user });
    }
    firebaseService.saveUser(user);
    if (user.role === "student") {
      firebaseService.saveParticipant(user);
    }
  },

  updateUserAsync: async (user: User): Promise<void> => {
    let clean = { ...user };
    if (clean.password && !/^[a-f0-9]{64}$/i.test(clean.password)) {
      clean.password = await hashPassword(clean.password);
    }
    mockDB.updateUser(clean);
    await firebaseService.saveUser(clean);
    if (clean.role === "student") {
      await firebaseService.saveParticipant(clean);
    }
  },

  registerStudentAsync: async (data: {
    name: string;
    email: string;
    phone: string;
    college: string;
    department: string;
    year: string;
    gender: string;
    photoUrl: string;
    shift?: string;
  }): Promise<User> => {
    // 1. Pull latest cloud data directly from Firebase Cloud Firestore
    let cloudData = null;
    try {
      cloudData = await firebaseService.pullAllData();
      if (cloudData && Array.isArray(cloudData.users)) {
        memoryStore.users = cloudData.users;
      }
    } catch (e) {
      console.warn("Cloud sync notice during registration:", e);
    }

    // Enforce strict field validations
    const nameVal = validateFullName(data.name);
    if (!nameVal.valid) throw new Error(nameVal.error || "Invalid Full Name.");

    const emailVal = validateEmail(data.email);
    if (!emailVal.valid) throw new Error(emailVal.error || "Invalid Email Address.");

    const deptVal = validateDepartment(data.department);
    if (!deptVal.valid) throw new Error(deptVal.error || "Invalid Department.");

    const colVal = validateCollege(data.college);
    if (!colVal.valid) throw new Error(colVal.error || "Invalid College.");

    const activeSym = mockDB.getActiveSymposium();
    
    // Check if registration is open
    if (!activeSym.registrationOpen) {
      throw new Error("Registration is currently closed for this symposium.");
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (activeSym.regEndDate && todayStr > activeSym.regEndDate) {
      throw new Error(`Registration closed on ${activeSym.regEndDate}.`);
    }

    const cloudStudents = memoryStore.users.filter((u: any) => u.role === "student");

    if (cloudStudents.length >= activeSym.maxParticipants) {
      throw new Error(`Maximum participant registration capacity (${activeSym.maxParticipants}) reached!`);
    }

    const cleanEmail = data.email.toLowerCase().trim();
    const cleanPhone = data.phone.replace(/[^0-9]/g, "");

    // Real-Time Duplicate Check against Cloud Firestore
    const cloudEmailExists = cloudStudents.some((u: any) => (u.email || "").toLowerCase().trim() === cleanEmail);
    if (cloudEmailExists) {
      throw new Error("You are already registered for this symposium with this email address. Please go to Participant Login.");
    }

    const cloudPhoneExists = cloudStudents.some((u: any) => (u.phone || "").replace(/[^0-9]/g, "") === cleanPhone);
    if (cloudPhoneExists) {
      throw new Error("A participant with this mobile number is already registered for this symposium.");
    }

    // Direct Cloud Lookup verification
    try {
      const existingInCloud = await firebaseService.findUserByEmailOrId(cleanEmail);
      if (existingInCloud && existingInCloud.role === "student") {
        throw new Error("You are already registered for this symposium with this email address. Please go to Participant Login.");
      }
    } catch (err: any) {
      if (err.message && err.message.includes("already registered")) throw err;
    }

    const nextSeq = cloudStudents.length + 1;
    const seqPadded = String(nextSeq).padStart(4, "0");
    const yearShort = (activeSym.year || "26").slice(-2);
    const prefix = (activeSym.name || "INT").slice(0, 3).toUpperCase();

    const participantId = `${prefix}${yearShort}-${seqPadded}`;
    const registrationId = `${(activeSym.name || "INTEGRA").toUpperCase()}-${activeSym.year || "2026"}-${seqPadded}`;
    const username = participantId;
    const passportNumber = `PASS-${(activeSym.name || "INTEGRA").toUpperCase()}-${yearShort}-${Math.floor(10000 + Math.random() * 90000)}`;
    const generatedPassword = `${prefix.toLowerCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newStudent: User = {
      ...data,
      id: `std-${Date.now()}-${nextSeq}`,
      symposiumId: activeSym.id,
      role: "student",
      shift: data.shift ? data.shift.trim() : undefined,
      participantId,
      registrationId,
      username,
      passportNumber,
      registrationStatus: "Registered",
      paymentStatus: "Pending",
      registeredEvents: [],
      xp: 0,
      achievements: ["Registered"],
      badges: ["AI Novice"],
      password: generatedPassword,
      isFirstLogin: true,
      photoUrl: data.photoUrl
    };

    // 1. Save directly to Cloud Firestore as Single Source of Truth
    await firebaseService.saveParticipant(newStudent as any);
    await firebaseService.saveUser(newStudent as any);

    // 2. Update memory store
    memoryStore.users.push(newStudent);
    setSessionUser(newStudent);

    mockDB.logActivity(newStudent.id, newStudent.name, "PARTICIPANT_REGISTERED", `Participant ${newStudent.name} (${participantId}) registered with offline payment pending.`);

    return newStudent;
  },

  registerStudent: (data: {
    name: string;
    email: string;
    phone: string;
    college: string;
    department: string;
    year: string;
    gender: string;
    photoUrl: string;
    shift?: string;
  }): User => {
    const activeSym = mockDB.getActiveSymposium();
    
    if (!activeSym.registrationOpen) {
      throw new Error("Registration is currently closed for this symposium.");
    }

    const currentSymUsers = mockDB.getUsers(activeSym.id);
    const currentStudents = currentSymUsers.filter(u => u.role === "student");

    if (currentStudents.length >= activeSym.maxParticipants) {
      throw new Error(`Maximum participant registration capacity (${activeSym.maxParticipants}) reached!`);
    }

    const emailExists = currentStudents.some(u => u.email.toLowerCase() === data.email.toLowerCase().trim());
    if (emailExists) {
      throw new Error("You are already registered for this symposium with this email address. Please go to Participant Login.");
    }

    const nextSeq = currentStudents.length + 1;
    const seqPadded = String(nextSeq).padStart(4, "0");
    const yearShort = (activeSym.year || "26").slice(-2);
    const prefix = (activeSym.name || "INT").slice(0, 3).toUpperCase();

    const participantId = `${prefix}${yearShort}-${seqPadded}`;
    const registrationId = `${(activeSym.name || "INTEGRA").toUpperCase()}-${activeSym.year || "2026"}-${seqPadded}`;
    const username = participantId;
    const passportNumber = `PASS-${(activeSym.name || "INTEGRA").toUpperCase()}-${yearShort}-${Math.floor(10000 + Math.random() * 90000)}`;
    const generatedPassword = `${prefix.toLowerCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newStudent: User = {
      ...data,
      id: `std-${Date.now()}-${nextSeq}`,
      symposiumId: activeSym.id,
      role: "student",
      shift: data.shift ? data.shift.trim() : undefined,
      participantId,
      registrationId,
      username,
      passportNumber,
      registrationStatus: "Registered",
      paymentStatus: "Pending",
      registeredEvents: [],
      xp: 0,
      achievements: ["Registered"],
      badges: ["AI Novice"],
      password: generatedPassword,
      isFirstLogin: true,
      photoUrl: data.photoUrl
    };

    memoryStore.users.push(newStudent);
    setSessionUser(newStudent);

    mockDB.logActivity(newStudent.id, newStudent.name, "PARTICIPANT_REGISTERED", `Participant ${newStudent.name} (${participantId}) registered with offline payment pending.`);
    firebaseService.saveParticipant(newStudent as any);
    firebaseService.saveUser(newStudent as any);

    return newStudent;
  },

  // ── 4. OFFLINE PAYMENT VERIFICATION ───────────────────────────────────────
  verifyPayment: async (userId: string, adminId: string = "Admin Desk", remarks: string = "Verified at Registration Desk", mode: "Cash" | "Bank Transfer" | "UPI Transfer" | "Other Offline Payment" = "Cash") => {
    const student = memoryStore.users.find(u =>
      (u.id && u.id === userId) ||
      (u.participantId && u.participantId.toLowerCase() === userId.toLowerCase()) ||
      (u.registrationId && u.registrationId.toLowerCase() === userId.toLowerCase()) ||
      (u.email && u.email.toLowerCase() === userId.toLowerCase())
    );
    if (!student) throw new Error("Participant not found.");

    const paymentDetails = {
      txId: `OFFLINE-PAY-${Date.now()}`,
      date: new Date().toLocaleDateString("en-IN"),
      mode,
      verifiedBy: adminId,
      remarks
    };

    student.paymentStatus = "Verified";
    delete (student as any).paymentRejectionReason;
    student.paymentDetails = paymentDetails;
    student.achievements = Array.from(new Set([...(student.achievements || []), "Payment Verified"]));

    // Propagate verification to ALL matching user alias objects in memoryStore.users
    const studentEmail = (student.email || "").toLowerCase().trim();
    const studentPid = (student.participantId || "").toLowerCase().trim();
    const studentId = (student.id || "").toLowerCase().trim();

    for (const u of memoryStore.users) {
      const uEmail = (u.email || "").toLowerCase().trim();
      const uPid = (u.participantId || "").toLowerCase().trim();
      const uId = (u.id || "").toLowerCase().trim();

      const isMatch = (studentEmail && uEmail === studentEmail) ||
                      (studentPid && uPid === studentPid) ||
                      (studentId && uId === studentId);

      if (isMatch) {
        u.paymentStatus = "Verified";
        u.paymentDetails = paymentDetails;
        delete (u as any).paymentRejectionReason;
        u.achievements = Array.from(new Set([...(u.achievements || []), "Payment Verified"]));
      }
    }

    // If active session belongs to this student, update session user immediately
    const curr = getSessionUser();
    if (curr) {
      const currEmail = (curr.email || "").toLowerCase().trim();
      const currPid = (curr.participantId || "").toLowerCase().trim();
      const currId = (curr.id || "").toLowerCase().trim();
      if ((studentEmail && currEmail === studentEmail) || (studentPid && currPid === studentPid) || (studentId && currId === studentId)) {
        setSessionUser({
          ...curr,
          ...student,
          paymentStatus: "Verified",
          paymentDetails
        });
      }
    }

    // Auto-generate Food Token immediately upon payment verification
    try {
      mockDB.generateFoodToken(student);
    } catch {}

    mockDB.logActivity(adminId, "Administrator", "PAYMENT_VERIFIED", `Offline payment verified for ${student.name} (${student.participantId}) via ${mode}`);
    await firebaseService.saveParticipant(student as any);
    await firebaseService.saveUser(student as any);
  },

  rejectPayment: async (userId: string, reason: string, adminId: string = "Admin Desk") => {
    const student = memoryStore.users.find(u => u.id === userId || u.participantId === userId || u.registrationId === userId || (u.email && u.email.toLowerCase() === userId.toLowerCase()));
    if (!student) throw new Error("Participant not found.");

    student.paymentStatus = "Rejected";
    (student as any).paymentRejectionReason = reason;

    mockDB.logActivity(adminId, "Administrator", "PAYMENT_REJECTED", `Payment REJECTED for ${student.name} (${student.participantId}). Reason: ${reason}`);
    await firebaseService.saveParticipant(student as any);
    await firebaseService.saveUser(student as any);
  },

  checkPaymentStatusAsync: async (userIdOrEmail: string): Promise<boolean> => {
    if (!userIdOrEmail) return false;
    const clean = userIdOrEmail.trim();

    // 1. First check in-memory store
    const memMatch = memoryStore.users.find(u =>
      (u.id && u.id.toLowerCase() === clean.toLowerCase()) ||
      (u.participantId && u.participantId.toLowerCase() === clean.toLowerCase()) ||
      (u.email && u.email.toLowerCase() === clean.toLowerCase())
    );
    if (memMatch && ((memMatch.paymentStatus || "").toLowerCase() === "verified" || (memMatch.paymentStatus || "").toLowerCase() === "paid")) {
      return true;
    }

    // 2. Query server endpoint directly from Firestore
    try {
      const res = await fetch(`/api/user/verify-status?id=${encodeURIComponent(clean)}&email=${encodeURIComponent(memMatch?.email || clean)}`, {
        cache: "no-store"
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.verified) {
          // Propagate to all matching users in memoryStore and session
          const pDetails = data.paymentDetails || {
            txId: `OFFLINE-PAY-${Date.now()}`,
            date: new Date().toLocaleDateString("en-IN"),
            mode: "Cash",
            verifiedBy: "Admin Desk",
            remarks: "Verified at Registration Desk"
          };

          for (const u of memoryStore.users) {
            const isMatch = (u.id && u.id.toLowerCase() === clean.toLowerCase()) ||
                            (u.participantId && u.participantId.toLowerCase() === clean.toLowerCase()) ||
                            (u.email && clean.includes("@") && u.email.toLowerCase() === clean.toLowerCase()) ||
                            (memMatch?.email && u.email && u.email.toLowerCase() === memMatch.email.toLowerCase());
            if (isMatch) {
              u.paymentStatus = "Verified";
              u.paymentDetails = pDetails;
              delete (u as any).paymentRejectionReason;
              u.achievements = Array.from(new Set([...(u.achievements || []), "Payment Verified"]));
              if (Array.isArray(data.registeredEvents) && data.registeredEvents.length > 0) {
                u.registeredEvents = Array.from(new Set([...(u.registeredEvents || []), ...data.registeredEvents]));
              }
            }
          }

          const curr = getSessionUser();
          if (curr) {
            const isCurr = (curr.id && curr.id.toLowerCase() === clean.toLowerCase()) ||
                           (curr.participantId && curr.participantId.toLowerCase() === clean.toLowerCase()) ||
                           (curr.email && clean.includes("@") && curr.email.toLowerCase() === clean.toLowerCase()) ||
                           (memMatch?.email && curr.email && curr.email.toLowerCase() === memMatch.email.toLowerCase());
            if (isCurr) {
              const updatedCurr = {
                ...curr,
                paymentStatus: "Verified" as const,
                paymentDetails: pDetails,
                achievements: Array.from(new Set([...(curr.achievements || []), "Payment Verified"]))
              };
              setSessionUser(updatedCurr);
              try { mockDB.generateFoodToken(updatedCurr); } catch {}
            }
          }

          saveCloudSnapshotToLocalStorage();
          return true;
        }
      }
    } catch (e) {
      console.warn("checkPaymentStatusAsync error:", e);
    }

    return false;
  },

  // ── 5. EVENTS & SLOT CLASH PREVENTION ─────────────────────────────────────
  getMissions: (symposiumId?: string): Mission[] => {
    const targetSym = symposiumId || mockDB.getActiveSymposiumId();
    const deletedIds = memoryStore.deletedIds;

    const list = (memoryStore.missions || []).filter(m =>
      (!m.symposiumId || isMatchingSymposium(m.symposiumId, targetSym)) &&
      !deletedIds.has(m.id) &&
      !deletedIds.has((m.name || "").trim().toLowerCase())
    );

    const nameMap = new Map<string, Mission>();
    for (const m of list) {
      const normKey = (m.name || "").trim().toLowerCase();
      if (!normKey) continue;
      nameMap.set(normKey, m);
    }
    const dedupedList = Array.from(nameMap.values());

    const REQUIRED_ORDER = [
      "ai quiz arena",
      "vision ai",
      "prompt master",
      "startup lab",
      "creative studio",
      "ai framecraft",
      "rhythm ai",
      "integra vibe"
    ];

    return [...dedupedList].sort((a, b) => {
      const nameA = (a.name || "").trim().toLowerCase();
      const nameB = (b.name || "").trim().toLowerCase();
      const indexA = REQUIRED_ORDER.findIndex(o => nameA.includes(o) || o.includes(nameA));
      const indexB = REQUIRED_ORDER.findIndex(o => nameB.includes(o) || o.includes(nameB));
      const orderA = indexA !== -1 ? indexA : 999;
      const orderB = indexB !== -1 ? indexB : 999;
      return orderA - orderB;
    });
  },

    restoreDefaultMissionsAsync: async () => {
    memoryStore.deletedIds.clear();
    memoryStore.missions = [...DEFAULT_MISSIONS];
    for (const m of DEFAULT_MISSIONS) {
      await firebaseService.saveEvent(m as any);
    }
    saveCloudSnapshotToLocalStorage();
    return memoryStore.missions;
  },

  addMission: (mission: Mission, adminName: string = "Administrator") => {
    if (!mission.id || mission.id === "undefined") {
      mission.id = `event-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    }
    unmarkDeletedId(mission.id);
    if (mission.name) {
      const normName = mission.name.toLowerCase().trim();
      unmarkDeletedId(normName);
      const slug = normName.replace(/[^a-z0-9]+/g, "-");
      unmarkDeletedId(slug);
      unmarkDeletedId(`event-${slug}`);
    }

    const activeId = mission.symposiumId || mockDB.getActiveSymposiumId() || "integra-2026";
    mission.symposiumId = activeId;
    const existingIdx = memoryStore.missions.findIndex(m => m.id === mission.id || (m.name && m.name.toLowerCase().trim() === mission.name.toLowerCase().trim()));
    if (existingIdx !== -1) {
      memoryStore.missions[existingIdx] = mission;
    } else {
      memoryStore.missions.push(mission);
    }
    mockDB.logActivity("ADMIN", adminName, "EVENT_CREATED", `Created event: ${mission.name} (${mission.slot || "Unassigned"})`);
    firebaseService.saveEvent(mission as any);
    saveCloudSnapshotToLocalStorage();
  },

  addMissionAsync: async (mission: Mission, adminName: string = "Administrator"): Promise<Mission> => {
    mockDB.addMission(mission, adminName);
    await firebaseService.saveEvent(mission as any);
    return mission;
  },

  updateMission: (mission: Mission, adminName: string = "Administrator") => {
    unmarkDeletedId(mission.id);
    if (mission.name) {
      const normName = mission.name.toLowerCase().trim();
      unmarkDeletedId(normName);
      const slug = normName.replace(/[^a-z0-9]+/g, "-");
      unmarkDeletedId(slug);
      unmarkDeletedId(`event-${slug}`);
    }

    const idx = memoryStore.missions.findIndex(m => m.id === mission.id || (m.name && m.name.toLowerCase().trim() === mission.name.toLowerCase().trim()));
    if (idx !== -1) {
      memoryStore.missions[idx] = mission;
    } else {
      memoryStore.missions.push(mission);
    }
    mockDB.logActivity("ADMIN", adminName, "EVENT_UPDATED", `Updated event details: ${mission.name}`);
    firebaseService.saveEvent(mission as any);
    saveCloudSnapshotToLocalStorage();
  },

  updateMissionAsync: async (mission: Mission, adminName: string = "Administrator"): Promise<Mission> => {
    mockDB.updateMission(mission, adminName);
    await firebaseService.saveEvent(mission as any);
    return mission;
  },

  deleteMission: (id: string, adminName: string = "Administrator") => {
    markDeletedId(id);
    const normSearch = id.toLowerCase().trim();
    markDeletedId(normSearch);

    const m = memoryStore.missions.find(item => item.id === id || (item.name && item.name.toLowerCase().trim() === normSearch));
    if (m) {
      markDeletedId(m.id);
      if (m.name) markDeletedId(m.name.toLowerCase().trim());
      mockDB.logActivity("ADMIN", adminName, "EVENT_DELETED", `Deleted event: ${m.name}`);
      const targetNameNorm = m.name.toLowerCase().trim();
      memoryStore.missions = memoryStore.missions.filter(item => item.id !== m.id && item.name.toLowerCase().trim() !== targetNameNorm);
      // Remove from DEFAULT_MISSIONS in memory as well
      const defIdx = DEFAULT_MISSIONS.findIndex(d => d.id === m.id || d.name.toLowerCase().trim() === targetNameNorm);
      if (defIdx !== -1) DEFAULT_MISSIONS.splice(defIdx, 1);
      firebaseService.deleteEvent(m);
    } else {
      memoryStore.missions = memoryStore.missions.filter(item => item.id !== id && item.name.toLowerCase().trim() !== normSearch);
      firebaseService.deleteEvent(id);
    }
    
    saveCloudSnapshotToLocalStorage();
  },

  deleteMissionAsync: async (id: string, adminName: string = "Administrator"): Promise<void> => {
    const m = memoryStore.missions.find(item => item.id === id || (item.name && item.name.toLowerCase().trim() === id.toLowerCase().trim()));
    mockDB.deleteMission(id, adminName);
    await firebaseService.deleteEvent(m || id);
  },

  checkEventSlotClash: (studentId: string, newMissionId: string): { hasClash: boolean; clashingMissionName?: string; clashingSlot?: string; message?: string } => {
    const user = memoryStore.users.find(u => u.id === studentId || u.participantId === studentId);
    if (!user || !user.registeredEvents || user.registeredEvents.length === 0) {
      return { hasClash: false };
    }

    const allMissions = mockDB.getMissions(user.symposiumId);
    const targetMission = allMissions.find(m => m.id === newMissionId);
    if (!targetMission || !targetMission.slot) {
      return { hasClash: false };
    }

    for (const enrolledId of user.registeredEvents) {
      if (enrolledId === newMissionId) continue;
      const enrolledMission = allMissions.find(m => m.id === enrolledId);
      if (enrolledMission && enrolledMission.slot && enrolledMission.slot.trim().toUpperCase() === targetMission.slot.trim().toUpperCase()) {
        return {
          hasClash: true,
          clashingMissionName: enrolledMission.name,
          clashingSlot: enrolledMission.slot,
          message: `Slot clash: '${enrolledMission.name}' is scheduled in ${enrolledMission.slot}`
        };
      }
    }

    return { hasClash: false };
  },

  // Enforces 1 Technical, 1 Non-Technical, 1 Cultural event limit per participant
  checkCategoryLimit: (studentId: string, targetMissionId: string): { allowed: boolean; reason?: string; registeredInCategory?: string } => {
    const user = memoryStore.users.find(u => u.id === studentId || u.participantId === studentId);
    if (!user) return { allowed: true };

    const enrolledIds = user.registeredEvents || [];
    if (enrolledIds.includes(targetMissionId)) {
      return { allowed: true }; // Already registered for this specific event
    }

    const allMissions = mockDB.getMissions(user.symposiumId);
    const targetMission = allMissions.find(m => m.id === targetMissionId);
    if (!targetMission) return { allowed: true };

    const targetCategory = (targetMission.category || "").trim().toLowerCase();
    
    // Check if participant already has an event in the same category
    for (const enrolledId of enrolledIds) {
      const enrolledMission = allMissions.find(m => m.id === enrolledId);
      if (enrolledMission) {
        const cat = (enrolledMission.category || "").trim().toLowerCase();
        if (cat === targetCategory) {
          return {
            allowed: false,
            registeredInCategory: enrolledMission.name,
            reason: `Category Limit: You have already registered for a ${targetMission.category} event ('${enrolledMission.name}'). Each participant can register for at most 1 Technical, 1 Non-Technical, and 1 Cultural event.`
          };
        }
      }
    }

    return { allowed: true };
  },

  registerForEvent: async (studentId: string, missionId: string): Promise<User> => {
    const user = memoryStore.users.find(u => u.id === studentId || u.participantId === studentId);
    if (!user) throw new Error("Student not found.");

    const missions = mockDB.getMissions(user.symposiumId);
    const mission = missions.find(m => m.id === missionId);
    if (!mission) throw new Error("Event not found.");

    const enrolled = user.registeredEvents || [];
    if (enrolled.includes(missionId)) {
      throw new Error(`You are already enrolled in '${mission.name}'.`);
    }

    const activeSym = mockDB.getActiveSymposium();
    const maxEvents = activeSym.maxEventsPerParticipant || 3;
    if (enrolled.length >= maxEvents) {
      throw new Error(`Maximum limit of ${maxEvents} events per participant reached.`);
    }

    // Strict Category Limit: 1 Technical, 1 Non-Technical, 1 Cultural
    const categoryCheck = mockDB.checkCategoryLimit(studentId, missionId);
    if (!categoryCheck.allowed) {
      throw new Error(categoryCheck.reason || `Category limit reached: only 1 ${mission.category} event permitted.`);
    }

    const clashCheck = mockDB.checkEventSlotClash(studentId, missionId);
    if (clashCheck.hasClash) {
      throw new Error(`Time Clash: '${mission.name}' is scheduled in ${clashCheck.clashingSlot}, which overlaps with your registered event '${clashCheck.clashingMissionName}'.`);
    }

    user.registeredEvents = [...enrolled, missionId];
    mockDB.updateUser(user);
    mockDB.logActivity(user.id, user.name, "EVENT_ENROLLED", `Enrolled in event: ${mission.name} (${mission.slot || "Slot 1"})`);
    return user;
  },

  unregisterFromEvent: async (studentId: string, missionId: string): Promise<User> => {
    const user = memoryStore.users.find(u => u.id === studentId || u.participantId === studentId);
    if (!user) throw new Error("Student not found.");

    user.registeredEvents = (user.registeredEvents || []).filter(id => id !== missionId);
    mockDB.updateUser(user);
    mockDB.logActivity(user.id, user.name, "EVENT_UNENROLLED", `Unenrolled from event ID: ${missionId}`);
    return user;
  },

  // ── 6. TEAMS & COLLABORATION ──────────────────────────────────────────────
  getTeams: (symposiumId?: string): Team[] => {
    const targetSym = symposiumId || mockDB.getActiveSymposiumId();
    const rawTeams = memoryStore.teams.filter(t => isMatchingSymposium(t.symposiumId, targetSym));
    return rawTeams.map(t => {
      const eId = t.eventId || t.missionId || "";
      const mObj = memoryStore.missions.find(m => m.id === eId);
      const eName = t.eventName || t.missionName || (mObj ? mObj.name : (eId || "Competition Session"));
      const tName = t.teamName || t.name || "Squad";
      return {
        ...t,
        eventId: eId,
        missionId: eId,
        eventName: eName,
        missionName: eName,
        teamName: tName,
        name: tName
      };
    });
  },

  createTeam: (teamDataOrMissionId: any, teamName?: string, leaderId?: string): Team => {
    const targetMissionId = typeof teamDataOrMissionId === "string" 
      ? teamDataOrMissionId 
      : (teamDataOrMissionId.missionId || teamDataOrMissionId.eventId);

    const rawLeaderId = typeof teamDataOrMissionId === "string" 
      ? (leaderId || "LEADER") 
      : (teamDataOrMissionId.leaderId || leaderId || "LEADER");

    const leaderUser = memoryStore.users.find(u => u.id === rawLeaderId || u.participantId === rawLeaderId);
    const leaderIdClean = leaderUser ? (leaderUser.participantId || leaderUser.id) : rawLeaderId;
    const leaderIdRaw = leaderUser ? leaderUser.id : rawLeaderId;

    const leaderCollege = leaderUser?.college || (typeof teamDataOrMissionId === "object" ? (teamDataOrMissionId.college || teamDataOrMissionId.leaderCollege) : "") || "";
    const leaderDept = leaderUser?.department || (typeof teamDataOrMissionId === "object" ? (teamDataOrMissionId.department || teamDataOrMissionId.leaderDept) : "") || "";

    // Enforce Category Limit: 1 Technical, 1 Non-Technical, 1 Cultural
    if (leaderUser) {
      const catCheck = mockDB.checkCategoryLimit(leaderUser.id, targetMissionId);
      if (!catCheck.allowed) {
        throw new Error(catCheck.reason || "Category limit reached for team creation.");
      }
      const clashCheck = mockDB.checkEventSlotClash(leaderUser.id, targetMissionId);
      if (clashCheck.hasClash) {
        throw new Error(`Time Clash: The event is scheduled in ${clashCheck.clashingSlot}, which overlaps with your registered event '${clashCheck.clashingMissionName}'.`);
      }
    }

    // Enforce STRICT rule 1: 1 Team per participant per event
    const existingUserTeam = memoryStore.teams.find(t => {
      const sameEvent = (t.missionId || t.eventId) === targetMissionId;
      if (!sameEvent) return false;
      const isLeader = t.leaderId === leaderIdClean || t.leaderId === leaderIdRaw;
      const isMember = t.members && t.members.some((m: any) => {
        const mId = typeof m === "string" ? m : (m.studentId || m.id);
        return mId === leaderIdClean || mId === leaderIdRaw;
      });
      return isLeader || isMember;
    });

    if (existingUserTeam) {
      const eName = existingUserTeam.eventName || existingUserTeam.missionName || "this event";
      throw new Error(`You are already part of Team "${existingUserTeam.teamName || existingUserTeam.name}" for ${eName}. Participants can only belong to 1 team per event.`);
    }

    // Enforce STRICT rule 2: ONLY 1 TEAM PER DEPARTMENT PER COLLEGE PER EVENT
    if (leaderCollege && leaderDept) {
      const sameDeptTeam = memoryStore.teams.find(t => {
        const sameEvent = (t.missionId || t.eventId) === targetMissionId;
        if (!sameEvent) return false;

        const tLeader = memoryStore.users.find(u => u.participantId === t.leaderId || u.id === t.leaderId);
        const tCollege = t.college || tLeader?.college || "";
        const tDept = t.department || tLeader?.department || "";

        return (
          tCollege.trim().toLowerCase() === leaderCollege.trim().toLowerCase() &&
          tDept.trim().toLowerCase() === leaderDept.trim().toLowerCase()
        );
      });

      if (sameDeptTeam) {
        const eName = sameDeptTeam.eventName || sameDeptTeam.missionName || "this event";
        throw new Error(`Registration restricted: Team "${sameDeptTeam.teamName || sameDeptTeam.name}" from ${leaderDept} department of ${leaderCollege} is already registered for ${eName}. Only 1 team per department per college is allowed per event.`);
      }
    }

    const missionObj = memoryStore.missions.find(m => m.id === targetMissionId);
    const mName = missionObj ? missionObj.name : (typeof teamDataOrMissionId === "object" ? (teamDataOrMissionId.eventName || teamDataOrMissionId.missionName || "Competition Session") : "Competition Session");
    const tName = (typeof teamDataOrMissionId === "string" ? teamName : (teamDataOrMissionId.teamName || teamDataOrMissionId.name)) || `${leaderUser?.name || "Participant"}'s Squad`;
    const activeSym = mockDB.getActiveSymposium();

    const newTeam: Team = {
      id: (typeof teamDataOrMissionId === "object" && teamDataOrMissionId.id) || `team-${Date.now()}`,
      symposiumId: activeSym.id,
      name: tName,
      teamName: tName,
      missionId: targetMissionId,
      eventId: targetMissionId,
      missionName: mName,
      eventName: mName,
      leaderId: leaderIdClean,
      leaderName: leaderUser?.name || (typeof teamDataOrMissionId === "object" ? teamDataOrMissionId.leaderName : "Team Leader"),
      leaderEmail: leaderUser?.email || (typeof teamDataOrMissionId === "object" ? teamDataOrMissionId.leaderEmail : ""),
      college: leaderCollege,
      department: leaderDept,
      members: (typeof teamDataOrMissionId === "object" && Array.isArray(teamDataOrMissionId.members) && teamDataOrMissionId.members.length > 0)
        ? teamDataOrMissionId.members
        : (leaderUser ? [{
            studentId: leaderUser.participantId || leaderUser.id,
            studentName: leaderUser.name,
            joinedAt: new Date().toISOString()
          }] : []),
      createdAt: new Date().toISOString()
    };

    memoryStore.teams.push(newTeam);
    mockDB.logActivity(newTeam.leaderId, newTeam.leaderName, "TEAM_CREATED", `Created team '${newTeam.teamName}' for event ${newTeam.eventName}`);
    firebaseService.saveTeam(newTeam);

    // Auto-enroll Team Leader into event registeredEvents if not already enrolled
    if (leaderUser && targetMissionId) {
      const leaderEnrolled = leaderUser.registeredEvents || [];
      if (!leaderEnrolled.includes(targetMissionId)) {
        leaderUser.registeredEvents = [...leaderEnrolled, targetMissionId];
        mockDB.updateUser(leaderUser);
      }
    }

    return newTeam;
  },

  inviteTeamMember: (teamId: string, leaderIdOrStudentId: string, maybeTargetStudentId?: string) => {
    const rawTarget = (maybeTargetStudentId ? maybeTargetStudentId : leaderIdOrStudentId || "").trim();
    const cleanTarget = rawTarget.toLowerCase();
    const team = memoryStore.teams.find(t => t.id === teamId);
    if (!team) throw new Error("Team not found.");

    const student = memoryStore.users.find(u => 
      (u.participantId && u.participantId.toLowerCase() === cleanTarget) ||
      (u.id && u.id.toLowerCase() === cleanTarget) ||
      (u.email && u.email.toLowerCase() === cleanTarget)
    );
    if (!student) throw new Error(`Participant "${rawTarget}" not found. Please verify the Participant ID.`);

    const leaderUser = memoryStore.users.find(u => u.participantId === team.leaderId || u.id === team.leaderId);
    const teamCollege = team.college || leaderUser?.college || "";
    const teamDept = team.department || leaderUser?.department || "";

    if (teamCollege && student.college && teamCollege.trim().toLowerCase() !== student.college.trim().toLowerCase()) {
      throw new Error(`Team restriction: All team members must belong to the same college (${teamCollege}).`);
    }

    if (teamDept && student.department && teamDept.trim().toLowerCase() !== student.department.trim().toLowerCase()) {
      throw new Error(`Team restriction: All team members must belong to the same department (${teamDept}).`);
    }

    // Check if already in team
    const studentPartId = student.participantId || student.id;
    if (team.members && team.members.some(m => {
      const mId = typeof m === "string" ? m : (m.studentId || (m as any).id);
      return mId === studentPartId || mId === student.id;
    })) {
      throw new Error(`Participant ${student.name} is already a member of this team.`);
    }

    // Check if already invited
    const existing = memoryStore.joinRequests.find(r => 
      r.teamId === teamId && 
      (r.studentId === student.id || (r as any).studentParticipantId === studentPartId) && 
      (r.status || "").toLowerCase() === "pending"
    );
    if (existing) throw new Error(`An invitation has already been sent to ${student.name}.`);

    const targetMissionId = team.missionId || team.eventId || "";
    const teamDisplayName = team.teamName || team.name || "Team";
    const newRequest = {
      id: `req-${Date.now()}`,
      teamId,
      teamName: teamDisplayName,
      missionId: targetMissionId,
      eventId: targetMissionId,
      leaderId: team.leaderId,
      leaderName: team.leaderName || leaderUser?.name || "Team Leader",
      studentId: student.id,
      studentParticipantId: studentPartId,
      studentName: student.name,
      type: "invitation",
      status: "pending",
      timestamp: new Date().toISOString()
    };

    memoryStore.joinRequests.push(newRequest);
    mockDB.logActivity(team.leaderId, team.leaderName, "TEAM_INVITE_SENT", `Invited ${student.name} to join ${teamDisplayName}`);
    firebaseService.saveJoinRequest(newRequest);
  },

  joinTeam: (teamCodeOrNameOrId: string, missionId: string, studentId: string) => {
    const cleanSearch = (teamCodeOrNameOrId || "").trim().toLowerCase();
    if (!cleanSearch) throw new Error("Please enter a valid Team ID or Leader Participant ID.");

    const team = memoryStore.teams.find(t => {
      const tLeader = memoryStore.users.find(u => u.participantId === t.leaderId || u.id === t.leaderId);
      const matchId = t.id && t.id.toLowerCase().trim() === cleanSearch;
      const matchLeaderId = (t.leaderId || "").toLowerCase().trim() === cleanSearch;
      const matchLeaderPartId = (tLeader?.participantId || "").toLowerCase().trim() === cleanSearch;
      const matchLeaderName = (t.leaderName || tLeader?.name || "").toLowerCase().trim() === cleanSearch;
      const matchName = (t.teamName || t.name || "").toLowerCase().trim() === cleanSearch;
      const matchCode = (t as any).code && (t as any).code.toLowerCase().trim() === cleanSearch;

      const matchesQuery = matchId || matchLeaderId || matchLeaderPartId || matchLeaderName || matchName || matchCode;
      if (!matchesQuery) return false;

      if (!missionId) return true;
      const tMission = (t.missionId || t.eventId || "").toLowerCase();
      const targetMission = missionId.toLowerCase();
      return tMission === targetMission || tMission.includes(targetMission) || targetMission.includes(tMission);
    });
    if (!team) throw new Error("Team not found for this event. Please verify the Team ID or Leader Participant ID.");

    const student = memoryStore.users.find(u => 
      u.id?.toLowerCase() === studentId.toLowerCase() || 
      u.participantId?.toLowerCase() === studentId.toLowerCase()
    );
    if (!student) throw new Error("Participant not found.");

    const studentPartId = student.participantId || student.id;
    if (team.members && team.members.some(m => {
      const mId = typeof m === "string" ? m : (m.studentId || (m as any).id);
      return mId === studentPartId || mId === student.id;
    })) {
      throw new Error("You are already a member of this team.");
    }

    const leaderUser = memoryStore.users.find(u => u.participantId === team.leaderId || u.id === team.leaderId);
    const teamCollege = team.college || leaderUser?.college || "";
    const teamDept = team.department || leaderUser?.department || "";

    if (teamCollege && student.college && teamCollege.trim().toLowerCase() !== student.college.trim().toLowerCase()) {
      throw new Error(`Team restriction: All team members must belong to the same college (${teamCollege}).`);
    }

    if (teamDept && student.department && teamDept.trim().toLowerCase() !== student.department.trim().toLowerCase()) {
      throw new Error(`Team restriction: All team members must belong to the same department (${teamDept}).`);
    }

    const targetMissionId = team.missionId || team.eventId || missionId;

    // Enforce Category Limit & Slot Clash for joining student
    const catCheck = mockDB.checkCategoryLimit(student.id, targetMissionId);
    if (!catCheck.allowed) {
      throw new Error(catCheck.reason || "Category limit reached for this event type.");
    }
    const clashCheck = mockDB.checkEventSlotClash(student.id, targetMissionId);
    if (clashCheck.hasClash) {
      throw new Error(`Time Clash: The event is scheduled in ${clashCheck.clashingSlot}, which overlaps with your registered event '${clashCheck.clashingMissionName}'.`);
    }

    // Check if already requested
    const existing = memoryStore.joinRequests.find(r => 
      r.teamId === team.id && 
      (r.studentId === student.id || (r as any).studentParticipantId === studentPartId) && 
      (r.status || "").toLowerCase() === "pending"
    );
    if (existing) throw new Error("You have already sent a join request to this team.");

    const teamDisplayName = team.teamName || team.name || "Team";
    const newRequest = {
      id: `req-${Date.now()}`,
      teamId: team.id,
      teamName: teamDisplayName,
      missionId: targetMissionId,
      eventId: targetMissionId,
      leaderId: team.leaderId,
      leaderName: team.leaderName || leaderUser?.name || "Team Leader",
      studentId: student.id,
      studentParticipantId: studentPartId,
      studentName: student.name,
      type: "join_request",
      status: "pending",
      timestamp: new Date().toISOString()
    };

    memoryStore.joinRequests.push(newRequest);
    mockDB.logActivity(student.id, student.name, "TEAM_JOIN_REQUEST", `Requested to join ${teamDisplayName}`);
    firebaseService.saveJoinRequest(newRequest);
  },

  getJoinRequests: (studentIdOrPartId: string) => {
    const clean = (studentIdOrPartId || "").trim().toLowerCase();
    const studentUser = memoryStore.users.find(u => 
      (u.id && u.id.toLowerCase() === clean) || 
      (u.participantId && u.participantId.toLowerCase() === clean)
    );
    const userId = studentUser?.id?.toLowerCase() || clean;
    const partId = studentUser?.participantId?.toLowerCase() || clean;

    // Set of team IDs led by this user
    const ledTeamIds = new Set(
      memoryStore.teams
        .filter(t => {
          const lId = (t.leaderId || "").toLowerCase();
          return lId === userId || lId === partId;
        })
        .map(t => t.id)
    );

    return memoryStore.joinRequests.filter(r => {
      if ((r.status || "").toLowerCase() !== "pending") return false;

      const rStudentId = (r.studentId || "").toLowerCase();
      const rStudentPartId = ((r as any).studentParticipantId || "").toLowerCase();

      // Incoming invite sent to this student
      const isInvited = rStudentId === userId || rStudentId === partId || 
                        rStudentPartId === userId || rStudentPartId === partId;

      // Incoming join request sent to a team led by this user
      const isLeaderOfTeam = ledTeamIds.has(r.teamId);

      return isInvited || isLeaderOfTeam;
    });
  },

  respondToTeamInvitation: (requestId: string, accept: boolean) => {
    const req = memoryStore.joinRequests.find(r => r.id === requestId);
    if (!req) throw new Error("Request not found.");

    req.status = accept ? "accepted" : "rejected";
    if (accept) {
      const team = memoryStore.teams.find(t => t.id === req.teamId);
      if (!team) throw new Error("Team no longer exists.");

      const studentUser = memoryStore.users.find(u => 
        u.id === req.studentId || 
        u.participantId === req.studentId || 
        ((req as any).studentParticipantId && u.participantId === (req as any).studentParticipantId)
      );

      const targetMissionId = team.missionId || team.eventId || req.missionId;

      if (studentUser && targetMissionId) {
        const catCheck = mockDB.checkCategoryLimit(studentUser.id, targetMissionId);
        if (!catCheck.allowed) {
          req.status = "rejected";
          firebaseService.saveJoinRequest(req);
          throw new Error(`Cannot join team: ${catCheck.reason}`);
        }
      }

      const memberKey = studentUser?.participantId || studentUser?.id || req.studentId;
      const memberName = studentUser?.name || req.studentName;

      if (!team.members.some(m => {
        const mId = typeof m === "string" ? m : (m.studentId || (m as any).id);
        return mId === memberKey || (studentUser && mId === studentUser.id);
      })) {
        team.members.push({
          studentId: memberKey,
          studentName: memberName,
          joinedAt: new Date().toISOString()
        });
        firebaseService.saveTeam(team);

        // Auto-enroll accepted member into registeredEvents
        if (studentUser && targetMissionId) {
          const userEnrolled = studentUser.registeredEvents || [];
          if (!userEnrolled.includes(targetMissionId)) {
            studentUser.registeredEvents = [...userEnrolled, targetMissionId];
            mockDB.updateUser(studentUser);
          }
        }
      }
    }
    firebaseService.saveJoinRequest(req);
  },

  respondJoinRequest: (requestId: string, accept: boolean) => {
    mockDB.respondToTeamInvitation(requestId, accept);
  },

  // ── 7. FOOD & DINING TOKENS ───────────────────────────────────────────────
  getFoodTokens: (studentId?: string, symposiumId?: string): FoodToken[] => {
    const targetSym = symposiumId || mockDB.getActiveSymposiumId();
    let list = memoryStore.foodTokens.filter(t => isMatchingSymposium(t.symposiumId, targetSym));
    if (studentId) {
      list = list.filter(t => t.studentId === studentId || t.participantId === studentId);
    }
    return list;
  },

  generateFoodToken: (studentIdOrUser: string | User, foodType: "Lunch" | "Breakfast" | "Snacks" = "Lunch"): FoodToken => {
    const studentId = typeof studentIdOrUser === "string" ? studentIdOrUser : studentIdOrUser.id;
    const student = typeof studentIdOrUser === "object" ? studentIdOrUser : memoryStore.users.find(u => u.id === studentId || u.participantId === studentId);
    if (!student) throw new Error("Student not found.");

    const activeSym = mockDB.getActiveSymposium();
    const existing = memoryStore.foodTokens.find(t =>
      (t.studentId === student.id || t.participantId === student.participantId) &&
      t.foodType === foodType &&
      isMatchingSymposium(t.symposiumId, activeSym.id)
    );

    if (existing) return existing;

    const newToken: FoodToken = {
      id: `token-${Date.now()}`,
      symposiumId: activeSym.id,
      studentId: student.id,
      participantId: student.participantId || student.id,
      studentName: student.name,
      foodType,
      status: "Unclaimed",
      issuedAt: new Date().toISOString()
    };

    memoryStore.foodTokens.push(newToken);
    firebaseService.saveFoodToken(newToken);
    return newToken;
  },

  redeemFoodToken: (rawInput: string, volunteerId: string = "VOLUNTEER", forcedTokenType?: "FOOD" | "REFRESHMENT"): FoodToken => {
    let targetInput = rawInput ? rawInput.trim() : "";
    let tokenType = forcedTokenType || "FOOD";
    
    try {
      if (targetInput.startsWith("{")) {
        const parsed = JSON.parse(targetInput);
        if (!forcedTokenType && parsed.type) tokenType = parsed.type;
        targetInput = parsed.tokenId || parsed.participantId || targetInput;
      }
    } catch {}

    if (tokenType === "REFRESHMENT" || targetInput.includes("REFRESHMENT_")) {
      const cleanId = targetInput.replace("REFRESHMENT_", "");
      const user = memoryStore.users.find(u => u.id === cleanId || u.participantId === cleanId || u.registrationId === cleanId);
      if (!user) throw new Error("Participant record not found for Refreshment Token.");
      
      const pId = user.participantId || user.id;
      let refToken = memoryStore.refreshmentTokens.find(r => r.participantId === pId || r.userId === pId);
      if (refToken && (refToken.status === "USED" || refToken.status === "REDEEMED" || refToken.remainingAmount === 0)) {
        throw new Error(`Refreshment Token has already been redeemed for ${user.name}.`);
      }

      const activeRefToken: RefreshmentToken = refToken || {
        id: `ref-${pId}`,
        symposiumId: user.symposiumId || "integra-2026",
        participantId: pId,
        userId: user.id,
        participantName: user.name,
        totalAllowance: 20,
        usedAmount: 20,
        remainingAmount: 0,
        status: "USED",
        lastUsed: new Date().toLocaleTimeString()
      };

      if (!refToken) {
        memoryStore.refreshmentTokens.push(activeRefToken);
      } else {
        activeRefToken.usedAmount = activeRefToken.totalAllowance;
        activeRefToken.remainingAmount = 0;
        activeRefToken.status = "USED";
        activeRefToken.lastUsed = new Date().toLocaleTimeString();
      }

      mockDB.logActivity(volunteerId, "Food Volunteer", "REFRESHMENT_SERVED", `Served Refreshments (Snacks & Beverage) to ${user.name} (${pId})`);
      firebaseService.saveRefreshmentToken(activeRefToken);

      return {
        id: activeRefToken.id,
        symposiumId: activeRefToken.symposiumId,
        participantId: pId,
        studentName: user.name,
        tokenNumber: `REF-${pId}`,
        mealType: "Refreshments & Snacks",
        date: new Date().toLocaleDateString(),
        status: "Claimed",
        usedTime: new Date().toLocaleTimeString(),
        scannedBy: volunteerId
      };
    }

    // Default FOOD / Meal Token handling
    let token = memoryStore.foodTokens.find(t => t.id === targetInput || t.participantId === targetInput || t.tokenNumber === targetInput);
    
    if (!token) {
      const user = memoryStore.users.find(u => u.id === targetInput || u.participantId === targetInput || u.registrationId === targetInput);
      if (user) {
        token = memoryStore.foodTokens.find(t => t.participantId === (user.participantId || user.id));
        if (!token) {
          token = mockDB.generateFoodToken(user);
        }
      }
    }

    if (!token) throw new Error("Food token not found.");
    if (token.status === "Claimed" || token.status === "Used") throw new Error(`Meal Token has already been claimed for ${token.studentName || token.participantId}.`);

    token.status = "Claimed";
    token.claimedAt = new Date().toISOString();
    token.usedTime = new Date().toLocaleTimeString();
    token.scannedBy = volunteerId;

    mockDB.logActivity(volunteerId, "Food Volunteer", "FOOD_SERVED", `Served ${token.foodType || "Meal"} to ${token.studentName} (${token.participantId})`);
    firebaseService.saveFoodToken(token);
    return token;
  },

  scanEventAttendance: (participantId: string, eventId: string, volunteerId: string) => {
    const student = memoryStore.users.find(u => u.id === participantId || u.participantId === participantId);
    if (!student) throw new Error("Participant record not found.");

    const activeMission = (memoryStore.missions || []).find(m => m.id === eventId);
    const eventTitle = activeMission ? activeMission.name : eventId;
    const venueTitle = activeMission ? activeMission.venue : "Event Hall";

    // Mark event attendance on participant record
    if (!student.checkInStatus) {
      student.checkInStatus = { checkedIn: true, time: new Date().toLocaleTimeString(), scannedBy: volunteerId, eventAttendance: {} };
    }
    if (!student.checkInStatus.eventAttendance) {
      student.checkInStatus.eventAttendance = {};
    }
    student.checkInStatus.eventAttendance[eventId] = {
      present: true,
      time: new Date().toLocaleTimeString(),
      venue: venueTitle,
      volunteerId
    };

    if (!Array.isArray(student.attendedEvents)) {
      student.attendedEvents = [];
    }
    if (!student.attendedEvents.includes(eventId)) {
      student.attendedEvents.push(eventId);
    }

    mockDB.logActivity(volunteerId, "Volunteer", "ATTENDANCE_SCANNED", `Verified attendance of ${student.name} (${student.participantId}) for event ${eventTitle} (Present)`);
    firebaseService.logAttendance({
      eventId,
      eventName: eventTitle,
      participantId: student.participantId || student.id,
      studentName: student.name,
      status: "Present",
      venue: venueTitle,
      scannedBy: volunteerId,
      timestamp: new Date().toISOString()
    });
    firebaseService.saveUser(student);
    firebaseService.saveParticipant(student);
    return student;
  },

  // ── 8. JUDGE EVALUATION & RESULTS ─────────────────────────────────────────
  getScores: (symposiumId?: string): Score[] => {
    const targetSym = symposiumId || mockDB.getActiveSymposiumId();
    return memoryStore.scores.filter(s => isMatchingSymposium(s.symposiumId, targetSym));
  },

  submitScore: (scoreData: {
    missionId: string;
    studentId: string;
    studentName: string;
    collegeName: string;
    criteriaScores: Record<string, number>;
    remarks: string;
    submittedBy: string;
    isLocked?: boolean;
  }): Score => {
    const scores = memoryStore.scores;
    const existingIdx = scores.findIndex((s: Score) => s.missionId === scoreData.missionId && s.studentId === scoreData.studentId);

    if (existingIdx !== -1 && scores[existingIdx].isLocked) {
      throw new Error("Scorecard is locked and cannot be edited by Judge. Contact Admin to unlock.");
    }

    const total = Object.values(scoreData.criteriaScores).reduce((acc, val) => acc + (Number(val) || 0), 0);
    const activeSym = mockDB.getActiveSymposium();

    const newScore: Score = {
      ...scoreData,
      id: existingIdx !== -1 ? scores[existingIdx].id : `score-${Date.now()}`,
      symposiumId: activeSym.id,
      totalScore: parseFloat(total.toFixed(2)),
      timestamp: new Date().toISOString(),
      isLocked: scoreData.isLocked ?? true
    };

    if (existingIdx !== -1) {
      scores[existingIdx] = newScore;
    } else {
      scores.push(newScore);
    }

    mockDB.logActivity(scoreData.submittedBy, "Judge", "SCORE_SUBMITTED", `Submitted score ${newScore.totalScore} for ${scoreData.studentName} in event ${scoreData.missionId}`);
    firebaseService.saveResult(newScore.id, newScore);
    return newScore;
  },

  lockScore: (scoreId: string, locked: boolean = true, adminId: string = "ADMIN") => {
    const score = memoryStore.scores.find((s: Score) => s.id === scoreId);
    if (score) {
      score.isLocked = locked;
      mockDB.logActivity(adminId, "Administrator", locked ? "SCORE_LOCKED" : "SCORE_UNLOCKED", `${locked ? "Locked" : "Unlocked"} scorecard ${scoreId}`);
      firebaseService.saveResult(score.id, score);
    }
  },

  unlockScore: (scoreId: string, adminId: string) => {
    mockDB.lockScore(scoreId, false, adminId);
  },

  publishResults: (symposiumId: string, publish: boolean) => {
    const sym = memoryStore.symposiums.find(s => isMatchingSymposium(s.id, symposiumId));
    if (sym) {
      sym.resultsPublished = publish;
      mockDB.logActivity("ADMIN", "Administrator", publish ? "RESULTS_PUBLISHED" : "RESULTS_UNPUBLISHED", `${publish ? "Published" : "Unpublished"} results for ${sym.name}`);
      firebaseService.saveSymposium(sym);
    }
  },

  // ── 9. CERTIFICATES & SETTINGS ───────────────────────────────────────────
  getCertificates: (symposiumId?: string): Certificate[] => {
    const targetSym = symposiumId || mockDB.getActiveSymposiumId();
    return memoryStore.certificates.filter(c => isMatchingSymposium(c.symposiumId, targetSym));
  },

  issueCertificate: (certData: Omit<Certificate, "id" | "hash" | "dateGenerated">): Certificate => {
    const hash = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const activeSym = mockDB.getActiveSymposium();
    const newCert: Certificate = {
      ...certData,
      id: `CERT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      symposiumId: certData.symposiumId || activeSym.id,
      hash,
      dateGenerated: new Date().toLocaleDateString("en-IN")
    };
    memoryStore.certificates.push(newCert);
    mockDB.logActivity("ADMIN", "Administrator", "CERTIFICATE_ISSUED", `Issued ${newCert.type} certificate to ${newCert.recipientName}${newCert.missionName ? ` for event '${newCert.missionName}'` : ""}`);
    firebaseService.saveCertificate(newCert);
    return newCert;
  },

  deleteCertificate: (certId: string) => {
    const cert = memoryStore.certificates.find(c => c.id === certId);
    memoryStore.certificates = memoryStore.certificates.filter(c => c.id !== certId);
    if (cert) {
      mockDB.logActivity("ADMIN", "Administrator", "CERTIFICATE_REVOKED", `Revoked ${cert.type} certificate (${cert.id}) of ${cert.recipientName}`);
    }
    firebaseService.deleteCertificate(certId);
  },

  issueBulkParticipationCertificates: (symposiumId?: string): { totalVerified: number; newlyIssued: number; alreadyIssued: number } => {
    const activeSym = mockDB.getActiveSymposium();
    const targetSymId = symposiumId || activeSym.id;

    const allUsers = mockDB.getAllUsersRaw();
    const verifiedStudents = allUsers.filter(u => 
      u.role === "student" && 
      u.paymentStatus === "Verified" &&
      isMatchingSymposium(u.symposiumId, targetSymId)
    );

    const allCerts = memoryStore.certificates;
    let newlyIssued = 0;
    let alreadyIssued = 0;

    verifiedStudents.forEach(student => {
      const hasPartCert = allCerts.some(c => 
        isMatchingSymposium(c.symposiumId, targetSymId) &&
        (c.recipientId === student.id || c.recipientId === student.participantId || c.recipientId === student.registrationId) &&
        c.type === "Participation"
      );

      if (hasPartCert) {
        alreadyIssued++;
      } else {
        const hash = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
        const newCert: Certificate = {
          id: `CERT-PART-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          symposiumId: targetSymId,
          type: "Participation",
          recipientName: student.name,
          recipientId: student.participantId || student.id,
          collegeName: student.college || "ABC Engineering College",
          departmentName: student.department || "Computer Science & Engineering",
          yearOfStudy: student.year || "3rd Year",
          missionName: `${activeSym.name} ${activeSym.year} General Symposium`,
          venue: activeSym.venue || "Campus Auditorium",
          symposiumName: activeSym.name,
          symposiumTheme: activeSym.theme,
          symposiumSubtitle: activeSym.tagline,
          hash,
          dateGenerated: new Date().toLocaleDateString("en-IN")
        };
        allCerts.push(newCert);
        newlyIssued++;
        firebaseService.saveCertificate(newCert);

        student.xp = (student.xp || 0) + 100;
        const achievements = student.achievements || [];
        if (!achievements.includes("Participation Certificate Verified")) {
          student.achievements = [...achievements, "Participation Certificate Verified"];
        }
        mockDB.updateUser(student);
      }
    });

    mockDB.logActivity(
      "ADMIN",
      "Administrator",
      "BULK_PARTICIPATION_CERTIFICATES_ISSUED",
      `Generated ${newlyIssued} bulk participation certificates for ${activeSym.name} ${activeSym.year} (${alreadyIssued} previously issued).`
    );

    return {
      totalVerified: verifiedStudents.length,
      newlyIssued,
      alreadyIssued
    };
  },

  getSettings: (): SystemSettings => {
    return {
      ...DEFAULT_SETTINGS,
      ...memoryStore.settings,
      eventTitle: memoryStore.settings.eventTitle || "INTEGRA",
      tagline: memoryStore.settings.tagline || "INTER-COLLEGE TECHNICAL SYMPOSIUM"
    };
  },

  updateSettings: (newSettings: Partial<SystemSettings>) => {
    memoryStore.settings = { ...memoryStore.settings, ...newSettings };
    if (memoryStore.symposiums && memoryStore.symposiums.length > 0) {
      if (memoryStore.settings.contactEmail) memoryStore.symposiums[0].contactEmail = memoryStore.settings.contactEmail;
      if (memoryStore.settings.contactPhone) memoryStore.symposiums[0].contactPhone = memoryStore.settings.contactPhone;
      if (memoryStore.settings.hostCollege) memoryStore.symposiums[0].venue = memoryStore.settings.hostCollege;
    }
    mockDB.logActivity("ADMIN", "Administrator", "SETTINGS_UPDATED", "Updated global system settings configuration");
    firebaseService.saveSettings(memoryStore.settings);
    saveCloudSnapshotToLocalStorage();
  },

  updateSettingsAsync: async (newSettings: Partial<SystemSettings>) => {
    mockDB.updateSettings(newSettings);
    await firebaseService.saveSettings(memoryStore.settings);
  },

  getColleges: (): College[] => {
    return memoryStore.colleges.length > 0 ? memoryStore.colleges : DEFAULT_COLLEGES;
  },

  addCollege: (college: College) => {
    const idx = memoryStore.colleges.findIndex(c => c.id === college.id);
    if (idx !== -1) {
      memoryStore.colleges[idx] = college;
    } else {
      memoryStore.colleges.push(college);
    }
    firebaseService.saveCollege(college);
  },

  addCollegeAsync: async (college: College): Promise<College> => {
    mockDB.addCollege(college);
    await firebaseService.saveCollege(college);
    return college;
  },

  updateCollege: (college: College) => {
    mockDB.addCollege(college);
  },

  updateCollegeAsync: async (college: College): Promise<College> => {
    return await mockDB.addCollegeAsync(college);
  },

  deleteCollege: (id: string) => {
    memoryStore.colleges = memoryStore.colleges.filter(c => c.id !== id);
    firebaseService.deleteCollege(id);
  },

  deleteCollegeAsync: async (id: string): Promise<void> => {
    mockDB.deleteCollege(id);
    await firebaseService.deleteCollege(id);
  },

  getAnnouncements: (symposiumId?: string): Announcement[] => {
    const targetSym = symposiumId || mockDB.getActiveSymposiumId();
    return memoryStore.announcements.filter(a => isMatchingSymposium(a.symposiumId, targetSym));
  },

  addAnnouncement: (annOrTitle: Announcement | string, content?: string, category: "General" | "Mission" | "Schedule" | "Emergency" | string = "General", symposiumId?: string) => {
    let newAnn: Announcement;
    if (typeof annOrTitle === "string") {
      const activeId = symposiumId || mockDB.getActiveSymposiumId();
      newAnn = {
        id: `ann-${Date.now()}`,
        symposiumId: activeId,
        title: annOrTitle,
        content: content || "",
        category: (category as any) || "General",
        timestamp: new Date().toISOString()
      };
    } else {
      const activeId = annOrTitle.symposiumId || mockDB.getActiveSymposiumId();
      newAnn = {
        ...annOrTitle,
        id: annOrTitle.id || `ann-${Date.now()}`,
        symposiumId: activeId,
        category: (annOrTitle.category as any) || "General",
        timestamp: annOrTitle.timestamp || new Date().toISOString()
      };
    }
    memoryStore.announcements.unshift(newAnn);
    firebaseService.saveAnnouncement(newAnn);
    return newAnn;
  },

  deleteAnnouncement: (id: string) => {
    memoryStore.announcements = memoryStore.announcements.filter(a => a.id !== id);
    firebaseService.deleteAnnouncement(id);
  },

  getGallery: () => {
    return memoryStore.gallery;
  },

  addGalleryItem: (item: any) => {
    memoryStore.gallery.unshift(item);
    firebaseService.saveGalleryItem(item);
  },

  deleteGalleryItem: (id: string) => {
    memoryStore.gallery = memoryStore.gallery.filter(g => g.id !== id);
    firebaseService.deleteGalleryItem(id);
  },

  getFAQs: () => {
    return memoryStore.faqs;
  },

  addFAQItem: (faq: any) => {
    memoryStore.faqs.push(faq);
    firebaseService.saveFAQItem(faq);
  },

  updateFAQItem: (faq: any) => {
    const idx = memoryStore.faqs.findIndex(f => f.id === faq.id);
    if (idx !== -1) {
      memoryStore.faqs[idx] = faq;
      firebaseService.saveFAQItem(faq);
    }
  },

  deleteFAQItem: (id: string) => {
    memoryStore.faqs = memoryStore.faqs.filter(f => f.id !== id);
    firebaseService.deleteFAQItem(id);
  },

  // ── 10. AUTHENTICATION & LOGIN ──────────────────────────────────────────
  loginUser: (identifier: string, pass: string): User => {
    const cleanId = (identifier || "").toLowerCase().trim();
    const curr = getSessionUser();
    if (curr && (curr.email.toLowerCase() === cleanId || curr.id.toLowerCase() === cleanId || (curr.participantId && curr.participantId.toLowerCase() === cleanId))) {
      return curr;
    }
    const user = memoryStore.users.find(u => {
      const matchEmail = u.email && u.email.toLowerCase().trim() === cleanId;
      const matchPid = u.participantId && u.participantId.toLowerCase().trim() === cleanId;
      const matchReg = u.registrationId && u.registrationId.toLowerCase().trim() === cleanId;
      const matchId = u.id && u.id.toLowerCase().trim() === cleanId;
      return matchEmail || matchPid || matchReg || matchId;
    });
    if (user) return user;
    throw new Error("Please log in using secure server authentication.");
  },

  loginUserAsync: async (identifier: string, pass: string): Promise<User> => {
    const cleanId = (identifier || "").toLowerCase().trim();
    const cleanPass = (pass || "").trim();

    if (!cleanId || !cleanPass) {
      throw new Error("Please provide both email / participant ID and passcode.");
    }

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: cleanId, password: cleanPass })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Invalid username, email, or passcode.");
    }

    const authUser: User = data.user;
    setSessionUser(authUser);

    // Merge into local memoryStore for instant component reactivity
    const idx = memoryStore.users.findIndex(u => u.id === authUser.id || (u.email && authUser.email && u.email.toLowerCase() === authUser.email.toLowerCase()));
    if (idx !== -1) {
      memoryStore.users[idx] = { ...memoryStore.users[idx], ...authUser };
    } else {
      memoryStore.users.push(authUser);
    }

    mockDB.logActivity(authUser.id, authUser.name, "USER_LOGIN", `${authUser.name} logged into ${authUser.role} portal (Server Verified).`);
    return authUser;
  },

  updateUserPassword: async (userId: string, newPass: string, adminName: string = "System Controller") => {
    return await mockDB.updateUserPasswordAsync(userId, newPass, adminName);
  },

  updateUserPasswordAsync: async (userId: string, newPass: string, adminName: string = "System Controller"): Promise<User> => {
    const user = memoryStore.users.find(u => u.id === userId || u.participantId === userId);
    if (!user) throw new Error("User record not found.");
    const cleanPass = newPass.trim();
    const hashed = /^[a-f0-9]{64}$/i.test(cleanPass) ? cleanPass.toLowerCase() : await hashPassword(cleanPass);
    user.password = hashed;
    await mockDB.updateUserAsync(user);

    // Call server API for guaranteed backend persistence in Firestore
    if (typeof window !== "undefined") {
      try {
        await fetch("/api/admin/save-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userId, newPassword: cleanPass, action: "update_password" })
        });
      } catch (e) {
        console.warn("Direct API password update fallback:", e);
      }
    }

    mockDB.logActivity("ADMIN", adminName, "PASSWORD_RESET", `Reset passcode for ${user.name} (${user.email})`);
    return user;
  },

  switchAccount: async (targetUser: User) => {
    const curr = getSessionUser();
    if (curr && (curr.role === "admin" || curr.role === "super_admin")) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("int_impersonator_admin", JSON.stringify(curr));
      }
    }
    setSessionUser(targetUser);
    try {
      await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: targetUser.id, targetRole: targetUser.role, targetName: targetUser.name, targetEmail: targetUser.email })
      });
    } catch {}
    mockDB.logActivity(targetUser.id, targetUser.name, "ACCOUNT_SWITCH", `Admin switched view to ${targetUser.name} (${targetUser.role})`);
  },

  getImpersonatorAdmin: (): User | null => {
    if (typeof window === "undefined") return null;
    try {
      const s = sessionStorage.getItem("int_impersonator_admin");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  },

  returnToAdminAccount: async (): Promise<User | null> => {
    if (typeof window === "undefined") return null;
    try {
      const s = sessionStorage.getItem("int_impersonator_admin");
      if (s) {
        const admin = JSON.parse(s);
        sessionStorage.removeItem("int_impersonator_admin");
        setSessionUser(admin);
        try {
          await fetch("/api/auth/switch-role", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetUserId: admin.id, targetRole: admin.role, targetName: admin.name, targetEmail: admin.email })
          });
        } catch {}
        return admin;
      }
    } catch {}
    return null;
  },

  changeUserRole: async (userId: string, newRole: UserRole, adminName: string = "Administrator"): Promise<User> => {
    const user = memoryStore.users.find(u => u.id === userId || u.participantId === userId);
    if (!user) throw new Error("User record not found.");
    user.role = newRole;
    if (!user.roles) user.roles = [newRole];
    else if (!user.roles.includes(newRole)) user.roles.push(newRole);
    unmarkDeletedId(userId);
    await mockDB.updateUserAsync(user);
    mockDB.logActivity("ADMIN", adminName, "ROLE_CHANGED", `Updated role for ${user.name} (${user.email}) to ${newRole}`);
    return user;
  },

  assignUserRoles: async (userId: string, assignedRoles: UserRole[], adminName: string = "Administrator"): Promise<User> => {
    const user = memoryStore.users.find(u => u.id === userId || u.participantId === userId);
    if (!user) throw new Error("User record not found.");
    if (!Array.isArray(assignedRoles) || assignedRoles.length === 0) {
      throw new Error("User must have at least one assigned role.");
    }
    user.roles = assignedRoles;
    if (!assignedRoles.includes(user.role)) {
      user.role = assignedRoles[0];
    }
    unmarkDeletedId(userId);
    await mockDB.updateUserAsync(user);
    mockDB.logActivity("ADMIN", adminName, "ROLES_ASSIGNED", `Assigned roles [${assignedRoles.join(", ")}] to ${user.name} (${user.email})`);
    return user;
  },

  // ── 11. REAL-TIME CLOUD FIRESTORE SYNCHRONIZATION ──────────────────────────
  _lastSyncTime: 0,
  _syncPromise: null as Promise<any> | null,

  syncFromCloud: async (force: boolean = false) => {
    const now = Date.now();
    // Cache for 15 seconds unless forced to prevent redundant network calls
    if (!force && (now - (mockDB as any)._lastSyncTime < 15000) && memoryStore.isInitialized) {
      return;
    }
    if ((mockDB as any)._syncPromise) {
      return (mockDB as any)._syncPromise;
    }

    (mockDB as any)._syncPromise = (async () => {
      try {
        const data = await firebaseService.pullAllData();
        (mockDB as any)._lastSyncTime = Date.now();
        if (!data) return;

        const deletedIds = memoryStore.deletedIds;

        // 1. Symposiums
        if (Array.isArray(data.symposiums) && data.symposiums.length > 0) {
          memoryStore.symposiums = data.symposiums;
          const currentSym = data.symposiums.find(s => s.status === "current") || data.symposiums[0];
          if (currentSym?.id) {
            memoryStore.activeSymposiumId = currentSym.id;
          }
        }

        // 2. Users & Participants — Ensure ALL DEFAULT_USERS are preserved with multi-key cross-indexing
        if (Array.isArray(data.users)) {
          const userMap = new Map<string, User>();

          const insertOrMergeUser = (u: User) => {
            if (!u) return;
            const emailKey = (u.email || "").toLowerCase().trim();
            const pidKey = (u.participantId || "").toLowerCase().trim();
            const idKey = (u.id || "").toLowerCase().trim();

            const existing = (emailKey ? userMap.get(emailKey) : null) ||
                             (pidKey ? userMap.get(pidKey) : null) ||
                             (idKey ? userMap.get(idKey) : null);

            const isVerified = (existing?.paymentStatus || "").toLowerCase() === "verified" ||
                               (u.paymentStatus || "").toLowerCase() === "verified" ||
                               (existing?.paymentStatus || "").toLowerCase() === "paid" ||
                               (u.paymentStatus || "").toLowerCase() === "paid";

            const paymentStatus = isVerified
              ? "Verified"
              : (((u.paymentStatus || "").toLowerCase() === "rejected") || ((existing?.paymentStatus || "").toLowerCase() === "rejected"))
                ? "Rejected"
                : "Pending";

            if (!existing) {
              const created: User = {
                ...u,
                paymentStatus,
                roles: Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [u.role || "coordinator"]
              };
              if (emailKey) userMap.set(emailKey, created);
              if (pidKey) userMap.set(pidKey, created);
              if (idKey) userMap.set(idKey, created);
            } else {
              const oldEmail = (existing.email || "").toLowerCase().trim();
              const oldPid = (existing.participantId || "").toLowerCase().trim();
              const oldId = (existing.id || "").toLowerCase().trim();
              const oldReg = (existing.registrationId || "").toLowerCase().trim();

              const mergedRoles = Array.from(new Set([
                ...(existing.roles || [existing.role]),
                ...(u.roles || [u.role])
              ]));
              Object.assign(existing, {
                ...u,
                id: existing.id || u.id,
                participantId: existing.participantId || u.participantId,
                registrationId: existing.registrationId || u.registrationId,
                roles: mergedRoles,
                role: existing.role || u.role,
                department: u.department || existing.department,
                phone: u.phone || existing.phone,
                paymentStatus,
                paymentDetails: isVerified ? (existing.paymentDetails || u.paymentDetails) : (u.paymentDetails || existing.paymentDetails),
                registeredEvents: Array.from(new Set([...(existing.registeredEvents || []), ...(u.registeredEvents || [])])),
                achievements: Array.from(new Set([...(existing.achievements || []), ...(u.achievements || [])]))
              });

              if (oldEmail) userMap.set(oldEmail, existing);
              if (oldPid) userMap.set(oldPid, existing);
              if (oldId) userMap.set(oldId, existing);
              if (oldReg) userMap.set(oldReg, existing);
              if (emailKey) userMap.set(emailKey, existing);
              if (pidKey) userMap.set(pidKey, existing);
              if (idKey) userMap.set(idKey, existing);
            }
          };

          // 1. Retain all active in-memory users (volunteers, judges, participants created in portal)
          for (const memUser of memoryStore.users) {
            if (deletedIds.has(memUser.id) || deletedIds.has((memUser.email || "").toLowerCase().trim())) continue;
            insertOrMergeUser(memUser);
          }

          // 2. Ensure ALL authentic default staff and coordinators are present
          for (const defUser of DEFAULT_USERS) {
            if (deletedIds.has(defUser.id) || deletedIds.has((defUser.email || "").toLowerCase().trim())) continue;
            insertOrMergeUser(defUser);
          }

          // 3. Merge cloud users from Firestore
          for (const u of data.users) {
            if (deletedIds.has(u.id) || deletedIds.has(u.participantId || "")) continue;
            insertOrMergeUser(u);
          }

          memoryStore.users = Array.from(new Set(userMap.values()));
          saveCloudSnapshotToLocalStorage();

          const curr = getSessionUser();
          if (curr) {
            const cEmail = (curr.email || "").toLowerCase().trim();
            const cPid = (curr.participantId || "").toLowerCase().trim();
            const cId = (curr.id || "").toLowerCase().trim();

            const fresh = memoryStore.users.find(u =>
              (cId && (u.id || "").toLowerCase() === cId) ||
              (cPid && (u.participantId || "").toLowerCase() === cPid) ||
              (cEmail && (u.email || "").toLowerCase() === cEmail) ||
              (curr.registrationId && u.registrationId === curr.registrationId)
            );
            if (fresh) {
              setSessionUser({ ...curr, ...fresh });
              if (fresh.paymentStatus === "Verified" && fresh.role === "student") {
                try {
                  mockDB.generateFoodToken(fresh);
                } catch {}
              }
            }
          }
        }

        // 3. Events (Missions) - Cloud Firestore is 100% Single Source of Truth
        if (Array.isArray(data.events) && data.events.length > 0) {
          const validEvents: Mission[] = [];
          for (const e of data.events) {
            // Unmark any old deleted flags for events active in Firestore
            memoryStore.deletedIds.delete(e.id);
            if (e.name) memoryStore.deletedIds.delete(e.name.trim().toLowerCase());
            validEvents.push({
              ...e,
              symposiumId: e.symposiumId || "integra-2026",
              status: e.status || "Open"
            });
          }
          memoryStore.missions = validEvents;
        }

        // 4. Teams & Requests
        if (Array.isArray(data.teams)) {
          memoryStore.teams = data.teams.filter(t => !deletedIds.has(t.id));
        }

        // 5. Refreshments
        const cloudStalls = (data as any).stalls || (data as any).refreshmentStalls;
        if (Array.isArray(cloudStalls)) memoryStore.stalls = cloudStalls;
        if (Array.isArray((data as any).refreshmentTokens)) memoryStore.refreshmentTokens = (data as any).refreshmentTokens;
        if (Array.isArray((data as any).refreshmentTxns)) memoryStore.refreshmentTxns = (data as any).refreshmentTxns;

        // 6. Scores, Colleges, Settings, Logs, Certificates
        if (Array.isArray(data.scores)) memoryStore.scores = data.scores;
        if (Array.isArray(data.colleges) && data.colleges.length > 0) {
          memoryStore.colleges = data.colleges.map(c => ({
            id: c.id,
            name: c.name || "",
            code: c.code || "DBC",
            points: Number(c.points) || 0
          }));
        }
        if (data.settings) memoryStore.settings = { ...DEFAULT_SETTINGS, ...data.settings };
        if (Array.isArray(data.activityLogs)) memoryStore.activityLogs = data.activityLogs;
        if (Array.isArray(data.gallery)) memoryStore.gallery = data.gallery;
        if (Array.isArray(data.faqs)) memoryStore.faqs = data.faqs;
        if (Array.isArray(data.certificates)) memoryStore.certificates = data.certificates;
        if (Array.isArray(data.foodTokens)) memoryStore.foodTokens = data.foodTokens;
        if (Array.isArray(data.feedbacks)) memoryStore.feedbacks = data.feedbacks;

        memoryStore.isInitialized = true;
      } catch (e) {
        console.error("Cloud Firestore synchronization error:", e);
      } finally {
        (mockDB as any)._syncPromise = null;
      }
    })();

    return (mockDB as any)._syncPromise;
  },

    addUser: (user: User) => {
    if (!user.id || user.id === "undefined") {
      user.id = `${user.role || "user"}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    }
    user.symposiumId = user.symposiumId || mockDB.getActiveSymposiumId() || "integra-2026";
    unmarkDeletedId(user.id);
    if (user.participantId) unmarkDeletedId(user.participantId);

    const idx = memoryStore.users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      memoryStore.users[idx] = { ...memoryStore.users[idx], ...user };
    } else {
      memoryStore.users.push(user);
    }
    firebaseService.saveUser(user);
    if (user.role === "student") firebaseService.saveParticipant(user);
  },

  addUserAsync: async (user: User): Promise<User> => {
    mockDB.addUser(user);
    await firebaseService.saveUser(user);
    if (user.role === "student") await firebaseService.saveParticipant(user);
    return user;
  },

  deleteUser: (id: string) => {
    markDeletedId(id);
    memoryStore.users = memoryStore.users.filter(u => u.id !== id && u.participantId !== id);
    firebaseService.deleteUser(id);
  },

  deleteUserAsync: async (id: string): Promise<void> => {
    markDeletedId(id);
    memoryStore.users = memoryStore.users.filter(u => u.id !== id && u.participantId !== id);
    await firebaseService.deleteUser(id);
    await firebaseService.deleteParticipant(id);
  },

  deleteStudent: async (studentOrId: any) => {
    let targetId = "";
    let targetPid = "";
    let targetRegId = "";
    let targetEmail = "";

    if (typeof studentOrId === "object" && studentOrId !== null) {
      targetId = studentOrId.id || "";
      targetPid = studentOrId.participantId || "";
      targetRegId = studentOrId.registrationId || "";
      targetEmail = (studentOrId.email || "").toLowerCase().trim();
    } else {
      targetId = String(studentOrId);
      const found = memoryStore.users.find(u => u.id === targetId || u.participantId === targetId || u.registrationId === targetId);
      if (found) {
        targetPid = found.participantId || "";
        targetRegId = found.registrationId || "";
        targetEmail = (found.email || "").toLowerCase().trim();
      }
    }

    if (targetId) markDeletedId(targetId);
    if (targetPid) markDeletedId(targetPid);
    if (targetRegId) markDeletedId(targetRegId);
    if (targetEmail) markDeletedId(targetEmail);

    memoryStore.users = memoryStore.users.filter(u => {
      if (targetId && u.id === targetId) return false;
      if (targetPid && (u.id === targetPid || u.participantId === targetPid)) return false;
      if (targetRegId && (u.id === targetRegId || u.registrationId === targetRegId)) return false;
      if (targetEmail && u.email && u.email.toLowerCase().trim() === targetEmail) return false;
      return true;
    });

    await firebaseService.deleteUser(studentOrId);
  },

  serveFood: (tokenId: string, volunteerId: string) => {
    return mockDB.redeemFoodToken(tokenId, volunteerId);
  },

  scanQRCode: (qrData: string, scanType: "food" | "event" | "refreshment" | "verify", extraId?: string, operatorId: string = "OPERATOR") => {
    const cleanQR = (qrData || "").trim();
    if (scanType === "food") {
      return mockDB.redeemFoodToken(cleanQR, operatorId);
    }
    if (scanType === "event" && extraId) {
      mockDB.scanEventAttendance(cleanQR, extraId, operatorId);
      return { success: true, message: "Attendance verified" };
    }
    if (scanType === "verify") {
      return mockDB.verifyPayment(cleanQR, operatorId);
    }
    return { success: true };
  },

  clearAllRegistrations: async (adminId: string = "SUPER_ADMIN") => {
    memoryStore.users = memoryStore.users.filter(u => u.role !== "student");
    memoryStore.teams = [];
    memoryStore.joinRequests = [];
    memoryStore.foodTokens = [];
    memoryStore.refreshmentTxns = [];
    memoryStore.refreshmentTokens = [];
    mockDB.logActivity(adminId, "Super Administrator", "CLEAR_ALL_REGISTRATIONS", "Purged all student registrations from Cloud Firestore database.");
    await firebaseService.clearAllParticipantsFromCloud();
  },

  // ── 12. VOLUNTEERS ────────────────────────────────────────────────────────
  getVolunteers: (symposiumId?: string): User[] => {
    const activeSym = symposiumId || mockDB.getActiveSymposiumId();
    return memoryStore.users.filter(u => {
      const roleStr = (u.role || "").toLowerCase().trim();
      const rolesArr = Array.isArray(u.roles) ? u.roles.map((r: string) => String(r).toLowerCase().trim()) : [];
      const isVol = roleStr === "volunteer" || rolesArr.includes("volunteer") || Boolean(u.volunteerDuty);
      return isVol && (!u.symposiumId || isMatchingSymposium(u.symposiumId, activeSym));
    });
  },

  assignVolunteerDuty: (volunteerId: string, dutyInput: string | VolunteerDuty, adminId: string = "ADMIN", assignedVenue?: string, assignedEventId?: string) => {
    const vol = memoryStore.users.find(u => u.id === volunteerId);
    if (!vol) throw new Error("Volunteer record not found.");

    if (typeof dutyInput === "string") {
      (vol as any).dutyDescription = dutyInput;
      if (assignedVenue) (vol as any).assignedVenue = assignedVenue;
      if (assignedEventId) (vol as any).assignedEventId = assignedEventId;
      mockDB.logActivity(adminId, "Administrator", "DUTY_ASSIGNED", `Assigned duty to ${vol.name}: ${dutyInput}`);
    } else {
      vol.volunteerDuty = dutyInput;
      (vol as any).dutyDescription = `${dutyInput.station}: ${dutyInput.venueName || dutyInput.eventName || ""}`;
      mockDB.logActivity(adminId, "Administrator", "DUTY_ASSIGNED", `Assigned station ${dutyInput.station} to ${vol.name}`);
    }

    firebaseService.saveUser(vol);
  },

  saveVolunteer: (volunteer: any, adminId: string = "Admin Office"): User => {
    const volId = (volunteer.id && String(volunteer.id).trim() && volunteer.id !== "undefined")
      ? String(volunteer.id).trim()
      : `vol-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const activeSym = (volunteer.symposiumId && String(volunteer.symposiumId).trim())
      ? String(volunteer.symposiumId).trim()
      : mockDB.getActiveSymposiumId() || "integra-2026";

    const fullVol: User = {
      ...volunteer,
      id: volId,
      symposiumId: activeSym,
      name: (volunteer.name || "Volunteer").trim(),
      email: (volunteer.email || `vol-${volId}@integra.in`).trim().toLowerCase(),
      role: "volunteer",
      password: volunteer.password || "volunteer123",
      phone: volunteer.phone || "",
      department: volunteer.department || "Computer Science",
      assignedEventId: volunteer.assignedEventId,
      assignedVenue: volunteer.assignedVenue,
      dutyDescription: volunteer.dutyDescription,
      volunteerDuty: volunteer.volunteerDuty || {
        station: "Gate Entry",
        venueName: "Campus Main Gate Entry",
        shift: "Full Day",
        status: "Active",
        notes: ""
      }
    };
    unmarkDeletedId(fullVol.id);
    const idx = memoryStore.users.findIndex(u => u.id === fullVol.id || (u.email && fullVol.email && u.email.toLowerCase() === fullVol.email.toLowerCase()));
    if (idx !== -1) {
      memoryStore.users[idx] = fullVol;
    } else {
      memoryStore.users.push(fullVol);
    }
    mockDB.logActivity(adminId, "Administrator", "VOLUNTEER_SAVED", `Saved volunteer profile for ${fullVol.name}`);
    saveCloudSnapshotToLocalStorage();
    firebaseService.saveUser(fullVol);
    return fullVol;
  },

  saveVolunteerAsync: async (volunteer: any, adminId: string = "Admin Office"): Promise<User> => {
    let pass = volunteer.password || "volunteer123";
    if (pass && !/^[a-f0-9]{64}$/i.test(pass)) {
      pass = await hashPassword(pass);
    }
    const fullVol = mockDB.saveVolunteer({ ...volunteer, password: pass }, adminId);
    await firebaseService.saveUser(fullVol);
    return fullVol;
  },

  deleteVolunteer: (id: string, adminId: string = "Admin Office") => {
    markDeletedId(id);
    memoryStore.users = memoryStore.users.filter(u => u.id !== id);
    mockDB.logActivity(adminId, "Administrator", "VOLUNTEER_DELETED", `Removed volunteer profile ${id}`);
    firebaseService.deleteUser(id);
  },

  deleteVolunteerAsync: async (id: string, adminId: string = "Admin Office"): Promise<void> => {
    markDeletedId(id);
    memoryStore.users = memoryStore.users.filter(u => u.id !== id);
    mockDB.logActivity(adminId, "Administrator", "VOLUNTEER_DELETED", `Removed volunteer profile ${id}`);
    await firebaseService.deleteUser(id);
  },

  // ── 13. REFRESHMENT STALLS & DIGITAL BALANCE ─────────────────────────────
  getRefreshmentStalls: (symposiumId?: string): RefreshmentStall[] => {
    const symId = symposiumId || mockDB.getActiveSymposiumId();
    return memoryStore.stalls.filter(s => isMatchingSymposium(s.symposiumId, symId) && !memoryStore.deletedIds.has(s.id));
  },

  getRefreshmentStallById: (id: string): RefreshmentStall | undefined => {
    return memoryStore.stalls.find(s => s.id === id);
  },

  addRefreshmentStall: (stall: RefreshmentStall, adminName: string = "Admin") => {
    if (!stall.id || stall.id === "undefined") {
      stall.id = `stall-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    }
    unmarkDeletedId(stall.id);
    const symId = stall.symposiumId || mockDB.getActiveSymposiumId() || "integra-2026";
    stall.symposiumId = symId;
    const idx = memoryStore.stalls.findIndex(s => s.id === stall.id);
    if (idx !== -1) {
      memoryStore.stalls[idx] = stall;
    } else {
      memoryStore.stalls.push(stall);
    }
    mockDB.logActivity("ADMIN", adminName, "STALL_SAVED", `Saved refreshment stall ${stall.name}`);
    firebaseService.saveStall(stall);

    if (stall.operatorUsername && stall.operatorPassword) {
      const opUser: User = {
        id: `stall-op-${stall.id}`,
        symposiumId: symId,
        email: stall.operatorEmail || stall.operatorUsername,
        username: stall.operatorUsername,
        password: stall.operatorPassword,
        name: `${stall.name} Operator`,
        role: "stall_operator",
        assignedStallId: stall.id,
        assignedStallName: stall.name,
        department: "Refreshment Desk",
        phone: stall.contactPhone || ""
      };
      mockDB.updateUser(opUser);
    }
  },

  addRefreshmentStallAsync: async (stall: RefreshmentStall, adminName: string = "Admin"): Promise<RefreshmentStall> => {
    mockDB.addRefreshmentStall(stall, adminName);
    await firebaseService.saveStall(stall);
    if (stall.operatorUsername && stall.operatorPassword) {
      const opUser = memoryStore.users.find(u => u.id === `stall-op-${stall.id}`);
      if (opUser) await firebaseService.saveUser(opUser);
    }
    return stall;
  },

  updateRefreshmentStall: (stall: RefreshmentStall, adminName: string = "Admin") => {
    mockDB.addRefreshmentStall(stall, adminName);
  },

  updateRefreshmentStallAsync: async (stall: RefreshmentStall, adminName: string = "Admin"): Promise<RefreshmentStall> => {
    return await mockDB.addRefreshmentStallAsync(stall, adminName);
  },

  deleteRefreshmentStall: (id: string, adminName: string = "Admin") => {
    markDeletedId(id);
    const s = memoryStore.stalls.find(item => item.id === id);
    memoryStore.stalls = memoryStore.stalls.filter(s => s.id !== id);
    mockDB.logActivity("ADMIN", adminName, "STALL_DELETED", `Deleted refreshment stall ${s?.name || id}`);
    firebaseService.deleteStall(id);
    firebaseService.deleteUser(`stall-op-${id}`);
  },

  deleteRefreshmentStallAsync: async (id: string, adminName: string = "Admin"): Promise<void> => {
    markDeletedId(id);
    const s = memoryStore.stalls.find(item => item.id === id);
    memoryStore.stalls = memoryStore.stalls.filter(s => s.id !== id);
    mockDB.logActivity("ADMIN", adminName, "STALL_DELETED", `Deleted refreshment stall ${s?.name || id}`);
    await firebaseService.deleteStall(id);
    await firebaseService.deleteUser(`stall-op-${id}`);
  },

  getRefreshmentTransactions: (symposiumId?: string): RefreshmentTransaction[] => {
    const symId = symposiumId || mockDB.getActiveSymposiumId();
    return memoryStore.refreshmentTxns.filter(t => isMatchingSymposium(t.symposiumId, symId)).sort((a, b) => new Date(b.timestamp || "").getTime() - new Date(a.timestamp || "").getTime());
  },

  getRefreshmentTokens: (symposiumId?: string): RefreshmentToken[] => {
    const symId = symposiumId || mockDB.getActiveSymposiumId();
    return memoryStore.refreshmentTokens.filter(t => isMatchingSymposium(t.symposiumId, symId));
  },

  getRefreshmentTokenForParticipant: (participantId: string, symposiumId?: string): RefreshmentToken => {
    const symId = symposiumId || mockDB.getActiveSymposiumId();
    const cleanPid = (participantId || "").trim();
    let token = memoryStore.refreshmentTokens.find(t =>
      (t.participantId === cleanPid || t.studentId === cleanPid) &&
      isMatchingSymposium(t.symposiumId, symId)
    );

    if (!token) {
      const student = memoryStore.users.find(u => u.id === cleanPid || u.participantId === cleanPid);
      const activeSym = mockDB.getActiveSymposium();
      const defaultAllowance = activeSym.refreshmentAllowance || 20;

      token = {
        id: `rtok-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        symposiumId: symId,
        participantId: student?.participantId || cleanPid,
        participantName: student?.name || "Participant",
        studentId: student?.id || cleanPid,
        studentName: student?.name || "Participant",
        totalAllowance: defaultAllowance,
        initialAllowance: defaultAllowance,
        usedAmount: 0,
        remainingAmount: defaultAllowance,
        balance: defaultAllowance,
        totalClaimed: 0,
        status: "AVAILABLE",
        createdAt: new Date().toISOString()
      };
      memoryStore.refreshmentTokens.push(token);
      firebaseService.saveRefreshmentToken(token);
    }

    token.remainingAmount = token.remainingAmount ?? token.balance ?? 20;
    token.totalAllowance = token.totalAllowance ?? token.initialAllowance ?? 20;
    token.balance = token.remainingAmount;
    token.usedAmount = token.usedAmount ?? token.totalClaimed ?? 0;
    token.totalClaimed = token.usedAmount;
    return token;
  },

  processRefreshmentClaim: (claimInput: any): { success: boolean; transaction?: RefreshmentTransaction; txn?: RefreshmentTransaction; remainingBalance: number; message: string; error?: string } => {
    const symId = claimInput.symposiumId || mockDB.getActiveSymposiumId();
    const pid = claimInput.qrPayload || claimInput.participantId;
    const token = mockDB.getRefreshmentTokenForParticipant(pid, symId);
    const amount = Number(claimInput.amount) || (Number(claimInput.itemPrice || 0) * Number(claimInput.quantity || 1)) || 0;

    if (token.remainingAmount < amount) {
      const msg = `Insufficient balance. Required: ₹${amount}, Available: ₹${token.remainingAmount}`;
      return {
        success: false,
        remainingBalance: token.remainingAmount,
        message: msg,
        error: msg
      };
    }

    const prevBal = token.remainingAmount;
    token.remainingAmount -= amount;
    token.balance = token.remainingAmount;
    token.usedAmount += amount;
    token.totalClaimed = token.usedAmount;
    token.lastClaimAt = new Date().toISOString();
    token.lastClaimedAt = token.lastClaimAt;
    token.status = token.remainingAmount === 0 ? "FULLY_USED" : "PARTIALLY_USED";

    const txn: RefreshmentTransaction = {
      id: `RTXN-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
      symposiumId: symId,
      tokenId: token.id,
      participantId: token.participantId,
      participantName: token.participantName,
      studentName: token.participantName,
      participantCollege: token.participantCollege,
      stallId: claimInput.stallId,
      stallName: claimInput.stallName || "Refreshment Stall",
      operatorId: claimInput.operatorId || "operator",
      operatorName: claimInput.operatorName || "Stall Operator",
      amount,
      totalAmount: amount,
      previousBalance: prevBal,
      remainingBalance: token.remainingAmount,
      itemDescription: claimInput.itemDescription || claimInput.itemName || "Snacks",
      date: new Date().toLocaleDateString("en-IN"),
      time: new Date().toLocaleTimeString("en-IN"),
      timestamp: new Date().toISOString(),
      status: "COMPLETED",
      servedBy: claimInput.servedBy || claimInput.operatorName || "Stall Operator"
    };

    memoryStore.refreshmentTxns.unshift(txn);
    firebaseService.saveRefreshmentTxn(txn);
    firebaseService.saveRefreshmentToken(token);

    return {
      success: true,
      transaction: txn,
      txn,
      remainingBalance: token.remainingAmount,
      message: `Successfully redeemed ₹${amount}. Remaining balance: ₹${token.remainingAmount}`
    };
  },

  reverseRefreshmentTransaction: (txnId: string, adminId: string = "ADMIN", reason: string = "Cancelled by Operator"): { success: boolean; message?: string; error?: string } => {
    const txn = memoryStore.refreshmentTxns.find(t => t.id === txnId);
    if (!txn) return { success: false, error: "Transaction not found.", message: "Transaction not found." };
    if (txn.status === "REVERSED") return { success: false, error: "Transaction is already reversed.", message: "Transaction is already reversed." };

    txn.status = "REVERSED";
    const token = memoryStore.refreshmentTokens.find(t =>
      (t.participantId === txn.participantId || t.studentId === txn.participantId) &&
      isMatchingSymposium(t.symposiumId, txn.symposiumId)
    );

    const amt = Number(txn.amount ?? txn.totalAmount ?? 0);
    if (token) {
      token.remainingAmount = (token.remainingAmount || 0) + amt;
      token.balance = token.remainingAmount;
      token.usedAmount = Math.max(0, (token.usedAmount || 0) - amt);
      token.totalClaimed = token.usedAmount;
      firebaseService.saveRefreshmentToken(token);
    }

    mockDB.logActivity(adminId, "Administrator", "REFRESHMENT_REVERSED", `Reversed transaction ₹${amt} for ${txn.participantName || txn.studentName || txn.participantId}. Reason: ${reason}`);
    firebaseService.saveRefreshmentTxn(txn);
    return { success: true, message: "Transaction reversed successfully." };
  },

  adjustParticipantRefreshmentBalance: (participantId: string, adjustmentAmount: number, reason: string = "Admin Adjustment", adminId: string = "ADMIN"): { success: boolean; token: RefreshmentToken; message?: string; error?: string } => {
    const token = mockDB.getRefreshmentTokenForParticipant(participantId);
    token.remainingAmount = Math.max(0, (token.remainingAmount || 0) + adjustmentAmount);
    token.balance = token.remainingAmount;
    if (adjustmentAmount > 0) {
      token.totalAllowance = (token.totalAllowance || 0) + adjustmentAmount;
      token.initialAllowance = token.totalAllowance;
    }
    mockDB.logActivity(adminId, "Administrator", "REFRESHMENT_BALANCE_ADJUSTED", `Adjusted balance for ${token.participantName || token.studentName || participantId} by ${adjustmentAmount >= 0 ? "+" : ""}${adjustmentAmount}. New Balance: ₹${token.remainingAmount}. Reason: ${reason}`);
    firebaseService.saveRefreshmentToken(token);
    return { success: true, token, message: `Adjusted balance by ₹${adjustmentAmount}` };
  },

  getRefreshmentOverview: (symposiumId?: string) => {
    const symId = symposiumId || mockDB.getActiveSymposiumId();
    const stalls = mockDB.getRefreshmentStalls(symId);
    const txns = mockDB.getRefreshmentTransactions(symId).filter(t => t.status === "COMPLETED");
    const tokens = mockDB.getRefreshmentTokens(symId);

    const totalRedeemedAmount = txns.reduce((acc, t) => acc + (t.amount ?? t.totalAmount ?? 0), 0);
    const totalTransactions = txns.length;
    const totalAllocatedAllowance = tokens.reduce((acc, t) => acc + (t.totalAllowance ?? t.initialAllowance ?? 0), 0);
    const totalRemainingAllowance = tokens.reduce((acc, t) => acc + (t.remainingAmount ?? t.balance ?? 0), 0);

    const stallStats = stalls.map(s => {
      const stallTxns = txns.filter(t => t.stallId === s.id);
      const stallAmount = stallTxns.reduce((acc, t) => acc + (t.amount ?? t.totalAmount ?? 0), 0);
      return {
        stallId: s.id,
        stallName: s.name,
        stallLocation: s.location,
        totalItemsSold: stallTxns.reduce((acc, t) => acc + (t.quantity || 1), 0),
        totalRevenue: stallAmount,
        transactionCount: stallTxns.length
      };
    });

    return {
      totalStalls: stalls.length,
      totalTransactions,
      totalRedeemedAmount,
      totalAllocatedAllowance,
      totalRemainingAllowance,
      stallStats
    };
  },

  // ── 14. FEEDBACKS ─────────────────────────────────────────────────────────
  getFeedbacks: () => {
    return memoryStore.feedbacks;
  },

  submitFeedback: async (feedback: any) => {
    const newFb = {
      ...feedback,
      id: feedback.id || `fb-${Date.now()}`,
      timestamp: feedback.timestamp || new Date().toLocaleString()
    };
    memoryStore.feedbacks.unshift(newFb);
    await firebaseService.saveFeedback(newFb);
    return newFb;
  },

  clearFeedbacks: async () => {
    memoryStore.feedbacks = [];
    await firebaseService.clearFeedbacks();
  }
};

// ============================================================================
// Server-Only Authentication & Cryptographic Session Management
// NEVER IMPORT THIS FILE IN CLIENT-SIDE COMPONENTS
// ============================================================================

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
  department?: string;
  exp: number; // Expiration timestamp in ms
}

export interface ServerStaffAccount {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "admin" | "coordinator" | "judge" | "volunteer";
  department: string;
  phone: string;
  passwordHash: string; // SHA-256 hash only — NO plaintext passwords
}

export const SESSION_COOKIE_NAME = "int_session_token";
export const ROLE_COOKIE_NAME = "int_auth_role";

// Secret key used for signing session HMAC tokens
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.SESSION_SECRET || "integra_super_secure_auth_session_secret_2026_jwt_token_sign_key_ai_fest";

// Default Faculty & Admin Staff Credentials (SHA-256 hashes ONLY — no plaintext)
export const DEFAULT_SERVER_STAFF: ServerStaffAccount[] = [
  {
    id: "user-superadmin",
    email: "integra@dbcyelagiri.edu.in",
    name: "System Controller",
    role: "super_admin",
    department: "Administration",
    phone: "+91 98765 00000",
    passwordHash: "713f906950b583b5abd4739c7e697c5259f3a9f917517884fd6bacd2cfa96132"
  },
  {
    id: "user-admin-naveen",
    email: "naveen@dbcyelagiri.edu.in",
    name: "Dr. NAVEEN A",
    role: "admin",
    department: "Computer Science",
    phone: "+91 9176404299",
    passwordHash: "7a79ba99a2119e73f1993dd4dd9affd91641182d709ada35a56c50ab47360187"
  },
  {
    id: "user-admin-immanuvel",
    email: "immanuvel@dbcyelagiri.edu.in",
    name: "Dr. IMMANUVEL S",
    role: "admin",
    department: "Computer Science",
    phone: "+91 9751097321",
    passwordHash: "bb3df73a617bbde6bc72ab0bd9b66eb715a8a179a0cba8e7606f5cb3b9d5dbaf"
  },
  {
    id: "user-admin-danielabishek",
    email: "danielabishek@dbcyelagiri.edu.in",
    name: "Mr. DANIEL ABISHEK B",
    role: "admin",
    department: "Computer Science",
    phone: "+91 9363439807",
    passwordHash: "72537105949371c0e71b25fcf7263814a1ff784cd433401cdb0c1d0a51be81e5"
  },
  {
    id: "user-coord-radhakrishnan",
    email: "radhakrishnan@dbcyelagiri.edu.in",
    name: "Dr. RADHAKRISHNAN",
    role: "coordinator",
    department: "Computer Science",
    phone: "+91 9994124235",
    passwordHash: "3da3c506679799a45325184542db0bf3931863b3b811218c94a0ea14500ba54c"
  },
  {
    id: "user-coord-naveenkumar",
    email: "naveenkumar@dbcyelagiri.edu.in",
    name: "Mr. Naveen Kumar",
    role: "coordinator",
    department: "Computer Science",
    phone: "+91 8678933014",
    passwordHash: "7ed425efb1ad088fb073b10ec2a04cd66b61be816cddd4d93d11808480fb9da4"
  },
  {
    id: "user-coord-poovarasi",
    email: "poovarasi@dbcyelagiri.edu.in",
    name: "Miss. POOVARASI",
    role: "coordinator",
    department: "Computer Science",
    phone: "+91 9750206184",
    passwordHash: "4e2424afd551ed13c65c2f268f7b253b8cda2011dd056e355a7c6a6b6492d72b"
  },
  {
    id: "user-coord-kamaleshwar",
    email: "kamaleshwar@dbcyelagiri.edu.in",
    name: "Mr. KAMALESHWAR",
    role: "coordinator",
    department: "Computer Science",
    phone: "+91 9047242137",
    passwordHash: "4a97469b31697dc719c5aadb74ec6b7a207e5c8eeed39487140400a4f20e5b6f"
  },
  {
    id: "user-coord-vasantharani",
    email: "vasantharani@dbcyelagiri.edu.in",
    name: "Mrs. VASANTHARANI",
    role: "coordinator",
    department: "Computer Science",
    phone: "+91 9486940899",
    passwordHash: "f8a3d853f8056c4e3582b39480705be1d0d0505b289e91f53fd244cd93bb48d7"
  }
];

// Helper: Compute SHA-256 hex string using Web Crypto
export async function sha256Async(message: string): Promise<string> {
  const enc = new TextEncoder();
  const msgBuffer = enc.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Helpers for Base64Url encoding/decoding without external libraries
function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Creates a cryptographically signed HMAC-SHA256 session token.
 */
export async function signSessionToken(payload: Omit<SessionPayload, "exp">, expiresInSeconds: number = 86400): Promise<string> {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Date.now() + expiresInSeconds * 1000
  };
  const enc = new TextEncoder();
  const payloadJson = JSON.stringify(fullPayload);
  const payloadB64 = bytesToBase64Url(enc.encode(payloadJson));
  
  const key = await getHmacKey();
  const signatureBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payloadB64));
  const signatureB64 = bytesToBase64Url(new Uint8Array(signatureBuf));

  return `${payloadB64}.${signatureB64}`;
}

/**
 * Verifies the cryptographic HMAC signature and expiration of a session token.
 * Returns the decoded payload if valid, or null if tampered/expired.
 */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, signatureB64] = parts;
  try {
    const key = await getHmacKey();
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    
    const sigBytes = base64UrlToBytes(signatureB64);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes as unknown as BufferSource,
      enc.encode(payloadB64)
    );

    if (!isValid) return null;

    const payloadJson = dec.decode(base64UrlToBytes(payloadB64));
    const payload: SessionPayload = JSON.parse(payloadJson);

    if (!payload.exp || Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Verifies credentials for staff against server-side definitions.
 */
export async function authenticateServerStaff(identifier: string, rawPassword: string): Promise<Omit<ServerStaffAccount, "passwordHash"> | null> {
  const cleanId = identifier.trim().toLowerCase();
  const staff = DEFAULT_SERVER_STAFF.find(s => s.email.toLowerCase() === cleanId || s.id.toLowerCase() === cleanId);
  if (!staff) return null;

  const inputHash = await sha256Async(rawPassword.trim());
  if (inputHash.toLowerCase() === staff.passwordHash.toLowerCase()) {
    const { passwordHash, ...safeStaff } = staff;
    return safeStaff;
  }
  return null;
}

/**
 * Checks if the given identifier or email belongs to a master staff/faculty account.
 */
export function isServerStaff(identifier: string): boolean {
  const cleanId = (identifier || "").trim().toLowerCase();
  return DEFAULT_SERVER_STAFF.some(s => s.email.toLowerCase() === cleanId || s.id.toLowerCase() === cleanId);
}


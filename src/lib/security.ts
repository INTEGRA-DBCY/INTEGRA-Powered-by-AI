/**
 * Security & Cryptographic Utilities
 * Provides SHA-256 password hashing, HTML escaping (Anti-XSS/Injection), and data sanitization
 */

export function escapeHtml(str: string): string {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function hashPassword(password: string): Promise<string> {
  if (!password) return "";
  if (/^[a-f0-9]{64}$/i.test(password)) {
    return password.toLowerCase();
  }

  // 1. Browser Web Crypto
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    } catch {}
  }

  // 2. Global Web Crypto (Node 18+, Edge runtime, Workers)
  if (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    } catch {}
  }

  // 3. Node.js Crypto module fallback
  try {
    const crypto = await import("crypto");
    return crypto.createHash("sha256").update(password).digest("hex");
  } catch (e) {
    return "";
  }
}

/**
 * Synchronous hash function for initialization and secure validation
 */
export function hashPasswordSync(password: string): string {
  if (!password) return "";
  if (/^[a-f0-9]{64}$/i.test(password)) {
    return password.toLowerCase();
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require("crypto");
    if (crypto && typeof crypto.createHash === "function") {
      return crypto.createHash("sha256").update(password).digest("hex");
    }
  } catch {}

  return password;
}

/**
 * Sanitize a user object by removing raw credentials before passing to UI components
 */
export function sanitizeUser<T extends Record<string, any>>(user: T): Omit<T, "password"> {
  if (!user) return user;
  const { password, ...safeUser } = user;
  return safeUser as Omit<T, "password">;
}

/**
 * Sanitize an array of users
 */
export function sanitizeUsers<T extends Record<string, any>>(users: T[]): Omit<T, "password">[] {
  if (!Array.isArray(users)) return [];
  return users.map(u => sanitizeUser(u));
}

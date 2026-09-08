export const validateFullName = (name: string): { valid: boolean; error?: string } => {
  const clean = (name || "").trim();
  if (!clean || clean.length < 3) {
    return { valid: false, error: "Full Name must be at least 3 characters long." };
  }
  if (/^\d+$/.test(clean) || /^[0-9\s]+$/.test(clean)) {
    return { valid: false, error: "Full Name cannot consist of numeric values alone. Please enter a valid name." };
  }
  if (!/[a-zA-Z]/.test(clean)) {
    return { valid: false, error: "Full Name must contain alphabetic letters." };
  }
  if (!/^[a-zA-Z\s.'-]+$/.test(clean)) {
    return { valid: false, error: "Full Name contains invalid characters. Only letters, spaces, dots, and hyphens are allowed." };
  }
  return { valid: true };
};

export const validateDepartment = (department: string): { valid: boolean; error?: string } => {
  const clean = (department || "").trim();
  if (!clean || clean.length < 2) {
    return { valid: false, error: "Department is required and must be at least 2 characters long." };
  }
  if (/^\d+$/.test(clean) || /^[0-9\s]+$/.test(clean)) {
    return { valid: false, error: "Department field cannot consist of numeric values alone. Please enter a valid department." };
  }
  if (!/[a-zA-Z]/.test(clean)) {
    return { valid: false, error: "Department field must contain valid alphabetic letters." };
  }
  return { valid: true };
};

export const validateCollege = (college: string): { valid: boolean; error?: string } => {
  const clean = (college || "").trim();
  if (!clean || clean.length < 2) {
    return { valid: false, error: "College name is required." };
  }
  if (/^\d+$/.test(clean) || /^[0-9\s]+$/.test(clean)) {
    return { valid: false, error: "College name cannot consist of numeric values alone." };
  }
  if (!/[a-zA-Z]/.test(clean)) {
    return { valid: false, error: "College name must contain valid alphabetic letters." };
  }
  return { valid: true };
};

export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  const clean = (email || "").trim();
  if (!clean) {
    return { valid: false, error: "Email address is required." };
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(clean)) {
    return { valid: false, error: "Please enter a valid email address (e.g. student@college.edu.in)." };
  }
  return { valid: true };
};

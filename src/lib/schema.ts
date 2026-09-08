import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().optional()
});

export const registrationSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters." }),
  email: z.string().email({ message: "Enter a valid email address." }),
  phone: z.string().min(10, { message: "Enter a valid 10-digit mobile number." }),
  gender: z.enum(["Male", "Female", "Other"], { message: "Please select your gender." }),
  college: z.string().min(2, { message: "Please select or type your college name." }),
  department: z.string().min(2, { message: "Department name is required." }),
  year: z.string().min(1, { message: "Please select your year of study." }),
  photoUrl: z.string().min(5, { message: "Photo is required for your Hall Ticket & AI Passport." }),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the terms & conditions to register."
  })
});

export const symposiumSchema = z.object({
  id: z.string().min(2),
  name: z.string().min(2, { message: "Symposium name is required." }),
  theme: z.string().optional(),
  tagline: z.string().optional(),
  year: z.string().min(4),
  academicYear: z.string().optional(),
  logoUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  description: z.string().optional(),
  regFee: z.coerce.number().min(0),
  registrationOpen: z.boolean().default(false),
  regStartDate: z.string().optional(),
  regEndDate: z.string().optional(),
  symposiumDate: z.string().optional(),
  venue: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  maxParticipants: z.coerce.number().min(1).default(500),
  maxEventsPerParticipant: z.coerce.number().min(1).default(3),
  status: z.enum(["current", "upcoming", "archived"]).default("current")
});

export const scoreSchema = z.object({
  studentId: z.string().min(1, { message: "Select a student to evaluate." }),
  missionId: z.string().min(1, { message: "Select the assigned AI Mission." }),
  criteriaScores: z.record(z.string(), z.coerce.number().min(0).max(100)).optional(),
  remarks: z.string().min(3, { message: "Please provide constructive feedback." })
});

export const announcementSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  content: z.string().min(10, { message: "Content must be at least 10 characters." }),
  category: z.enum(["General", "Mission", "Schedule", "Emergency"])
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegistrationFormValues = z.infer<typeof registrationSchema>;
export type SymposiumFormValues = z.infer<typeof symposiumSchema>;
export type ScoreFormValues = z.infer<typeof scoreSchema>;
export type AnnouncementFormValues = z.infer<typeof announcementSchema>;


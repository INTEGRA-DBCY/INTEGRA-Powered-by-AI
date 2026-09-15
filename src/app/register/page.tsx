"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cpu, User, Mail, Phone, GraduationCap, Calendar, Clock, Check, AlertCircle, Sparkles, ArrowRight } from "lucide-react";
import { mockDB, College } from "@/lib/mock-db";
import { validateFullName, validateEmail, validateDepartment, validateCollege } from "@/lib/validation";

export default function RegisterPage() {
  const router = useRouter();
  const [colleges, setColleges] = useState<College[]>([]);
  const [settings, setSettings] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    college: "",
    customCollege: "",
    shift: "",
    department: "",
    year: "3rd Year",
    photoUrl: "",
    termsAccepted: false
  });

  const [validationError, setValidationError] = useState("");
  const [registeredStudent, setRegisteredStudent] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [symposium, setSymposium] = useState<any>(null);

  useEffect(() => {
    mockDB.init();
    setColleges(mockDB.getColleges());
    setSettings(mockDB.getSettings());
    setSymposium(mockDB.getActiveSymposium());

    // Pull real-time cloud data from Cloud Firestore
    mockDB.syncFromCloud().then(() => {
      setColleges(mockDB.getColleges());
      setSettings(mockDB.getSettings());
      setSymposium(mockDB.getActiveSymposium());
    });
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let sanitizedVal = value;

    // Enforce strictly 10 digits for phone numbers
    if (name === "phone") {
      sanitizedVal = value.replace(/\D/g, "").slice(0, 10);
    }

    setFormData((prev) => ({ ...prev, [name]: sanitizedVal }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    // Check if registration is open
    if (symposium && !symposium.registrationOpen) {
      setValidationError(`Registration is currently closed for ${symposium.name} ${symposium.year}.`);
      return;
    }

    // Strict Validation
    const nameVal = validateFullName(formData.name);
    if (!nameVal.valid) {
      setValidationError(nameVal.error || "Invalid Full Name.");
      return;
    }

    const emailVal = validateEmail(formData.email);
    if (!emailVal.valid) {
      setValidationError(emailVal.error || "Invalid Email Address.");
      return;
    }

    if (!formData.phone.trim() || formData.phone.trim().replace(/\D/g, "").length !== 10) {
      setValidationError("Mobile number must be exactly 10 digits.");
      return;
    }

    if (!formData.gender) {
      setValidationError("Please select your gender.");
      return;
    }

    if (!formData.college) {
      setValidationError("Please select your college.");
      return;
    }

    if (formData.college === "Other College") {
      const colVal = validateCollege(formData.customCollege);
      if (!colVal.valid) {
        setValidationError(colVal.error || "Invalid college name.");
        return;
      }
    }


    const deptVal = validateDepartment(formData.department);
    if (!deptVal.valid) {
      setValidationError(deptVal.error || "Invalid department name.");
      return;
    }
    if (!formData.photoUrl.trim()) {
      setValidationError("Please upload your passport size photo for Hall Ticket & AI Passport generation.");
      return;
    }
    if (!formData.termsAccepted) {
      setValidationError("You must accept the terms & conditions to complete registration.");
      return;
    }

    setIsSubmitting(true);

    try {
      const studentData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        gender: formData.gender,
        college: formData.college === "Other College" ? formData.customCollege.trim() : formData.college,
        shift: formData.shift ? formData.shift.trim() : undefined,
        department: formData.department.trim(),
        year: formData.year,
        photoUrl: formData.photoUrl.trim()
      };

      const newStudent = await mockDB.registerStudentAsync(studentData);
      setRegisteredStudent(newStudent);

      // Send welcome email with login credentials to participant's inbox
      fetch("/api/send-welcome-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStudent.name,
          email: newStudent.email,
          username: newStudent.username || newStudent.participantId || newStudent.email,
          password: newStudent.password,
          participantId: newStudent.participantId,
          registrationId: newStudent.registrationId,
          college: newStudent.college,
          shift: newStudent.shift || formData.shift || "",
          department: newStudent.department,
          year: newStudent.year,
          gender: newStudent.gender,
          phone: newStudent.phone
        })
      }).catch((e) => {
        console.warn("Welcome email dispatch notice:", e);
      });

    } catch (err: any) {
      setValidationError(err.message || "Registration failed. Duplicate email or Participant ID.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 relative cyber-grid selection:bg-purple-500 selection:text-slate-900 font-bold">
      {/* Decorative ambient glows */}
      <div className="absolute top-20 left-1/4 w-80 h-80 bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-sky-500/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-xl w-full mx-auto p-6 md:p-8 rounded-3xl bg-white/95 border border-purple-300 shadow-2xl shadow-purple-950/40 relative overflow-hidden backdrop-blur-xl text-slate-900 font-bold">
        <div className="scanner-ray" />
        
        {/* Header */}
        <div className="flex flex-col items-center mb-6 border-b border-slate-200 pb-5">
          <Link href="/" className="flex items-center gap-3 mb-2 cursor-pointer group">
            <div className="p-2 rounded-2xl bg-slate-50 border border-purple-500/40 shadow-[0_0_16px_rgba(168,85,247,0.4)] flex items-center justify-center group-hover:scale-105 transition-transform">
              <img src="/integra-logo.png" alt="INTEGRA Logo" className="h-9 w-9 object-contain rounded-xl filter drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] brightness-125 contrast-105" />
            </div>
            <span className="font-heading font-black text-xl tracking-wider text-slate-900 font-black group-hover:text-blue-600 transition-colors">{symposium?.name || settings?.eventTitle || "INTEGRA"} {symposium?.year || "2026"}</span>
          </Link>
          <p className="text-xs text-blue-700 font-mono font-medium text-center mb-3">{symposium?.tagline || "INTER-COLLEGE TECHNICAL SYMPOSIUM"}</p>
          
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[10px] uppercase tracking-wider bg-emerald-100 text-emerald-900 font-mono font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
              One-Time Registration
            </span>
            <span className="text-[10px] uppercase tracking-wider bg-blue-100 text-blue-900 font-mono font-bold px-2.5 py-0.5 rounded-full border border-blue-300">
              Fee: ₹{symposium?.regFee ?? 150} (Offline at Desk)
            </span>
            {!symposium?.registrationOpen && (
              <span className="text-[10px] uppercase tracking-wider bg-rose-100 text-rose-900 font-bold font-mono font-bold px-2.5 py-0.5 rounded-full border border-red-500/40">
                Registration Closed
              </span>
            )}
          </div>
        </div>

        {/* Closed notice */}
        {symposium && !symposium.registrationOpen && (
          <div className="p-4 mb-6 rounded-xl bg-amber-50 border border-amber-200 border border-amber-500/40 text-amber-200 text-xs font-sans leading-relaxed">
            <strong className="font-bold">⚠️ Online Registrations are currently closed.</strong> If you need on-spot admission or queries, please contact the coordinator at <span className="font-mono font-semibold">{symposium.contactPhone || "+91 98765 43210"}</span>.
          </div>
        )}

        {/* Validation error panel */}
        {validationError && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 border border-red-500/60 text-red-200 text-xs text-center font-mono flex items-center justify-center gap-2">
            <AlertCircle size={16} className="text-rose-900 font-extrabold" />
            <span>{validationError}</span>
          </div>
        )}

        {registeredStudent ? (
          /* Confirmation Screen */
          <div className="space-y-6 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 border border-emerald-500/60 rounded-full flex items-center justify-center mx-auto text-emerald-800 font-extrabold shadow-md shadow-emerald-500/20">
              <Check size={32} />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-heading font-black text-slate-900 mb-1">REGISTRATION SUCCESSFUL!</h2>
              <p className="text-xs text-slate-600 font-medium">Welcome to INTEGRA! Your symposium account & credentials are ready.</p>
            </div>

            {/* Login Credentials Highlight Box - High Contrast & Fully Visible */}
            <div className="bg-slate-900 border-2 border-purple-500 rounded-2xl p-4 sm:p-5 text-left space-y-3 shadow-2xl shadow-purple-950/40">
              <div className="text-xs font-mono font-black text-amber-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-700/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔐</span>
                  <span className="text-white font-bold">YOUR LOGIN CREDENTIALS</span>
                </div>
                <span className="text-[10px] bg-purple-900/80 text-purple-200 border border-purple-400/40 px-2 py-0.5 rounded-full font-mono font-semibold">
                  SAVE THESE
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-300 font-medium">Login Username / Email</span>
                <span className="text-emerald-300 font-bold bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 select-all break-all">
                  {registeredStudent.email}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-300 font-medium">Access Passcode (Password)</span>
                <span className="text-amber-300 font-black bg-purple-950 border border-purple-400 px-3 py-1 rounded-lg text-sm tracking-wider select-all shadow-inner">
                  {registeredStudent.password}
                </span>
              </div>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-600">Participant ID</span>
                <span className="text-blue-900 font-extrabold">{registeredStudent.participantId}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-600">Full Name</span>
                <span className="text-slate-900 font-extrabold">{registeredStudent.name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-600">College</span>
                <span className="text-blue-700 truncate max-w-[200px]">{registeredStudent.college}</span>
              </div>
              {registeredStudent.shift && (
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-slate-600">Shift</span>
                  <span className="text-purple-700 font-bold bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">{registeredStudent.shift}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Payment Status</span>
                <span className="text-orange-600 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded border border-amber-500/40">
                  PENDING (Pay at Admin Desk)
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50 border border-emerald-200 border border-emerald-500/30 rounded-xl text-left text-xs text-slate-700 leading-relaxed font-sans flex items-start gap-2.5">
              <span className="text-base">📧</span>
              <div>
                <strong className="text-emerald-800 font-extrabold">Email Dispatched:</strong> A welcome confirmation email with your <strong>Username</strong>, <strong>Password</strong>, and <strong>Participant ID</strong> has been sent to <span className="font-mono font-bold text-emerald-950 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300">{registeredStudent.email}</span>.
              </div>
            </div>

            <button
              onClick={() => router.push("/login")}
              className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] uppercase tracking-wider text-xs cursor-pointer shadow-lg shadow-purple-600/30 font-mono"
            >
              <span>Go to Login Console</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          /* Registration Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-700 text-[10.5px] font-mono mb-1 uppercase tracking-widest font-bold">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3.5 top-2.5 text-slate-600" size={16} />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleTextChange}
                  placeholder="e.g. Grace Hopper"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-700 font-semibold text-slate-900 font-bold font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 text-[10.5px] font-mono mb-1 uppercase tracking-widest font-bold">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-2.5 text-slate-600" size={16} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleTextChange}
                  placeholder="e.g. grace@college.edu"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-700 font-semibold text-slate-900 font-bold font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block text-slate-700 text-[10.5px] font-mono mb-1 uppercase tracking-widest font-bold">Mobile Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-2.5 text-slate-600" size={16} />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleTextChange}
                    placeholder="10-digit Mobile No."
                    maxLength={10}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-700 font-semibold text-slate-900 font-bold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 text-[10.5px] font-mono mb-1 uppercase tracking-widest font-bold">Gender *</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleTextChange}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono cursor-pointer"
                >
                  <option value="" disabled>Select Gender *</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block text-slate-700 text-[10.5px] font-mono mb-1 uppercase tracking-widest font-bold">College Name *</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3.5 top-2.5 text-slate-600" size={16} />
                  <select
                    name="college"
                    value={formData.college}
                    onChange={handleTextChange}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono cursor-pointer"
                  >
                    <option value="">Select College</option>
                    {colleges.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    <option value="Other College">Other Institution</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 text-[10.5px] font-mono mb-1 uppercase tracking-widest font-bold">Department *</label>
                <div className="relative">
                  <Cpu className="absolute left-3.5 top-2.5 text-slate-600" size={16} />
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleTextChange}
                    placeholder="e.g. Computer Science"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-700 font-semibold text-slate-900 font-bold font-mono"
                  />
                </div>
              </div>
            </div>

            {formData.college === "Other College" && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="block text-slate-700 text-[10.5px] font-mono mb-1 uppercase tracking-widest font-bold">Specify College Name *</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3.5 top-2.5 text-slate-600" size={16} />
                  <input
                    type="text"
                    name="customCollege"
                    value={formData.customCollege}
                    onChange={handleTextChange}
                    placeholder="Enter your college / university name..."
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-700 font-semibold text-slate-900 font-bold font-mono"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-700 text-[10.5px] font-mono mb-1 uppercase tracking-widest font-bold">Academic Year *</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-2.5 text-slate-600" size={16} />
                <select
                  name="year"
                  value={formData.year}
                  onChange={handleTextChange}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono cursor-pointer"
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="Final Year">Final Year</option>
                  <option value="Post Graduate (PG)">Post Graduate (PG)</option>
                </select>
              </div>
            </div>

            {/* Shift Option for Those Applicable */}
            <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-800 text-[11px] font-mono uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <Clock size={14} className="text-purple-600" />
                  <span>College Shift Option</span>
                </label>
                <span className="text-[10px] font-mono text-purple-700 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full font-bold">
                  If Applicable
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mb-2 font-sans leading-tight">
                For colleges with multiple shifts, select your shift below:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, shift: "" }))}
                  className={`py-2 px-1 text-xs font-mono font-bold rounded-xl border transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                    !formData.shift
                      ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span>Regular / N/A</span>
                  <span className={`text-[9px] ${!formData.shift ? "text-purple-200" : "text-slate-500"} font-normal`}>Single Shift</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, shift: "Shift I" }))}
                  className={`py-2 px-1 text-xs font-mono font-bold rounded-xl border transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                    formData.shift === "Shift I"
                      ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span>Shift I</span>
                  <span className={`text-[9px] ${formData.shift === "Shift I" ? "text-purple-200" : "text-slate-500"} font-normal`}>Day / Morning</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, shift: "Shift II" }))}
                  className={`py-2 px-1 text-xs font-mono font-bold rounded-xl border transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                    formData.shift === "Shift II"
                      ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span>Shift II</span>
                  <span className={`text-[9px] ${formData.shift === "Shift II" ? "text-purple-200" : "text-slate-500"} font-normal`}>Evening / SF</span>
                </button>
              </div>
            </div>

            {/* Participant Photo Upload */}
            <div>
              <label className="block text-slate-700 text-[10.5px] font-mono mb-1 uppercase tracking-widest font-bold">Participant Photo (for Passport & Hall Ticket)</label>
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-300 rounded-xl p-3">
                <div className="w-14 h-14 rounded-xl border border-purple-500/50 overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center shadow-xs">
                  {formData.photoUrl ? (
                    <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="text-slate-600" size={24} />
                  )}
                </div>
                <div className="flex-1 text-xs space-y-1">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const validMimes = ["image/jpeg", "image/jpg", "image/png"];
                        const fileExt = file.name.split('.').pop()?.toLowerCase();
                        if (!validMimes.includes(file.type) && !["jpg", "jpeg", "png"].includes(fileExt || "")) {
                          alert("Only JPEG, JPG, and PNG image files are allowed.");
                          e.target.value = "";
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const rawData = evt.target?.result as string;
                          try {
                            const img = new Image();
                            img.onload = () => {
                              const canvas = document.createElement("canvas");
                              const maxDim = 240;
                              let width = img.width;
                              let height = img.height;
                              if (width > height) {
                                if (width > maxDim) {
                                  height = Math.round((height * maxDim) / width);
                                  width = maxDim;
                                }
                              } else {
                                if (height > maxDim) {
                                  width = Math.round((width * maxDim) / height);
                                  height = maxDim;
                                }
                              }
                              canvas.width = width;
                              canvas.height = height;
                              const ctx = canvas.getContext("2d");
                              ctx?.drawImage(img, 0, 0, width, height);
                              const compressed = canvas.toDataURL("image/jpeg", 0.7);
                              setFormData(prev => ({ ...prev, photoUrl: compressed }));
                            };
                            img.onerror = () => {
                              setFormData(prev => ({ ...prev, photoUrl: rawData }));
                            };
                            img.src = rawData;
                          } catch {
                            setFormData(prev => ({ ...prev, photoUrl: rawData }));
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-700 font-semibold font-mono">Upload passport size photo (.jpg, .png auto-optimized)</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  name="termsAccepted"
                  checked={formData.termsAccepted}
                  onChange={(e) => setFormData((prev) => ({ ...prev, termsAccepted: e.target.checked }))}
                  className="mt-0.5 rounded accent-purple-500 w-4 h-4 cursor-pointer"
                />
                <span>I verify that all submitted details are accurate and agree to follow the symposium guidelines.</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full mt-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-slate-900 font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-transform uppercase tracking-wider text-xs font-mono shadow-lg shadow-purple-600/30 ${
                isSubmitting ? "opacity-75 cursor-not-allowed" : "hover:scale-[1.01] cursor-pointer"
              }`}
            >
              <span>{isSubmitting ? "Connecting to Cloud..." : "Complete One-Time Registration"}</span>
              <Sparkles size={16} className={isSubmitting ? "animate-spin" : ""} />
            </button>
          </form>
        )}

      </div>
    </div>
  );
}

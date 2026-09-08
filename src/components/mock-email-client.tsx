"use client";

import { useState, useEffect } from "react";
import { Mail, X, Trash, Inbox, Check } from "lucide-react";

interface MockEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  read?: boolean;
}

export default function MockEmailClient() {
  const [isOpen, setIsOpen] = useState(false);
  const [emails, setEmails] = useState<MockEmail[]>([]);
  const [activeEmail, setActiveEmail] = useState<MockEmail | null>(null);

  useEffect(() => {
    loadEmails();
    // Poll local storage periodically to update in real time
    const interval = setInterval(loadEmails, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadEmails = () => {
    if (typeof window !== "undefined") {
      const stored = JSON.parse(localStorage.getItem("int_mock_emails") || "[]");
      setEmails(stored);
    }
  };

  const markAllAsRead = () => {
    const updated = emails.map(e => ({ ...e, read: true }));
    localStorage.setItem("int_mock_emails", JSON.stringify(updated));
    setEmails(updated);
  };

  const deleteEmail = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = emails.filter(email => email.id !== id);
    localStorage.setItem("int_mock_emails", JSON.stringify(updated));
    setEmails(updated);
    if (activeEmail?.id === id) {
      setActiveEmail(null);
    }
  };

  const handleEmailClick = (email: MockEmail) => {
    setActiveEmail(email);
    const updated = emails.map(e => e.id === email.id ? { ...e, read: true } : e);
    localStorage.setItem("int_mock_emails", JSON.stringify(updated));
    setEmails(updated);
  };

  const unreadCount = emails.filter(e => !e.read).length;

  if (emails.length === 0 && !isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans">
      {/* Floating Mail Badge */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-[#0284C7] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#0284C7] text-white p-3.5 rounded-full shadow-xl shadow-[#0284C7]/20 flex items-center justify-center relative cursor-pointer group transition-all duration-300 hover:scale-105 border border-sky-300"
          title="Open Mock Mail Client"
        >
          <Mail size={20} className="group-hover:rotate-12 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Mock Mail App Frame */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[400px] bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="p-3 bg-white border border-slate-200 shadow-sm border-b border-slate-800 flex justify-between items-center text-xs">
            <div className="flex items-center gap-1.5">
              <Inbox size={14} className="text-blue-900 font-extrabold" />
              <span className="font-heading font-black tracking-wider text-slate-900 font-bold">MOCK MAIL SIMULATOR</span>
              {unreadCount > 0 && (
                <span className="bg-red-500/20 text-rose-900 font-bold text-[8px] font-mono font-black px-1 py-0.5 rounded">
                  {unreadCount} NEW
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[9px] font-mono text-slate-800 font-bold hover:text-emerald-800 font-extrabold uppercase cursor-pointer"
                  title="Mark all as read"
                >
                  Mark Read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-700 font-semibold hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Mail Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Active Email View */}
            {activeEmail ? (
              <div className="flex-1 flex flex-col p-3 bg-slate-50 text-slate-800 text-xs overflow-y-auto">
                <button
                  onClick={() => setActiveEmail(null)}
                  className="text-sky-600 font-mono text-[10px] font-bold mb-2 cursor-pointer hover:underline"
                >
                  ← Back to Inbox
                </button>
                <div className="border-b border-slate-200 pb-2 mb-2">
                  <h3 className="font-bold text-slate-900 text-sm mb-1">{activeEmail.subject}</h3>
                  <div className="text-[10px] text-slate-700 font-semibold font-mono">
                    To: {activeEmail.to} | {activeEmail.timestamp}
                  </div>
                </div>
                <div
                  className="prose prose-xs text-slate-700 font-sans leading-relaxed overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: activeEmail.body }}
                />
              </div>
            ) : (
              /* Inbox List */
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
                {emails.length === 0 ? (
                  <div className="p-8 text-center text-slate-700 font-semibold text-xs italic">
                    No emails in simulator inbox.
                  </div>
                ) : (
                  emails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => handleEmailClick(email)}
                      className={`p-3 cursor-pointer hover:bg-sky-50/60 transition-colors flex justify-between items-start gap-2 ${
                        !email.read ? "bg-sky-50/40" : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {!email.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                          )}
                          <span className={`text-xs truncate ${!email.read ? "font-bold text-slate-900" : "text-slate-700"}`}>
                            {email.to}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-slate-800 truncate mb-1">
                          {email.subject}
                        </div>
                        <div className="text-[9.5px] text-slate-700 font-semibold font-mono">
                          {email.timestamp}
                        </div>
                      </div>
                      <button
                        onClick={(e) => deleteEmail(email.id, e)}
                        className="text-slate-800 font-bold hover:text-red-500 p-1 cursor-pointer transition-colors"
                        title="Delete Email"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

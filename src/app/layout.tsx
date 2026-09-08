import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import MockEmailClient from "@/components/mock-email-client";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "INTEGRA 2026 | State-Level Inter-College Tech Fest",
  description: "Inter-College Technical Competition Fest organized by the PG & Research Department of Computer Science, Don Bosco College (Co-Ed), Yelagiri Hills. Imagine • Prompt • Build",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased light overflow-x-hidden max-w-full`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-slate-900 font-bold relative overflow-x-hidden max-w-full w-full">
        {/* Admin Impersonation Switcher Top Banner */}
        
        <div className="relative z-10 flex-1 flex flex-col overflow-x-hidden max-w-full w-full">
          {children}
        </div>
        {/* Global Floating Multi-Role Switcher */}
        <MockEmailClient />
      </body>
    </html>
  );
}

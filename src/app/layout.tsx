"use client";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { StaffProvider } from "@/context/staff-context";
import { ThemeProvider } from "../context/theme-context";
import "@/lib/i18n";
import { useEffect, useState } from "react";
import i18n from "i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeScript = `(() => {try { const t = localStorage.getItem('theme'); if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) { document.documentElement.classList.add('dark'); } } catch(e) {}})();`;
  const [lang, setLang] = useState("en");
  useEffect(() => {
    setLang(i18n.language || "en");
  }, []);
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <StaffProvider>
              {children}
            </StaffProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

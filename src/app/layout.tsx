import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TopLoader } from "@/components/layout/TopLoader";
import "./globals.css";

const interFont = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenTicket - Security Hub",
  description: "Enterprise Cybersecurity Incident Response and Inventory Management Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // We enforce the 'dark' Tailwind configuration class at the root for a premium aesthetic 
  return (
    <html
      lang="en"
      className={`${interFont.variable} dark antialiased text-foreground bg-background selection:bg-primary selection:text-primary-foreground`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col font-sans" suppressHydrationWarning>
        <TopLoader />
        {/* Render child pages/layouts directly, enabling different layouts per route group */}
        {children}
      </body>
    </html>
  );
}

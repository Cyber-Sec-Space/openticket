import type { Metadata } from "next";
import { Inter } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
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
        <NextTopLoader 
          color="#10b981" 
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 15px #10b981,0 0 5px #10b981"
          zIndex={1600}
        />
        {/* Render child pages/layouts directly, enabling different layouts per route group */}
        {children}
      </body>
    </html>
  );
}

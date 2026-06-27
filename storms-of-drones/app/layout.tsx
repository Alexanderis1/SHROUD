import type { Metadata } from "next";
import { Inter, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  title: "STORMS OF DRONES — Infrastrutture Italia",
  description:
    "Autonomous drone swarm system for real-time public infrastructure monitoring, damage detection and anomaly reporting across Italy.",
  keywords: ["drones", "infrastructure", "Italy", "monitoring", "anomaly detection", "swarm"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${spaceMono.variable}`}>
      <body className="font-sans antialiased" style={{ fontFamily: "var(--font-space-grotesk), var(--font-inter), sans-serif" }}>
        {children}
      </body>
    </html>
  );
}

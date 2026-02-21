import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FitAI — Your Personal Fitness Coach",
  description: "AI-powered personalized workout and meal plans",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} antialiased bg-[#0a0a0a] min-h-screen text-white`}>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}

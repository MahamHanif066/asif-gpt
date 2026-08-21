import type { Metadata } from "next";
import { Geist, Geist_Mono, Caveat, Poppins } from "next/font/google";
// @ts-expect-error Next.js resolves global CSS imports at build time.
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-cursive",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const poppins = Poppins({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Maham Hanif - AI Mentor",
  description: "Your personal AI mentor and assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={geistSans.variable + " " + geistMono.variable + " " + caveat.variable + " " + poppins.variable + " antialiased"}>
        {children}
      </body>
    </html>
  );
}
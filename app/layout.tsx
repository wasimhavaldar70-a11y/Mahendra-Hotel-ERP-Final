import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "StayDesk - Simple Hotel PMS",
  description: "Simplify your hotel operations: Visual room map, returning customer 20-second check-in, checkouts, payments, reports, and identity vault.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full bg-[#F8FAFC] text-[#0F172A] antialiased`}>
        {children}
      </body>
    </html>
  );
}

"use client";
import Navbar from "../components/Navbar";
import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-[#f3f0ff] via-[#d9d6ff] to-[#bdb4ff] text-gray-900">
        <Navbar />
        <main className="pt-20 min-h-screen pb-10 px-3">{children}</main>
      </body>
    </html>
  );
}

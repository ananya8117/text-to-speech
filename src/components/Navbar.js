"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 shadow-lg">
      <nav className="max-w-7xl mx-auto flex justify-between items-center px-6 h-16">
        {/* Brand */}
        <h1 className="text-2xl font-extrabold text-white tracking-wide">
          Neural TTS
        </h1>

        {/* Links */}
        <ul className="flex gap-8">
          {[
            { href: "/", label: "Home" },
            { href: "/tts", label: "TTS" },
            { href: "/clone", label: "Voice Cloning" },
          ].map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`relative font-semibold transition-all duration-200 pb-1 ${
                  pathname === item.href
                    ? "text-indigo-300 after:absolute after:-bottom-1 after:left-0 after:w-full after:h-1 after:rounded-full after:bg-indigo-400"
                    : "text-white hover:text-indigo-300"
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

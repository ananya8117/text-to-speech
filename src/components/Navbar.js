"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { href: "/", label: "Home", icon: "🏠" },
    { href: "/tts", label: "TTS", icon: "🗣️" },
    { href: "/transcribe", label: "Transcribe", icon: "📝" },
    { href: "/clone", label: "Voice Clone", icon: "🎤" },
    { href: "/voices", label: "My Voices", icon: "🎵" },
    { href: "/dubbing", label: "Dubbing", icon: "🎬" },
    { href: "/privacy", label: "Privacy", icon: "🔐" },
    { href: "/voice-effects", label: "Effects", icon: "✨" },
  ];

  return (
    <header 
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-white/95 backdrop-blur-xl shadow-xl border-b border-purple-100/50" 
          : "bg-gradient-to-r from-indigo-900/90 via-purple-900/90 to-indigo-900/90 backdrop-blur-lg shadow-2xl"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 lg:h-20">
          {/* Brand */}
          <Link 
            href="/" 
            className={`flex items-center space-x-3 text-2xl lg:text-3xl font-bold tracking-tight transition-all duration-300 ${
              isScrolled 
                ? "text-gray-800 hover:text-indigo-600" 
                : "text-white hover:text-indigo-300"
            }`}
          >
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg lg:text-xl font-extrabold shadow-lg">
              N
            </div>
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Neural TTS
            </span>
          </Link>

          {/* Desktop Navigation */}
          <ul className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group relative flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                    pathname === item.href
                      ? isScrolled
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25"
                        : "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                      : isScrolled
                        ? "text-gray-600 hover:text-indigo-600 hover:bg-indigo-50"
                        : "text-white/90 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-sm font-semibold">{item.label}</span>
                  {pathname === item.href && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-current rounded-full opacity-80"></div>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`lg:hidden flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-200 ${
              isScrolled
                ? "text-gray-600 hover:text-indigo-600 hover:bg-indigo-50"
                : "text-white hover:text-indigo-300 hover:bg-white/10"
            }`}
            aria-label="Toggle mobile menu"
          >
            <svg
              className={`w-6 h-6 transform transition-transform duration-200 ${
                isMobileMenuOpen ? "rotate-90" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`lg:hidden absolute left-0 right-0 top-full bg-white/98 backdrop-blur-xl shadow-2xl border-t border-gray-100 transition-all duration-300 ease-in-out ${
            isMobileMenuOpen
              ? "opacity-100 transform translate-y-0"
              : "opacity-0 transform -translate-y-4 pointer-events-none"
          }`}
        >
          <ul className="py-4 px-4 space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    pathname === item.href
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg"
                      : "text-gray-700 hover:text-indigo-600 hover:bg-indigo-50"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-semibold">{item.label}</span>
                  {pathname === item.href && (
                    <div className="ml-auto w-2 h-2 bg-white rounded-full shadow-sm"></div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}

"use client";

import { useEffect, useState } from "react";
import { api, User } from "@/lib/api";
import Link from "next/link";

export default function Header() {
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check localStorage first, then system preference
    const stored = localStorage.getItem("darkMode");
    if (stored !== null) {
      const isDark = stored === "true";
      setDarkMode(isDark);
      document.documentElement.classList.toggle("dark", isDark);
    } else {
      // Default to system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDarkMode(prefersDark);
      document.documentElement.classList.toggle("dark", prefersDark);
    }

    // Check auth status
    api.getMe()
      .then((userData) => setUser(userData))
      .catch(() => setUser(null));
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle("dark", newMode);
    localStorage.setItem("darkMode", String(newMode));
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <Link href="/" className="text-xl font-bold text-gray-900 dark:text-gray-100 hover:text-blue-500 transition-colors">
        UW Hot Takes
      </Link>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {user.username}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="text-sm px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Sign up
            </Link>
          </div>
        )}

        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Toggle dark mode"
        >
          {darkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </div>
    </header>
  );
}
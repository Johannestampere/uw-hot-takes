"use client";

import { useEffect, useState } from "react";
import { api, User } from "@/lib/api";
import Link from "next/link";

export default function Header() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check auth status
    api.getMe()
      .then((userData) => setUser(userData))
      .catch(() => setUser(null));
  }, []);

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
    <header className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,215,0,0.3)] bg-zinc-900">
      <Link
        href="/"
        className="text-xl font-bold text-zinc-100 hover:text-[#ffd700] transition-all duration-150 clickable"
      >
        UW Hot Takes
      </Link>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-200 px-4">
              {user.username}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-all duration-150 clickable"
            >
              Log Out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-all duration-150 clickable"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="text-sm px-4 py-2 bg-[#ffd700] text-black font-medium rounded-lg hover:bg-[#e6c200] transition-all duration-150 clickable"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
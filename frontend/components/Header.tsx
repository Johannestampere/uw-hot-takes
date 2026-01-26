"use client";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";
import Image from "next/image";

export default function Header() {
  const { user, setUser } = useAuth();

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-zinc-900">
      <Link
        href="/"
        className="hover:opacity-80 transition-all duration-150 clickable text-[20px]"
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
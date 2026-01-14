"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = "info", onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: "bg-green-500 dark:bg-green-600",
    error: "bg-red-500 dark:bg-red-600",
    info: "bg-blue-500 dark:bg-blue-600",
  };

  const icons = {
    success: "✓",
    error: "✕",
    info: "Info",
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div
        className={`${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-md`}
      >
        <span className="text-xl">{icons[type]}</span>
        <p className="flex-1">{message}</p>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white transition-colors"
          aria-label="Close"
        >
          x
        </button>
      </div>
    </div>
  );
}
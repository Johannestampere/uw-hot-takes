import { useState, useCallback } from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    const id = toastId++;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const success = useCallback((message: string) => {
    showToast(message, "success");
  }, [showToast]);

  const error = useCallback((message: string) => {
    showToast(message, "error");
  }, [showToast]);

  const info = useCallback((message: string) => {
    showToast(message, "info");
  }, [showToast]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return {
    toasts,
    showToast,
    success,
    error,
    info,
    removeToast,
  };
}

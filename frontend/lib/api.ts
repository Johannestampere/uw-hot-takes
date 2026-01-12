import { config } from "./config";

export interface Take {
  id: string;
  content: string;
  like_count: number;
  created_at: string;
  username: string;
  user_liked: boolean;
}

export interface TakesResponse {
  takes: Take[];
  next_cursor: string | null;
}

export interface User {
  id: string;
  email: string;
  username: string;
  created_at: string;
}

export type SortOption = "newest" | "hottest_24h" | "hottest_7d";

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${config.apiBaseUrl}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || "Request failed");
  }

  return res.json();
}

export const api = {
  // Auth
  register: (email: string, password: string) =>
    fetchApi<{ user: User; message: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    fetchApi<{ user: User; message: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    fetchApi<{ message: string }>("/auth/logout", { method: "POST" }),

  getMe: () => fetchApi<User>("/auth/me"),

  // Takes
  getTakes: (sort: SortOption = "newest", cursor?: string, limit = 20) => {
    const params = new URLSearchParams({ sort, limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return fetchApi<TakesResponse>(`/takes?${params}`);
  },

  getTake: (id: string) => fetchApi<Take>(`/takes/${id}`),

  createTake: (content: string) =>
    fetchApi<Take>("/takes", {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  deleteTake: (id: string) =>
    fetchApi<{ message: string }>(`/takes/${id}`, { method: "DELETE" }),
};
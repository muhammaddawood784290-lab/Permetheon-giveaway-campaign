import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

declare global {
  interface Window {
    __SUPABASE_URL?: string;
    __SUPABASE_PUBLISHABLE_KEY?: string;
  }
}

export const supabase = createClient<Database>(
  typeof window !== "undefined"
    ? (window.__SUPABASE_URL ?? process.env["SUPABASE_URL"] ?? "")
    : (process.env["SUPABASE_URL"] ?? ""),
  typeof window !== "undefined"
    ? (window.__SUPABASE_PUBLISHABLE_KEY ?? process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "")
    : (process.env["SUPABASE_PUBLISHABLE_KEY"] ?? ""),
  {
    auth: {
      persistSession: typeof window !== "undefined",
      autoRefreshToken: true,
    },
  },
);

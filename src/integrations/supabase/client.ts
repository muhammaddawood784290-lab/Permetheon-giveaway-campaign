import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

declare global {
  interface Window {
    __SUPABASE_URL?: string;
    __SUPABASE_PUBLISHABLE_KEY?: string;
  }
}

const url =
  typeof window !== "undefined"
    ? (window.__SUPABASE_URL ?? process.env["SUPABASE_URL"])
    : process.env["SUPABASE_URL"];

const key =
  typeof window !== "undefined"
    ? (window.__SUPABASE_PUBLISHABLE_KEY ?? process.env["SUPABASE_PUBLISHABLE_KEY"])
    : process.env["SUPABASE_PUBLISHABLE_KEY"];

export const supabaseConfigured =
  typeof url === "string" && url.length > 0 && typeof key === "string" && key.length > 0;

export const supabase = createClient<Database>(url ?? "", key ?? "", {
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: true,
  },
});

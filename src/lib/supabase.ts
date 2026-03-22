import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.NEXT_PUBLIC_ONE_LOVE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_ONE_LOVE_SUPABASE_PUBLISHABLE_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
    "Ensure NEXT_PUBLIC_ONE_LOVE_SUPABASE_URL and NEXT_PUBLIC_ONE_LOVE_SUPABASE_PUBLISHABLE_KEY are set."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

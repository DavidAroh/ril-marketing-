import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "The app isn't connected to its database yet. Copy .env.example to .env and add your project details, then reload."
    );
  }
  return createBrowserClient(url, anonKey);
}

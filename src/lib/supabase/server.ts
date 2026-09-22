import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/** Authenticated server-side Supabase client (RLS enforced, user context). */
export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("The app isn't connected to its database yet. The connection details still need to be added.");
  }
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — cookies are read-only there.
        }
      },
    },
  });
}

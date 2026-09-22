import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/onboarding"];

/**
 * Session refresh + page gating. API routes are left alone so they can
 * return machine-readable 401s (never redirects).
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) return response;

  const isPublic = pathname === "/" || PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (!user && !isPublic) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/sign-in";
    return NextResponse.redirect(signIn);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

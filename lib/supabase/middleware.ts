import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  APP_ROUTES,
  AUTH_ROUTES,
  PROTECTED_PREFIXES,
} from "@/lib/constants";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route);
  const isProtectedRoute = PROTECTED_PREFIXES.some((route) =>
    pathname.startsWith(route)
  );

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = APP_ROUTES.splash;
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute && pathname !== APP_ROUTES.splash) {
    const url = request.nextUrl.clone();
    url.pathname = APP_ROUTES.splash;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

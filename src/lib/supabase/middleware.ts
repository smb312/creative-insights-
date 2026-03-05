import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

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
          supabaseResponse = NextResponse.next({
            request,
          });
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

  // Public routes that don't require auth
  const isPublicRoute =
    pathname === "/login" || pathname.startsWith("/auth/callback");

  // If not authenticated and trying to access protected route, redirect to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If authenticated, handle role-based routing
  if (user) {
    // Fetch user role from our users table
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;

    // If on login page and authenticated, redirect based on role
    if (pathname === "/login") {
      const url = request.nextUrl.clone();
      if (role === "client") {
        url.pathname = "/portal/dashboard";
      } else {
        url.pathname = "/dashboard";
      }
      return NextResponse.redirect(url);
    }

    // Prevent client users from accessing agency routes
    if (
      role === "client" &&
      !pathname.startsWith("/portal") &&
      !isPublicRoute
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/portal/dashboard";
      return NextResponse.redirect(url);
    }

    // Prevent agency users from accessing portal routes
    if (
      role &&
      role !== "client" &&
      pathname.startsWith("/portal")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

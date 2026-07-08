import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  const modifiedHeaders = new Headers(request.headers);
  modifiedHeaders.set('x-pathname', request.nextUrl.pathname);

  const supabaseResponse = NextResponse.next({ request: { headers: modifiedHeaders } });

  const USE_MOCK =
    process.env.NEXT_PUBLIC_USE_MOCK === 'true' ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (USE_MOCK) return supabaseResponse;

  let response = supabaseResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: modifiedHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password');
  const isResetPage = pathname.startsWith('/reset-password');
  const isApiRoute = pathname.startsWith('/api');
  // Legal pages must stay reachable by logged-out visitors (and by Google's
  // OAuth verification reviewer) without being treated as an "auth" page —
  // a logged-in user should still be able to open them, not get bounced to
  // /dashboard the way visiting /login while signed in does.
  const isPublicPage = pathname.startsWith('/privacy') || pathname.startsWith('/terms');

  if (!user && !isAuthPage && !isResetPage && !isApiRoute && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

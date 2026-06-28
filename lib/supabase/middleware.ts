import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function updateSession(request: NextRequest) {
  // Inject the current pathname into request headers so server components (layouts)
  // can detect the active route via headers().get('x-pathname') without a header loop.
  const modifiedHeaders = new Headers(request.headers);
  modifiedHeaders.set('x-pathname', request.nextUrl.pathname);

  const supabaseResponse = NextResponse.next({
    request: { headers: modifiedHeaders },
  });

  // In mock/demo mode bypass auth checks — allow all pages to load normally
  if (USE_MOCK) {
    return supabaseResponse;
  }

  let response = supabaseResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Preserve the pathname header in the new response too
          response = NextResponse.next({ request: { headers: modifiedHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage =
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register') ||
    request.nextUrl.pathname.startsWith('/forgot-password');
  // Reset-password is public too, BUT the recovery link signs the user in via a
  // temporary session — so it must NOT be bounced to /dashboard like other auth
  // pages, or the user could never set a new password.
  const isResetPage = request.nextUrl.pathname.startsWith('/reset-password');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  if (!user && !isAuthPage && !isResetPage && !isApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';   // strip query params
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

const IS_WORKSPACE = process.env.NEXT_PUBLIC_EDITION === 'workspace';

// Kith Workspace (generic edition, work.kith.space): every page lives under
// app/w/ and is served at a clean URL via rewrite (/notes → /w/notes). Nothing
// from the therapist product is reachable in this edition.
const WS_PUBLIC = ['/login', '/privacy', '/terms', ...(process.env.NODE_ENV !== 'production' ? ['/preview'] : [])];

async function workspaceMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api/')) {
    // Only the workspace API (plus the shared DB keep-alive cron) exists in this edition.
    if (!pathname.startsWith('/api/w/') && pathname !== '/api/cron/keepalive') return new NextResponse('Not found', { status: 404 });
    return NextResponse.next();
  }

  const cleanPath = pathname.startsWith('/w/') ? pathname.slice(2) : pathname === '/w' ? '/' : pathname;
  const target = request.nextUrl.clone();
  target.pathname = cleanPath === '/' ? '/w' : `/w${cleanPath}`;

  let response = NextResponse.rewrite(target);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.rewrite(target);
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]));
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  const isPublic = WS_PUBLIC.some(p => cleanPath === p || cleanPath.startsWith(`${p}/`));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  if (user && cleanPath === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return response;
}

export async function middleware(request: NextRequest) {
  if (IS_WORKSPACE) return workspaceMiddleware(request);

  // Therapist edition: the workspace pages/API don't exist here.
  if (request.nextUrl.pathname === '/w' || request.nextUrl.pathname.startsWith('/w/') || request.nextUrl.pathname.startsWith('/api/w/')) {
    return new NextResponse('Not found', { status: 404 });
  }

  const modifiedHeaders = new Headers(request.headers);
  modifiedHeaders.set('x-pathname', request.nextUrl.pathname);

  const supabaseResponse = NextResponse.next({ request: { headers: modifiedHeaders } });

  const USE_MOCK =
    process.env.NEXT_PUBLIC_USE_MOCK === 'true' ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (USE_MOCK) return supabaseResponse;

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password');
  const isResetPage = pathname.startsWith('/reset-password');
  const isApiRoute = pathname.startsWith('/api');
  // Legal pages must stay reachable by logged-out visitors (and by Google's
  // OAuth verification reviewer) without being treated as an "auth" page —
  // a logged-in user should still be able to open them, not get bounced to
  // /dashboard the way visiting /login while signed in does.
  // opengraph-image/twitter-image are Next.js's dynamic metadata-image
  // routes — link-preview crawlers (WhatsApp, Slack, Twitter, etc.) fetch
  // these unauthenticated, so they must never redirect to /login either.
  // /blog is public marketing content; /sitemap.xml and /robots.txt are
  // fetched unauthenticated by crawlers (same reasoning as opengraph-image
  // below) and must never redirect to /login.
  const isPublicPage = pathname.startsWith('/privacy') || pathname.startsWith('/terms')
    || pathname.startsWith('/blog') || pathname === '/sitemap.xml' || pathname === '/robots.txt'
    || pathname.startsWith('/opengraph-image') || pathname.startsWith('/twitter-image')
    || pathname.startsWith('/soap-formatter');

  // The (dashboard) route group's top-level segments — the only paths worth
  // bouncing an unauthenticated visitor to /login for. Anything else (typos,
  // dead links, bot-guessed URLs) falls through to Next.js's own routing
  // instead, which 404s for real rather than silently resolving to a 200
  // /login page — that mismatch is what search engines flag as a soft 404.
  const PROTECTED_PREFIXES = ['/dashboard', '/appointments', '/insights', '/notes', '/onboarding', '/patients', '/session', '/settings'];
  const isKnownProtectedRoute = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // For reset/api/public paths, neither redirect below can ever fire (both
  // conditions require the opposite of these flags), so `user` would never
  // actually be read. Skip the round trip to Supabase's auth server entirely
  // for these — this is what was making every blog post, privacy/terms page,
  // and API route pay an auth network call on every request for nothing.
  if (isResetPage || isApiRoute || (isPublicPage && !isAuthPage)) {
    return supabaseResponse;
  }

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

  if (!user && !isAuthPage) {
    if (!isKnownProtectedRoute) {
      return supabaseResponse;
    }
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

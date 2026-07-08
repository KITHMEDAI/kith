export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.2,
      environment: process.env.NODE_ENV,
      // Never send PHI to Sentry
      beforeSend(event) {
        // Strip request bodies from error events
        if (event.request) {
          delete event.request.data;
          delete event.request.cookies;
          delete event.request.headers?.cookie;
          delete event.request.headers?.authorization;
        }
        return event;
      },
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    });
  }
}

// Sentry.init() above only sets up the client — without this export, Next.js
// never actually routes uncaught errors from Route Handlers/Server Components
// to it, so nothing ever gets reported regardless of a valid DSN.
export async function onRequestError(...args: Parameters<typeof import('@sentry/nextjs').captureRequestError>) {
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(...args);
}

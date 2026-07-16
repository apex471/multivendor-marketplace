import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Get hostname of request (e.g. demo.vercel.pub, demo.localhost:3000)
  const hostname = req.headers.get('host') || '';

  // Only for local development
  const isLocal = hostname.includes('localhost');
  
  // Set the default base domain
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || (isLocal ? 'localhost:3000' : 'certifiedluxuryworld.com');

  // We check if the request is to a subdomain
  if (hostname.includes(rootDomain)) {
    const subdomain = hostname.replace(`.${rootDomain}`, '');

    // if there is a subdomain and it's not the root domain or 'www'
    if (subdomain !== hostname && subdomain !== 'www') {
      // Rewrite to our dynamic site routing
      url.pathname = `/_sites/${subdomain}${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
  ],
};

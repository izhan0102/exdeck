import { NextRequest, NextResponse } from "next/server";

const CANONICAL_HOST = "exdeck.xyz";

export function middleware(req: NextRequest) {
  try {
    const { nextUrl } = req;
    const host = req.headers.get("host")?.toLowerCase() || "";
    const hostname = host.split(":")[0];
    const proto = req.headers.get("x-forwarded-proto") || nextUrl.protocol.replace(":", "");
    const isCanonicalDomain = hostname === CANONICAL_HOST || hostname === `www.${CANONICAL_HOST}`;
    const isWww = hostname === `www.${CANONICAL_HOST}`;
    const isHttp = isCanonicalDomain && proto === "http";

    if ((isWww || isHttp) && (req.method === "GET" || req.method === "HEAD")) {
      const url = new URL(nextUrl.pathname + nextUrl.search, `https://${CANONICAL_HOST}`);
      return NextResponse.redirect(url, 308);
    }

    return NextResponse.next();
  } catch {
    // A canonical-redirect helper must never take down the whole site.
    // If anything unexpected throws at the edge, serve the request as-is.
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!api/|_next/|icon|favicon.ico|google280f0213c028f296.html).*)",
  ],
};

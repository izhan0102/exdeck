import { NextRequest, NextResponse } from "next/server";

const CANONICAL_HOST = "exdeck.xyz";

export function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const host = req.headers.get("host")?.toLowerCase() || "";
  const proto = req.headers.get("x-forwarded-proto") || nextUrl.protocol.replace(":", "");
  const isWww = host === `www.${CANONICAL_HOST}`;
  const isHttp = proto === "http";

  if ((isWww || isHttp) && (req.method === "GET" || req.method === "HEAD")) {
    const url = nextUrl.clone();
    url.protocol = "https:";
    url.hostname = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/|_next/|icon|favicon.ico|google280f0213c028f296.html).*)",
  ],
};

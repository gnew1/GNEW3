// Bloqueo de scripts/trackers hasta consentimiento (web) 
import { NextResponse } from "next/server"; 
import type { NextRequest } from "next/server"; 
 
export function middleware(req: NextRequest) { 
  const url = req.nextUrl.clone(); 
  // Sólo afecta recursos de analytics (ej: /_script/analytics.js) 
  if (url.pathname.startsWith("/_script/analytics.js")) { 
    const cookie = req.cookies.get("gnew_consent")?.value; 
    if (!cookie) return new NextResponse("", { status: 204 }); // no 
carga 
    const pref = JSON.parse(Buffer.from(cookie, "base64").toString()); 
    if (!pref.an) return new NextResponse("", { status: 204 }); 
  } 
  return NextResponse.next(); 
} 
 

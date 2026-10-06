import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Behind Amplify's proxy request.url reports localhost, so resolve the public origin
// from the configured site URL or the forwarded headers instead.
function publicOrigin(request: NextRequest) {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site && !site.includes("localhost")) return site.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host && !host.startsWith("localhost")) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    return `${proto.split(",")[0]}://${host.split(",")[0]}`;
  }
  return new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = publicOrigin(request);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/today";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/today"}`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}

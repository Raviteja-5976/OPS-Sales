import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Relative Location: request.url reports localhost behind Amplify's proxy.
  return new NextResponse(null, { status: 303, headers: { Location: "/login" } });
}

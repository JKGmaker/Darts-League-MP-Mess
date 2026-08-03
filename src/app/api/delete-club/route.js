import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Deletes a club login and ALL of its players and coaches.
// Server-side with the service role key, admins only.
export async function POST(request) {
  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const token = (request.headers.get("authorization") || "").replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data: caller } = await svc.auth.getUser(token);
  if (!caller?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data: profile } = await svc.from("profiles").select("role").eq("id", caller.user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const { clubId } = await request.json();
  if (!clubId) return NextResponse.json({ error: "Missing club id" }, { status: 400 });
  if (clubId === caller.user.id) return NextResponse.json({ error: "You cannot delete your own admin account" }, { status: 400 });

  // Safety: only club accounts can be deleted through this route
  const { data: target } = await svc.from("profiles").select("role, club_name").eq("id", clubId).single();
  if (!target) return NextResponse.json({ error: "Club not found" }, { status: 404 });
  if (target.role !== "club") return NextResponse.json({ error: "Only club accounts can be deleted here" }, { status: 400 });

  // Deleting the auth user cascades: profile -> players -> coaches all removed
  const { error } = await svc.auth.admin.deleteUser(clubId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, deleted: target.club_name });
}

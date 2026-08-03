import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Creates a club login. Runs server-side with the service role key,
// and only after verifying the caller is an admin.
export async function POST(request) {
  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Verify the caller
  const token = (request.headers.get("authorization") || "").replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data: caller } = await svc.auth.getUser(token);
  if (!caller?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data: profile } = await svc.from("profiles").select("role").eq("id", caller.user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const { clubName, email, password } = await request.json();
  if (!clubName?.trim() || !email?.trim() || !password || password.length < 8) {
    return NextResponse.json({ error: "Club name, email, and a password of at least 8 characters are required" }, { status: 400 });
  }

  const { data: created, error } = await svc.auth.admin.createUser({
    email: email.trim(), password, email_confirm: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { error: pErr } = await svc.from("profiles").insert({
    id: created.user.id, role: "club", club_name: clubName.trim(),
  });
  if (pErr) {
    await svc.auth.admin.deleteUser(created.user.id); // roll back
    return NextResponse.json({ error: pErr.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

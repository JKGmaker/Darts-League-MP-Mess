"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

import MabbLogo from "../lib/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const login = async () => {
    setError(""); setBusy(true);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError("Email or password not recognised. Check the details MABB sent your club."); setBusy(false); return; }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
    if (profile?.role === "admin") { router.push("/admin"); return; }

    // Clubs can always sign in - after the deadlines their registration
    // is read-only (enforced on the register page and in the database).
    router.push("/register");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <MabbLogo size={96} />
          <h1 className="mt-4 text-3xl font-black tracking-tight text-gray-900">MABB</h1>
          <p className="text-sm font-semibold text-gray-500">Midland Area Basketball Board</p>
          <div className="mt-3 inline-block bg-orange-600 text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">
            Registration &middot; 2026/27 Season
          </div>
        </div>


          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Club email</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:border-orange-600"
              type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-600"
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && login()} />
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button onClick={login} disabled={busy}
              className="mt-4 w-full bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg">
              {busy ? "Signing in\u2026" : "Sign in"}
            </button>
            <p className="mt-3 text-xs text-gray-400 text-center">Login details are issued by MABB. Your entries save automatically as you type.</p>
          </div>
      </div>
    </div>
  );
}

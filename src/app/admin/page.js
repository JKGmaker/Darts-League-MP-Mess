"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { computeTotals, euro, fmtDeadline, mergeFees, DEFAULT_FEES } from "../../lib/config";
import MabbLogo from "../../lib/Logo";

const toLocalInput = iso => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function ChargeTable({ list, clubName, fmtDate, cols, onDelete, empty }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-stone-100 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            {cols.map(c => <th key={c} className="px-3 py-2">{c}</th>)}
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {list.map(ch => (
            <tr key={ch.id} className="hover:bg-stone-50">
              <td className="px-3 py-2 font-semibold text-gray-900">{clubName(ch.club_id)}</td>
              <td className="px-3 py-2">{ch.description}</td>
              <td className="px-3 py-2 whitespace-nowrap">{fmtDate(ch.charge_date)}</td>
              <td className="px-3 py-2">{ch.detail}</td>
              <td className="px-3 py-2 tabular-nums font-bold whitespace-nowrap">{euro(Number(ch.amount))}</td>
              <td className="px-3 py-2 text-right">
                <button onClick={() => onDelete(ch)}
                  className="text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 px-2 py-0.5 rounded-lg">
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan={cols.length + 1} className="px-3 py-5 text-center text-gray-400">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [settings, setSettings] = useState(null);
  const [juvInput, setJuvInput] = useState("");
  const [snrInput, setSnrInput] = useState("");
  const [fees, setFees] = useState(DEFAULT_FEES);
  const [feesInput, setFeesInput] = useState(DEFAULT_FEES);
  const [savingFees, setSavingFees] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [players, setPlayers] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [msg, setMsg] = useState("");
  const [newClub, setNewClub] = useState({ clubName: "", email: "", password: "" });
  const [creating, setCreating] = useState(false);
  const [charges, setCharges] = useState([]);
  const blankFine = { club_id: "", description: "", charge_date: "", detail: "", amount: "" };
  const blankAppeal = { club_id: "", description: "", detail: "", charge_date: "", amount: "" };
  const [newFine, setNewFine] = useState(blankFine);
  const [newAppeal, setNewAppeal] = useState(blankAppeal);
  const [accountSettings, setAccountSettings] = useState(null);
  const [startingBalanceInput, setStartingBalanceInput] = useState("");
  const [accountTxns, setAccountTxns] = useState([]);
  const blankTxn = { txn_date: "", description: "", type: "in", amount: "" };
  const [newTxn, setNewTxn] = useState(blankTxn);

  const load = async () => {
    const [{ data: s }, { data: cl }, { data: p }, { data: c }, { data: ch }, { data: acS }, { data: acT }] = await Promise.all([
      supabase.from("settings").select("*").eq("id", 1).single(),
      supabase.from("profiles").select("*").eq("role", "club").order("club_name"),
      supabase.from("players").select("*"),
      supabase.from("coaches").select("*"),
      supabase.from("charges").select("*").order("charge_date", { ascending: false }),
      supabase.from("mabb_account_settings").select("*").eq("id", 1).single(),
      supabase.from("mabb_account_transactions").select("*").order("txn_date").order("created_at"),
    ]);
    setSettings(s); setJuvInput(toLocalInput(s?.juvenile_deadline)); setSnrInput(toLocalInput(s?.senior_deadline));
    const merged = mergeFees(s?.fees);
    setFees(merged); setFeesInput(merged);
    setClubs(cl || []); setPlayers(p || []); setCoaches(c || []); setCharges(ch || []);
    setAccountSettings(acS); setStartingBalanceInput(acS ? String(acS.starting_balance) : "");
    setAccountTxns(acT || []);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") { router.push("/register"); return; }
      await load();
      setLoading(false);
    })();
  }, [router]);

  const clubStats = useMemo(() => clubs.map(club => {
    const rows = players.filter(p => p.club_id === club.id);
    const coachRows = coaches.filter(c => c.club_id === club.id);
    const t = computeTotals(rows, coachRows, fees);
    const last = [...rows, ...coachRows].reduce((m, r) => r.updated_at > m ? r.updated_at : m, "");
    const chargesTotal = charges.filter(ch => ch.club_id === club.id).reduce((sum, ch) => sum + Number(ch.amount || 0), 0);
    return { ...club, ...t, chargesTotal };
  }).map(c => ({ ...c, totalDue: (c.players + c.coaches > 0 ? c.grand : 0) + c.chargesTotal })), [clubs, players, coaches, charges, fees]);

  const grandTotal = clubStats.reduce((s, c) => s + c.totalDue, 0);

  const clubName = id => clubs.find(c => c.id === id)?.club_name || "Unknown club";
  const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

  const addCharge = async (type) => {
    setMsg("");
    const form = type === "walkover" ? newFine : newAppeal;
    if (!form.club_id) { setMsg("Pick which club the " + (type === "walkover" ? "fine" : "appeal") + " applies to."); return; }
    if (!form.description.trim() || !form.amount) { setMsg("Fill in all the fields including the fee."); return; }
    const { error } = await supabase.from("charges").insert({
      club_id: form.club_id, type, description: form.description.trim(),
      detail: form.detail.trim(), charge_date: form.charge_date || null,
      amount: Number(form.amount),
    });
    if (error) { setMsg("Could not add: " + error.message); return; }
    type === "walkover" ? setNewFine(blankFine) : setNewAppeal(blankAppeal);
    setMsg(type === "walkover" ? "Fine added - it now shows on the club's fee summary." : "Appeal added - it now shows on the club's fee summary.");
    load();
  };

  const deleteCharge = async (ch) => {
    if (!window.confirm(`Remove this ${ch.type === "walkover" ? "fine" : "appeal"} of ${euro(Number(ch.amount))} from ${clubName(ch.club_id)}?`)) return;
    const { error } = await supabase.from("charges").delete().eq("id", ch.id);
    setMsg(error ? "Could not remove: " + error.message : "Removed.");
    load();
  };

  const saveDeadlines = async () => {
    setMsg("");
    const { error } = await supabase.from("settings").update({
      juvenile_deadline: new Date(juvInput).toISOString(),
      senior_deadline: new Date(snrInput).toISOString(),
    }).eq("id", 1);
    setMsg(error ? "Could not save deadlines: " + error.message : "Deadlines saved.");
    if (!error) load();
  };

  const setYouthFee = (key, value) => setFeesInput({ ...feesInput, youth: { ...feesInput.youth, [key]: value } });
  const setSeniorFee = (key, value) => setFeesInput({ ...feesInput, senior: { ...feesInput.senior, [key]: value } });
  const setFlatFee = (key, value) => setFeesInput({ ...feesInput, [key]: value });

  const saveFees = async () => {
    setMsg(""); setSavingFees(true);
    const cleaned = {
      youth: {
        player: Number(feesInput.youth.player) || 0, playUp: Number(feesInput.youth.playUp) || 0,
        team: Number(feesInput.youth.team) || 0, slots: Number(feesInput.youth.slots) || 0,
        puSlots: Number(feesInput.youth.puSlots) || 0,
      },
      senior: {
        player: Number(feesInput.senior.player) || 0, playUp: Number(feesInput.senior.playUp) || 0,
        team: Number(feesInput.senior.team) || 0, slots: Number(feesInput.senior.slots) || 0,
        puSlots: Number(feesInput.senior.puSlots) || 0,
      },
      coach: Number(feesInput.coach) || 0, cup: Number(feesInput.cup) || 0,
      juvenile: Number(feesInput.juvenile) || 0, seniorOne: Number(feesInput.seniorOne) || 0,
      seniorMulti: Number(feesInput.seniorMulti) || 0, coachSlots: Number(feesInput.coachSlots) || 0,
    };
    const { error } = await supabase.from("settings").update({ fees: cleaned }).eq("id", 1);
    setMsg(error ? "Could not save fees: " + error.message : "Fees saved - new totals apply immediately.");
    if (!error) load();
    setSavingFees(false);
  };

  const createClub = async () => {
    setMsg(""); setCreating(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/create-club", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(newClub),
    });
    const body = await res.json();
    if (!res.ok) setMsg("Could not create club: " + body.error);
    else {
      setMsg(`${newClub.clubName} created. Send them the email and password to sign in with.`);
      setNewClub({ clubName: "", email: "", password: "" });
      load();
    }
    setCreating(false);
  };

  const deleteClub = async (club) => {
    const typed = window.prompt(
      `This permanently deletes ${club.club_name}, their login, and every player and coach they entered. It cannot be undone.\n\nType the club name to confirm:`
    );
    if (typed === null) return;
    if (typed.trim().toLowerCase() !== club.club_name.trim().toLowerCase()) {
      setMsg("Club name did not match - nothing was deleted.");
      return;
    }
    setMsg("");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/delete-club", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ clubId: club.id }),
    });
    const body = await res.json();
    setMsg(res.ok ? `${body.deleted} deleted.` : "Could not delete club: " + body.error);
    if (res.ok) load();
  };

  const exportCsv = () => {
    const head = "Club,Sheet,Team,Section,Slot,Name,BIPIN,Date of Birth\n";
    const nameOf = id => clubs.find(c => c.id === id)?.club_name || id;
    const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      ...players.map(p => [nameOf(p.club_id), p.sheet, p.team, p.section === "playup" ? "Playing up" : "Main", p.slot + 1, p.name, p.bipin, p.dob || ""].map(esc).join(",")),
      ...coaches.map(c => [nameOf(c.club_id), "Coaches", "", "", c.slot + 1, c.name, c.bipin, c.dob || ""].map(esc).join(",")),
    ];
    const blob = new Blob([head + lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mabb-registrations-2026-27.csv";
    a.click();
  };

  const exportFeeSummary = () => {
    const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Club", "Juvenile players", "Juvenile teams", "Juvenile fees", "Senior players", "Senior teams",
      "Senior fees", "Coaches", "Coach fees", "Juvenile affiliation", "Senior affiliation", "Cup entry",
      "Fines & appeals", "Total due"].join(",") + "\n";
    const num = n => Number(n || 0).toFixed(2);
    const lines = clubStats.map(c => {
      const active = c.players + c.coaches > 0;
      return [c.club_name, c.juvPlayers, c.juvTeams, num(active ? c.juvFees : 0),
        c.snrPlayers, c.snrTeams, num(active ? c.snrFees : 0),
        c.coaches, num(active ? c.coachFees : 0),
        num(active ? c.juvAffil : 0), num(active ? c.seniorAffil : 0), num(active ? c.cup : 0),
        num(c.chargesTotal), num(c.totalDue)].map(esc).join(",");
    });
    const t = clubStats.reduce((a, c) => {
      const active = c.players + c.coaches > 0;
      a.jp += c.juvPlayers; a.jt += c.juvTeams; a.jf += active ? c.juvFees : 0;
      a.sp += c.snrPlayers; a.st += c.snrTeams; a.sf += active ? c.snrFees : 0;
      a.co += c.coaches; a.cf += active ? c.coachFees : 0;
      a.ja += active ? c.juvAffil : 0; a.sa += active ? c.seniorAffil : 0; a.cup += active ? c.cup : 0;
      a.ch += c.chargesTotal; a.due += c.totalDue;
      return a;
    }, { jp: 0, jt: 0, jf: 0, sp: 0, st: 0, sf: 0, co: 0, cf: 0, ja: 0, sa: 0, cup: 0, ch: 0, due: 0 });
    const totalRow = ["LEAGUE TOTAL", t.jp, t.jt, num(t.jf), t.sp, t.st, num(t.sf), t.co, num(t.cf),
      num(t.ja), num(t.sa), num(t.cup), num(t.ch), num(t.due)].map(esc).join(",");
    const blob = new Blob([head + lines.join("\n") + "\n" + totalRow], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mabb-fee-summary-2026-27.csv";
    a.click();
  };

  const accountRows = useMemo(() => {
    let bal = Number(accountSettings?.starting_balance || 0);
    return accountTxns.map(t => {
      bal += t.type === "in" ? Number(t.amount) : -Number(t.amount);
      return { ...t, balance: bal };
    });
  }, [accountTxns, accountSettings]);
  const currentBalance = accountRows.length ? accountRows[accountRows.length - 1].balance : Number(accountSettings?.starting_balance || 0);

  const saveStartingBalance = async () => {
    setMsg("");
    const { error } = await supabase.from("mabb_account_settings")
      .update({ starting_balance: Number(startingBalanceInput || 0), updated_at: new Date().toISOString() })
      .eq("id", 1);
    setMsg(error ? "Could not save starting balance: " + error.message : "Starting balance saved.");
    if (!error) load();
  };

  const addTxn = async () => {
    setMsg("");
    if (!newTxn.description.trim() || !newTxn.amount) { setMsg("Fill in a description and amount."); return; }
    const { error } = await supabase.from("mabb_account_transactions").insert({
      txn_date: newTxn.txn_date || new Date().toISOString().slice(0, 10),
      description: newTxn.description.trim(), type: newTxn.type, amount: Number(newTxn.amount),
    });
    if (error) { setMsg("Could not add: " + error.message); return; }
    setNewTxn(blankTxn);
    setMsg("Transaction added.");
    load();
  };

  const deleteTxn = async (t) => {
    if (!window.confirm(`Remove "${t.description}" (${euro(Number(t.amount))})?`)) return;
    const { error } = await supabase.from("mabb_account_transactions").delete().eq("id", t.id);
    setMsg(error ? "Could not remove: " + error.message : "Removed.");
    load();
  };

  const signOut = async () => { await supabase.auth.signOut(); router.push("/"); };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading dashboard&hellip;</div>;

  const now = new Date();
  const juvOpen = now < new Date(settings.juvenile_deadline);
  const snrOpen = now < new Date(settings.senior_deadline);

  return (
    <div className="min-h-screen pb-10">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <MabbLogo size={44} />
          <div className="flex-1">
            <h1 className="text-lg font-black leading-tight text-gray-900">MABB Admin &middot; Registration 2026/27</h1>
            <p className="text-xs text-gray-500">Midland Area Basketball Board</p>
          </div>
          <button onClick={exportFeeSummary} className="text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg">Export fee summary</button>
          <button onClick={exportCsv} className="text-xs font-bold bg-gray-800 hover:bg-gray-900 text-white px-3 py-1.5 rounded-lg">Export all players</button>
          <button onClick={signOut} className="text-xs font-semibold text-gray-500 hover:text-gray-800">Sign out</button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pt-4">
        <div className="flex gap-1 border-b border-gray-200">
          {[["dashboard", "Dashboard"], ["fees", "MABB Registration Fees"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={"px-4 py-2 text-sm font-bold rounded-t-lg border border-b-0 " +
                (tab === id ? "bg-white border-gray-200 text-orange-600" : "bg-transparent border-transparent text-gray-500 hover:text-gray-800")}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2.5 text-sm font-semibold">{msg}</div>}

        {tab === "fees" && (
          <FeesPanel feesInput={feesInput} setYouthFee={setYouthFee} setSeniorFee={setSeniorFee}
            setFlatFee={setFlatFee} saveFees={saveFees} savingFees={savingFees}
            resetFees={() => setFeesInput(fees)} />
        )}

        {tab === "dashboard" && <>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Deadlines */}
          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-black text-gray-900 mb-1">Registration deadlines</h2>
            <p className="text-xs text-gray-500 mb-4">After each deadline, clubs can no longer add or change players in that category. They can still sign in to view their rosters and fee summary - everything becomes read-only.</p>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Juvenile deadline
              <span className={"ml-2 text-xs font-bold px-2 py-0.5 rounded-full " + (juvOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                {juvOpen ? "Open" : "Closed"}
              </span>
            </label>
            <input type="datetime-local" className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:border-orange-600"
              value={juvInput} onChange={e => setJuvInput(e.target.value)} />
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Senior deadline
              <span className={"ml-2 text-xs font-bold px-2 py-0.5 rounded-full " + (snrOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                {snrOpen ? "Open" : "Closed"}
              </span>
            </label>
            <input type="datetime-local" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-600"
              value={snrInput} onChange={e => setSnrInput(e.target.value)} />
            <button onClick={saveDeadlines} className="mt-4 bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-lg text-sm">Save deadlines</button>
          </section>

          {/* Add club */}
          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-black text-gray-900 mb-1">Add a club</h2>
            <p className="text-xs text-gray-500 mb-4">Creates the club's login. Send them the email and password - they sign in at the site address.</p>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:border-orange-600"
              placeholder="Club name (e.g. Portlaoise Panthers)" value={newClub.clubName}
              onChange={e => setNewClub({ ...newClub, clubName: e.target.value })} />
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:border-orange-600"
              placeholder="Club email" type="email" value={newClub.email}
              onChange={e => setNewClub({ ...newClub, email: e.target.value })} />
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-600"
              placeholder="Password (minimum 8 characters)" value={newClub.password}
              onChange={e => setNewClub({ ...newClub, password: e.target.value })} />
            <button onClick={createClub} disabled={creating}
              className="mt-4 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm">
              {creating ? "Creating\u2026" : "Create club login"}
            </button>
          </section>
        </div>

        {/* Clubs table */}
        <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between">
            <h2 className="font-black text-gray-900">Clubs ({clubs.length})</h2>
            <div className="text-sm text-gray-600">League total: <span className="font-black text-gray-900 tabular-nums">{euro(grandTotal)}</span></div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-stone-100 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-2">Club</th>
                <th className="px-3 py-2 text-right">Juvenile</th>
                <th className="px-3 py-2 text-right">Senior</th>
                <th className="px-3 py-2 text-right">Coaches</th>
                <th className="px-3 py-2 text-right">Teams</th>
                <th className="px-3 py-2 text-right">Fines &amp; appeals</th>
                <th className="px-3 py-2 text-right">Total due</th>
                <th className="px-5 py-2 text-right">Last updated</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clubStats.map(c => (
                <tr key={c.id} className="hover:bg-stone-50">
                  <td className="px-5 py-2.5 font-semibold text-gray-900">{c.club_name}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{c.juvPlayers}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{c.snrPlayers}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{c.coaches}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{c.teams}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{c.chargesTotal > 0 ? euro(c.chargesTotal) : "\u2014"}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold">{c.totalDue > 0 ? euro(c.totalDue) : "\u2014"}</td>
                  <td className="px-5 py-2.5 text-right text-xs text-gray-500">{c.last ? new Date(c.last).toLocaleString("en-IE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Not started"}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => deleteClub(c)}
                      className="text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 px-2.5 py-1 rounded-lg"
                      title="Delete this club and all its entries">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {clubStats.length === 0 && (
                <tr><td colSpan="9" className="px-5 py-8 text-center text-gray-400">No clubs yet - add the first one above.</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Fines */}
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-black text-gray-900 mb-1">Fines</h2>
          <p className="text-xs text-gray-500 mb-4">Fines appear on the club&apos;s fee summary the moment you add them.</p>
          <div className="grid md:grid-cols-6 gap-2 mb-4">
            <select className="md:col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-600"
              value={newFine.club_id} onChange={e => setNewFine({ ...newFine, club_id: e.target.value })}>
              <option value="">Club to fine&hellip;</option>
              {clubs.map(c => <option key={c.id} value={c.id}>{c.club_name}</option>)}
            </select>
            <input className="md:col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-600"
              placeholder="Match (e.g. Athlone v Portlaoise)" value={newFine.description}
              onChange={e => setNewFine({ ...newFine, description: e.target.value })} />
            <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-600"
              value={newFine.charge_date} onChange={e => setNewFine({ ...newFine, charge_date: e.target.value })} />
            <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-600"
              placeholder="Division (e.g. U15 Boys)" value={newFine.detail}
              onChange={e => setNewFine({ ...newFine, detail: e.target.value })} />
          </div>
          <div className="flex gap-2 items-center mb-4">
            <input type="number" min="0" step="0.01" className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-600"
              placeholder="Fine €" value={newFine.amount}
              onChange={e => setNewFine({ ...newFine, amount: e.target.value })} />
            <button onClick={() => addCharge("walkover")}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-lg text-sm">Add fine</button>
          </div>
          <ChargeTable list={charges.filter(c => c.type === "walkover")} clubName={clubName} fmtDate={fmtDate}
            cols={["Club", "Match", "Date", "Division", "Fine"]} onDelete={deleteCharge}
            empty="No fines issued." />
        </section>

        {/* Appeals */}
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-black text-gray-900 mb-1">Appeals</h2>
          <p className="text-xs text-gray-500 mb-4">Appeal fees appear on the club&apos;s fee summary the moment you add them.</p>
          <div className="grid md:grid-cols-6 gap-2 mb-4">
            <select className="md:col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-600"
              value={newAppeal.club_id} onChange={e => setNewAppeal({ ...newAppeal, club_id: e.target.value })}>
              <option value="">Club&hellip;</option>
              {clubs.map(c => <option key={c.id} value={c.id}>{c.club_name}</option>)}
            </select>
            <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-600"
              placeholder="Team name" value={newAppeal.description}
              onChange={e => setNewAppeal({ ...newAppeal, description: e.target.value })} />
            <input className="md:col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-600"
              placeholder="Appeal reason" value={newAppeal.detail}
              onChange={e => setNewAppeal({ ...newAppeal, detail: e.target.value })} />
            <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-600"
              value={newAppeal.charge_date} onChange={e => setNewAppeal({ ...newAppeal, charge_date: e.target.value })} />
          </div>
          <div className="flex gap-2 items-center mb-4">
            <input type="number" min="0" step="0.01" className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-600"
              placeholder="Fee €" value={newAppeal.amount}
              onChange={e => setNewAppeal({ ...newAppeal, amount: e.target.value })} />
            <button onClick={() => addCharge("appeal")}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-lg text-sm">Add appeal</button>
          </div>
          <ChargeTable list={charges.filter(c => c.type === "appeal")} clubName={clubName} fmtDate={fmtDate}
            cols={["Club", "Team", "Date", "Reason", "Fee"]} onDelete={deleteCharge}
            empty="No appeals recorded." />
        </section>

        {/* MABB Account */}
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-black text-gray-900">MABB Account</h2>
            <div className="text-sm text-gray-600">Current balance: <span className="font-black text-gray-900 tabular-nums">{euro(currentBalance)}</span></div>
          </div>
          <p className="text-xs text-gray-500 mb-4">Visible to all clubs under the &quot;MABB Account&quot; tab.</p>

          <div className="flex flex-wrap items-end gap-2 mb-5 bg-stone-50 border border-gray-200 rounded-lg p-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Starting balance</label>
              <input type="number" step="0.01" className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-600"
                value={startingBalanceInput} onChange={e => setStartingBalanceInput(e.target.value)} />
            </div>
            <button onClick={saveStartingBalance} className="bg-gray-800 hover:bg-gray-900 text-white font-bold px-4 py-2 rounded-lg text-sm">
              Save starting balance
            </button>
          </div>

          <div className="grid md:grid-cols-6 gap-2 mb-4">
            <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-600"
              value={newTxn.txn_date} onChange={e => setNewTxn({ ...newTxn, txn_date: e.target.value })} />
            <input className="md:col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-600"
              placeholder="Description (e.g. Referee fees - Round 4)" value={newTxn.description}
              onChange={e => setNewTxn({ ...newTxn, description: e.target.value })} />
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-600"
              value={newTxn.type} onChange={e => setNewTxn({ ...newTxn, type: e.target.value })}>
              <option value="in">Incoming</option>
              <option value="out">Outgoing</option>
            </select>
            <input type="number" min="0" step="0.01" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-600"
              placeholder="Amount €" value={newTxn.amount}
              onChange={e => setNewTxn({ ...newTxn, amount: e.target.value })} />
            <button onClick={addTxn} className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-lg text-sm">Add</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2 text-right">In</th>
                  <th className="px-3 py-2 text-right">Out</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="bg-stone-50">
                  <td className="px-3 py-2 text-gray-500 italic" colSpan={4}>Starting balance</td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold">{euro(Number(accountSettings?.starting_balance || 0))}</td>
                  <td></td>
                </tr>
                {accountRows.map(t => (
                  <tr key={t.id} className="hover:bg-stone-50">
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(t.txn_date)}</td>
                    <td className="px-3 py-2">{t.description}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-green-700">{t.type === "in" ? euro(Number(t.amount)) : ""}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-red-700">{t.type === "out" ? euro(Number(t.amount)) : ""}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold">{euro(t.balance)}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => deleteTxn(t)}
                        className="text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 px-2 py-0.5 rounded-lg">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {accountRows.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-5 text-center text-gray-400">No transactions yet.</td></tr>
                )}
              </tbody>
              {accountRows.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-900">
                    <td colSpan={4} className="px-3 py-2.5 text-white font-bold uppercase tracking-wide text-xs">Current balance</td>
                    <td className="px-3 py-2.5 text-right text-orange-400 font-black tabular-nums">{euro(currentBalance)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>

        <p className="text-xs text-gray-400">Deadlines currently: juvenile {fmtDeadline(settings.juvenile_deadline)} &middot; senior {fmtDeadline(settings.senior_deadline)}. Deadline locks are enforced in the database, so they apply even if a club keeps an old tab open.</p>
        </>}
      </div>
    </div>
  );
}

function FeeField({ label, value, onChange, suffix }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-600 mb-1">{label}</span>
      <div className="flex items-center gap-1">
        <input type="number" min="0" step="0.01"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-600"
          value={value} onChange={e => onChange(e.target.value)} />
        {suffix && <span className="text-xs text-gray-400 whitespace-nowrap">{suffix}</span>}
      </div>
    </label>
  );
}

function FeesPanel({ feesInput, setYouthFee, setSeniorFee, setFlatFee, saveFees, savingFees, resetFees }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-gray-900 text-lg">MABB Registration Fees</h2>
          <p className="text-xs text-gray-500">Changes apply immediately to every club&apos;s fee summary and totals once saved.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={resetFees} className="text-xs font-bold text-gray-600 hover:text-gray-900 border border-gray-300 px-3 py-2 rounded-lg">
            Reset changes
          </button>
          <button onClick={saveFees} disabled={savingFees}
            className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm">
            {savingFees ? "Saving\u2026" : "Save fees"}
          </button>
        </div>
      </div>

      {/* Youth */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-black text-gray-900 mb-4">Youth (Under 10&ndash;20)</h3>
        <div className="grid sm:grid-cols-3 md:grid-cols-5 gap-4">
          <FeeField label="Player (main squad)" suffix="\u20AC" value={feesInput.youth.player} onChange={v => setYouthFee("player", v)} />
          <FeeField label="Playing up" suffix="\u20AC" value={feesInput.youth.playUp} onChange={v => setYouthFee("playUp", v)} />
          <FeeField label="Team registration" suffix="\u20AC" value={feesInput.youth.team} onChange={v => setYouthFee("team", v)} />
          <FeeField label="Squad slots" value={feesInput.youth.slots} onChange={v => setYouthFee("slots", v)} />
          <FeeField label="Playing-up slots" value={feesInput.youth.puSlots} onChange={v => setYouthFee("puSlots", v)} />
        </div>
      </section>

      {/* Senior */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-black text-gray-900 mb-1">Senior (Senior Men / Senior Ladies)</h3>
        <p className="text-xs text-gray-500 mb-4">Set playing-up slots to 0 if seniors have no playing-up section.</p>
        <div className="grid sm:grid-cols-3 md:grid-cols-5 gap-4">
          <FeeField label="Player (main squad)" suffix="\u20AC" value={feesInput.senior.player} onChange={v => setSeniorFee("player", v)} />
          <FeeField label="Playing up" suffix="\u20AC" value={feesInput.senior.playUp} onChange={v => setSeniorFee("playUp", v)} />
          <FeeField label="Team registration" suffix="\u20AC" value={feesInput.senior.team} onChange={v => setSeniorFee("team", v)} />
          <FeeField label="Squad slots" value={feesInput.senior.slots} onChange={v => setSeniorFee("slots", v)} />
          <FeeField label="Playing-up slots" value={feesInput.senior.puSlots} onChange={v => setSeniorFee("puSlots", v)} />
        </div>
      </section>

      {/* Flat fees */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-black text-gray-900 mb-1">Other flat fees</h3>
        <p className="text-xs text-gray-500 mb-4">Cup fee is charged once per club, regardless of size. Senior affiliation depends on how many senior teams a club enters; juvenile affiliation is charged once if a club has any juvenile teams.</p>
        <div className="grid sm:grid-cols-3 md:grid-cols-4 gap-4">
          <FeeField label="Coach" suffix="\u20AC" value={feesInput.coach} onChange={v => setFlatFee("coach", v)} />
          <FeeField label="Coach slots" value={feesInput.coachSlots} onChange={v => setFlatFee("coachSlots", v)} />
          <FeeField label="Cup fee (flat, per club)" suffix="\u20AC" value={feesInput.cup} onChange={v => setFlatFee("cup", v)} />
          <FeeField label="Juvenile affiliation" suffix="\u20AC" value={feesInput.juvenile} onChange={v => setFlatFee("juvenile", v)} />
          <FeeField label="Senior affiliation \u2014 1 team" suffix="\u20AC" value={feesInput.seniorOne} onChange={v => setFlatFee("seniorOne", v)} />
          <FeeField label="Senior affiliation \u2014 multiple teams" suffix="\u20AC" value={feesInput.seniorMulti} onChange={v => setFlatFee("seniorMulti", v)} />
        </div>
      </section>
    </div>
  );
}

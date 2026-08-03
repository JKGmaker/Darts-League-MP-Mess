"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { SHEETS, YOUTH_AGES, TEAMS, cfgFor, isSenior, categoryOf, computeTotals, euro, fmtDeadline, mergeFees } from "../../lib/config";
import MabbLogo from "../../lib/Logo";

const keyOf = (sheet, team, section, slot) => `${sheet}|${team}|${section}|${slot}`;
const emptyVal = r => !(r.name?.trim() || r.bipin?.trim() || r.dob);

const RowInput = ({ value, onChange, disabled, idx }) => (
    <div className="grid grid-cols-12 gap-1 items-center">
      <span className="col-span-1 text-right pr-1 text-xs text-gray-400 tabular-nums">{idx + 1}</span>
      <input className="col-span-5 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-orange-600 bg-white disabled:bg-gray-100 disabled:text-gray-500"
        placeholder="Full name" disabled={disabled} value={value.name || ""}
        onChange={e => onChange({ ...value, name: e.target.value })} />
      <input className="col-span-3 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-orange-600 bg-white disabled:bg-gray-100 disabled:text-gray-500"
        placeholder="BIPIN" inputMode="numeric" disabled={disabled} value={value.bipin || ""}
        onChange={e => onChange({ ...value, bipin: e.target.value })} />
      <input className="col-span-3 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-orange-600 bg-white disabled:bg-gray-100 disabled:text-gray-500"
        type="date" disabled={disabled} value={value.dob || ""}
        onChange={e => onChange({ ...value, dob: e.target.value })} />
    </div>
);

const Header = () => (
    <div className="grid grid-cols-12 gap-1 mb-1">
      <span className="col-span-1"></span>
      <span className="col-span-5 text-xs font-bold uppercase tracking-wide text-gray-500">Name</span>
      <span className="col-span-3 text-xs font-bold uppercase tracking-wide text-gray-500">BIPIN</span>
      <span className="col-span-3 text-xs font-bold uppercase tracking-wide text-gray-500">Date of birth</span>
    </div>
);

export default function RegisterPage() {
  const router = useRouter();
  const [clubName, setClubName] = useState("");
  const [clubId, setClubId] = useState(null);
  const [settings, setSettings] = useState(null);
  const [rows, setRows] = useState({});        // key -> {name,bipin,dob}
  const [coachRows, setCoachRows] = useState({});
  const [charges, setCharges] = useState([]); // slot -> {name,bipin,dob}
  const [accountSettings, setAccountSettings] = useState(null);
  const [accountTxns, setAccountTxns] = useState([]);
  const [view, setView] = useState(SHEETS[0]);
  const [team, setTeam] = useState(1);
  const [saveState, setSaveState] = useState("saved");
  const [loading, setLoading] = useState(true);
  const timers = useRef({});

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!profile) { router.push("/"); return; }
      if (profile.role === "admin") { router.push("/admin"); return; }
      setClubName(profile.club_name);
      setClubId(user.id);
      const [{ data: s }, { data: p }, { data: c }, { data: ch }, { data: acS }, { data: acT }] = await Promise.all([
        supabase.from("settings").select("*").eq("id", 1).single(),
        supabase.from("players").select("*").eq("club_id", user.id),
        supabase.from("coaches").select("*").eq("club_id", user.id),
        supabase.from("charges").select("*").eq("club_id", user.id).order("charge_date", { ascending: false }),
        supabase.from("mabb_account_settings").select("*").eq("id", 1).single(),
        supabase.from("mabb_account_transactions").select("*").order("txn_date").order("created_at"),
      ]);
      setSettings(s);
      setAccountSettings(acS);
      setAccountTxns(acT || []);
      const r = {};
      (p || []).forEach(row => { r[keyOf(row.sheet, row.team, row.section, row.slot)] = { name: row.name, bipin: row.bipin, dob: row.dob || "" }; });
      setRows(r);
      const cr = {};
      (c || []).forEach(row => { cr[row.slot] = { name: row.name, bipin: row.bipin, dob: row.dob || "" }; });
      setCoachRows(cr);
      setCharges(ch || []);
      setLoading(false);
    })();
  }, [router]);

  const now = new Date();
  const juvOpen = settings ? now < new Date(settings.juvenile_deadline) : false;
  const snrOpen = settings ? now < new Date(settings.senior_deadline) : false;
  const coachesOpen = juvOpen || snrOpen;
  const sheetOpen = sheet => (isSenior(sheet) ? snrOpen : juvOpen);

  const queueSave = useCallback((key, fn) => {
    setSaveState("saving");
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(async () => {
      try { await fn(); setSaveState("saved"); }
      catch (e) { setSaveState("error"); }
    }, 700);
  }, []);

  const setPlayer = (sheet, teamNo, section, slot, val) => {
    const key = keyOf(sheet, teamNo, section, slot);
    setRows(prev => ({ ...prev, [key]: val }));
    queueSave(key, async () => {
      if (emptyVal(val)) {
        const { error } = await supabase.from("players").delete()
          .match({ club_id: clubId, sheet, team: teamNo, section, slot });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("players").upsert({
          club_id: clubId, sheet, team: teamNo, section, slot,
          name: val.name || "", bipin: val.bipin || "", dob: val.dob || null,
          category: categoryOf(sheet), updated_at: new Date().toISOString(),
        }, { onConflict: "club_id,sheet,team,section,slot" });
        if (error) throw error;
      }
    });
  };

  const setCoach = (slot, val) => {
    setCoachRows(prev => ({ ...prev, [slot]: val }));
    queueSave(`coach|${slot}`, async () => {
      if (emptyVal(val)) {
        const { error } = await supabase.from("coaches").delete().match({ club_id: clubId, slot });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coaches").upsert({
          club_id: clubId, slot, name: val.name || "", bipin: val.bipin || "",
          dob: val.dob || null, updated_at: new Date().toISOString(),
        }, { onConflict: "club_id,slot" });
        if (error) throw error;
      }
    });
  };

  const fees = useMemo(() => mergeFees(settings?.fees), [settings]);

  const totals = useMemo(() => {
    const list = Object.entries(rows).map(([k, v]) => {
      const [sheet, t, section] = k.split("|");
      return { sheet, team: Number(t), section, name: v.name };
    });
    return computeTotals(list, Object.values(coachRows), fees);
  }, [rows, coachRows, fees]);

  const chargesTotal = charges.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const totalDue = totals.grand + chargesTotal;

  const accountRows = useMemo(() => {
    let bal = Number(accountSettings?.starting_balance || 0);
    return accountTxns.map(t => {
      bal += t.type === "in" ? Number(t.amount) : -Number(t.amount);
      return { ...t, balance: bal };
    });
  }, [accountTxns, accountSettings]);
  const currentBalance = accountRows.length ? accountRows[accountRows.length - 1].balance : Number(accountSettings?.starting_balance || 0);
  const fmtAccDate = d => d ? new Date(d).toLocaleDateString("en-IE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

  const signOut = async () => { await supabase.auth.signOut(); router.push("/"); };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading your registration&hellip;</div>;



  const renderSheet = () => {
    const cfg = cfgFor(view, fees);
    const open = sheetOpen(view);
    const deadline = isSenior(view) ? settings.senior_deadline : settings.juvenile_deadline;
    return (
      <div>
        {!open && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-2.5 text-sm font-semibold">
            {isSenior(view) ? "Senior" : "Juvenile"} registration closed {fmtDeadline(deadline)}. This roster is now read-only - contact the MABB registrar for changes.
          </div>
        )}
        {open && (
          <p className="mb-4 text-xs text-gray-500">Closes {fmtDeadline(deadline)} &middot; {euro(cfg.player)} per player &middot; {euro(cfg.team)} per team entered</p>
        )}
        <div className="flex flex-wrap gap-2 mb-4">
          {TEAMS.map(n => {
            const count = [...Array(cfg.slots).keys()].filter(i => rows[keyOf(view, n, "main", i)]?.name?.trim()).length
              + [...Array(cfg.puSlots).keys()].filter(i => rows[keyOf(view, n, "playup", i)]?.name?.trim()).length;
            return (
              <button key={n} onClick={() => setTeam(n)}
                className={"px-4 py-1.5 rounded-full text-sm font-bold border " +
                  (team === n ? "bg-orange-600 text-white border-orange-600" : "bg-white text-gray-700 border-gray-300 hover:border-orange-400")}>
                Team {n}{count > 0 && <span className="ml-1.5 text-xs opacity-80">({count})</span>}
              </button>
            );
          })}
        </div>
        <Header />
        <div className="space-y-1">
          {[...Array(cfg.slots).keys()].map(i => (
            <RowInput key={i} idx={i} disabled={!open}
              value={rows[keyOf(view, team, "main", i)] || {}}
              onChange={v => setPlayer(view, team, "main", i, v)} />
          ))}
        </div>
        {cfg.puSlots > 0 && (
          <>
            <div className="mt-6 mb-2 flex items-center gap-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-800">Playing up on this team</h3>
              <span className="text-xs text-gray-500">{euro(cfg.playUp)} per player</span>
            </div>
            <div className="space-y-1">
              {[...Array(cfg.puSlots).keys()].map(i => (
                <RowInput key={i} idx={i} disabled={!open}
                  value={rows[keyOf(view, team, "playup", i)] || {}}
                  onChange={v => setPlayer(view, team, "playup", i, v)} />
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderCoaches = () => (
    <div>
      {!coachesOpen && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-2.5 text-sm font-semibold">
          Registration has closed. Coach entries are read-only.
        </div>
      )}
      <p className="text-sm text-gray-600 mb-3">{euro(fees.coach)} per coach.</p>
      <Header />
      <div className="space-y-1">
        {[...Array(FEES.coachSlots).keys()].map(i => (
          <RowInput key={i} idx={i} disabled={!coachesOpen}
            value={coachRows[i] || {}} onChange={v => setCoach(i, v)} />
        ))}
      </div>
    </div>
  );

  const renderSummary = () => (
    <div className="max-w-xl">
      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        {[
          ["Juvenile players", totals.juvPlayers, ""],
          ["Juvenile teams", totals.juvTeams, ""],
          ["Juvenile player & team fees", "", euro(totals.juvFees)],
          ["Senior players", totals.snrPlayers, ""],
          ["Senior teams", totals.snrTeams, ""],
          ["Senior player & team fees", "", euro(totals.snrFees)],
          ["Coaches", totals.coaches, euro(totals.coachFees)],
          ["Senior affiliation", "", euro(totals.seniorAffil)],
          ["Juvenile affiliation", "", euro(totals.juvAffil)],
          ["Cup entry", "", euro(totals.cup)],
        ].map(([label, count, fee]) => (
          <div key={label} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="text-gray-700">{label}</span>
            <span className="font-semibold tabular-nums text-gray-900">{fee !== "" ? fee : count}</span>
          </div>
        ))}
        {charges.map(ch => (
          <div key={ch.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm bg-red-50">
            <span className="text-gray-700">
              <span className="font-bold text-red-700">{ch.type === "walkover" ? "Fine" : "Appeal"}</span>
              {" — "}{ch.description}
              {ch.detail && <span className="text-gray-500"> &middot; {ch.detail}</span>}
              {ch.charge_date && <span className="text-gray-500"> &middot; {new Date(ch.charge_date).toLocaleDateString("en-IE", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>}
            </span>
            <span className="font-semibold tabular-nums text-red-700 whitespace-nowrap">{euro(Number(ch.amount))}</span>
          </div>
        ))}
        {chargesTotal > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="text-gray-700 font-bold">Fines &amp; appeals</span>
            <span className="font-bold tabular-nums text-gray-900">{euro(chargesTotal)}</span>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 rounded-b-lg">
          <span className="text-white font-bold uppercase tracking-wide text-sm">Total due to MABB</span>
          <span className="text-orange-400 font-black text-xl tabular-nums">{euro(totalDue)}</span>
        </div>
      </div>
    </div>
  );

  const renderAccount = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">League income and spending, kept up to date by the treasurer.</p>
        <div className="text-sm text-gray-600">Current balance: <span className="font-black text-gray-900 tabular-nums">{euro(currentBalance)}</span></div>
      </div>
      <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2 text-right">In</th>
              <th className="px-3 py-2 text-right">Out</th>
              <th className="px-3 py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr className="bg-stone-50">
              <td className="px-3 py-2 text-gray-500 italic" colSpan={4}>Starting balance</td>
              <td className="px-3 py-2 text-right tabular-nums font-bold">{euro(Number(accountSettings?.starting_balance || 0))}</td>
            </tr>
            {accountRows.map(t => (
              <tr key={t.id}>
                <td className="px-3 py-2 whitespace-nowrap">{fmtAccDate(t.txn_date)}</td>
                <td className="px-3 py-2">{t.description}</td>
                <td className="px-3 py-2 text-right tabular-nums text-green-700">{t.type === "in" ? euro(Number(t.amount)) : ""}</td>
                <td className="px-3 py-2 text-right tabular-nums text-red-700">{t.type === "out" ? euro(Number(t.amount)) : ""}</td>
                <td className="px-3 py-2 text-right tabular-nums font-bold">{euro(t.balance)}</td>
              </tr>
            ))}
            {accountRows.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-5 text-center text-gray-400">No transactions recorded yet.</td></tr>
            )}
          </tbody>
          {accountRows.length > 0 && (
            <tfoot>
              <tr className="bg-gray-900">
                <td colSpan={4} className="px-3 py-2.5 text-white font-bold uppercase tracking-wide text-xs">Current balance</td>
                <td className="px-3 py-2.5 text-right text-orange-400 font-black tabular-nums">{euro(currentBalance)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );

  const navItem = (label, key) => (
    <button key={key} onClick={() => { setView(key); setTeam(1); }}
      className={"w-full text-left px-3 py-1.5 rounded text-sm " +
        (view === key ? "bg-orange-600 text-white font-bold" : "text-gray-700 hover:bg-stone-200")}>
      {label}
    </button>
  );

  return (
    <div className="min-h-screen pb-24">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <MabbLogo size={44} />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black leading-tight text-gray-900">MABB &middot; Registration 2026/27 Season</h1>
            <p className="text-xs text-gray-500 truncate">{clubName}</p>
          </div>
          <span className={"text-xs font-semibold px-2 py-1 rounded-full " +
            (saveState === "saved" ? "bg-green-100 text-green-700" : saveState === "saving" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
            {saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving\u2026" : "Save failed"}
          </span>
          <button onClick={signOut} className="text-xs font-semibold text-gray-500 hover:text-gray-800">Sign out</button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-5 flex gap-5">
        <nav className="w-44 shrink-0 hidden md:block">
          <p className="px-3 pb-1 text-xs font-bold uppercase tracking-widest text-gray-400">Boys</p>
          {YOUTH_AGES.map(a => navItem(a, `${a} Boys`))}
          <p className="px-3 pt-3 pb-1 text-xs font-bold uppercase tracking-widest text-gray-400">Girls</p>
          {YOUTH_AGES.map(a => navItem(a, `${a} Girls`))}
          <p className="px-3 pt-3 pb-1 text-xs font-bold uppercase tracking-widest text-gray-400">Senior</p>
          {navItem("Senior Men", "Senior Men")}
          {navItem("Senior Ladies", "Senior Ladies")}
          <p className="px-3 pt-3 pb-1 text-xs font-bold uppercase tracking-widest text-gray-400">Club</p>
          {navItem("Coaches", "Coaches")}
          {navItem("Fee summary", "Summary")}
          {navItem("MABB Account", "Account")}
        </nav>

        <div className="md:hidden fixed bottom-16 left-0 right-0 z-10 bg-white border-t border-gray-200 px-4 py-2">
          <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
            value={view} onChange={e => { setView(e.target.value); setTeam(1); }}>
            {SHEETS.map(s => <option key={s} value={s}>{s}</option>)}
            <option value="Coaches">Coaches</option>
            <option value="Summary">Fee summary</option>
            <option value="Account">MABB Account</option>
          </select>
        </div>

        <main className="flex-1 min-w-0">
          {!juvOpen && !snrOpen && (
            <div className="mb-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg px-4 py-3 text-sm">
              <span className="font-black">Registration has closed.</span>{" "}
              You can still view your rosters and fee summary here, but entries can no longer be added or changed.
              Contact the MABB registrar if your club needs a correction.
            </div>
          )}
          <h2 className="text-xl font-black text-gray-900 mb-1">{view === "Summary" ? "Fee summary" : view === "Account" ? "MABB Account" : view}</h2>
          {view === "Summary" ? renderSummary() : view === "Account" ? renderAccount() : view === "Coaches" ? renderCoaches() : renderSheet()}
        </main>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t-4 border-orange-600 z-20">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-orange-400 font-black text-lg leading-none tabular-nums">{totals.players + totals.coaches}</div>
              <div className="text-gray-400 text-[10px] uppercase tracking-widest">Members</div>
            </div>
            <div className="text-center">
              <div className="text-orange-400 font-black text-lg leading-none tabular-nums">{totals.teams}</div>
              <div className="text-gray-400 text-[10px] uppercase tracking-widest">Teams</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white font-black text-xl leading-none tabular-nums">{euro(totalDue)}</div>
            <div className="text-gray-400 text-[10px] uppercase tracking-widest">Total registration fees</div>
          </div>
        </div>
      </div>
    </div>
  );
}

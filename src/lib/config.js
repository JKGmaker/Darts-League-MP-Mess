// Shared configuration - mirrors the registration spreadsheet exactly

export const YOUTH_AGES = ["Under 10","Under 11","Under 12","Under 13","Under 14","Under 15","Under 16","Under 17","Under 18","Under 20"];
export const SHEETS = [
  ...YOUTH_AGES.flatMap(a => [`${a} Boys`, `${a} Girls`]),
  "Senior Men", "Senior Ladies",
];
export const isSenior = s => s.startsWith("Senior");
export const categoryOf = s => (isSenior(s) ? "senior" : "juvenile");
export const TEAMS = [1, 2, 3, 4];

// Default fees - used until the admin overrides them, and as a fallback for
// any keys missing from a saved fees record (e.g. after adding a new fee type).
export const DEFAULT_FEES = {
  youth:  { player: 12, playUp: 2,  team: 35, slots: 25, puSlots: 20 },
  senior: { player: 20, playUp: 15, team: 75, slots: 24, puSlots: 0 },  // no playing-up section for seniors
  coach: 20, cup: 100, juvenile: 50, seniorOne: 60, seniorMulti: 100,
  coachSlots: 50,
};
// Kept for any older code that imports FEES directly - always prefer the
// dynamic fees loaded from settings.fees (see mergeFees) where available.
export const FEES = DEFAULT_FEES;

// Merges a fees record loaded from the database with the defaults, so a
// partially-saved or older record never leaves a field undefined.
export function mergeFees(dbFees) {
  if (!dbFees) return DEFAULT_FEES;
  return {
    ...DEFAULT_FEES,
    ...dbFees,
    youth: { ...DEFAULT_FEES.youth, ...(dbFees.youth || {}) },
    senior: { ...DEFAULT_FEES.senior, ...(dbFees.senior || {}) },
  };
}

export const cfgFor = (sheet, fees = DEFAULT_FEES) => (isSenior(sheet) ? fees.senior : fees.youth);
export const euro = n => "\u20AC" + Number(n).toLocaleString("en-IE");

// rows: array of {sheet, team, section, name}
export function computeTotals(rows, coachRows, fees = DEFAULT_FEES) {
  const bySheetTeam = {};
  rows.forEach(r => {
    if (!r.name || !r.name.trim()) return;
    const key = `${r.sheet}|${r.team}`;
    bySheetTeam[key] = bySheetTeam[key] || { sheet: r.sheet, main: 0, playup: 0 };
    bySheetTeam[key][r.section === "playup" ? "playup" : "main"] += 1;
  });
  let juvPlayers = 0, juvTeams = 0, juvFees = 0;
  let snrPlayers = 0, snrTeams = 0, snrFees = 0;
  Object.values(bySheetTeam).forEach(t => {
    const senior = isSenior(t.sheet);
    const cfg = senior ? fees.senior : fees.youth;
    const players = t.main + t.playup;
    const teamFees = t.main * cfg.player + t.playup * cfg.playUp + cfg.team;
    if (senior) { snrPlayers += players; snrTeams += 1; snrFees += teamFees; }
    else { juvPlayers += players; juvTeams += 1; juvFees += teamFees; }
  });
  const coaches = (coachRows || []).filter(c => c.name && c.name.trim()).length;
  const coachFees = coaches * fees.coach;
  const seniorAffil = snrTeams > 1 ? fees.seniorMulti : snrTeams === 1 ? fees.seniorOne : 0;
  const juvAffil = juvTeams > 0 ? fees.juvenile : 0;
  const grand = juvFees + snrFees + coachFees + seniorAffil + juvAffil + fees.cup;
  return { juvPlayers, juvTeams, juvFees, snrPlayers, snrTeams, snrFees,
           coaches, coachFees, seniorAffil, juvAffil, cup: fees.cup, grand,
           players: juvPlayers + snrPlayers, teams: juvTeams + snrTeams };
}

export const fmtDeadline = d => d ? new Date(d).toLocaleString("en-IE",
  { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "not set";

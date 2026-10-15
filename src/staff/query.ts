import { fmt, pct } from "../format";
import {
  FAMILY_ORDER,
  LIST_KEYS,
  PROGRAM_ORDER,
  QUAL_ORDER,
  type Dim,
  type Filters,
  type ListKey,
  type Metric,
  type Presence,
  type Staff,
} from "./types";

export type AggRow = {
  key: string;
  people: number;
  share: number;
  schools: number;
  femalePct: number;
  teachingPct: number;
  leadershipPct: number;
  supportPct: number;
  mastersPct: number;
  bachelorsPct: number;
  missingCnicPct: number;
  missingContactPct: number;
};

export type Summary = {
  people: number;
  schools: number;
  districts: number;
  tehsils: number;
  programs: number;
  female: number;
  male: number;
  femalePct: number;
  teaching: number;
  leadership: number;
  administration: number;
  support: number;
  masters: number;
  missingCnic: number;
  missingContact: number;
  missingKin: number;
  missingQualification: number;
  missingFather: number;
};

export type SchoolRow = {
  school: string;
  district: string;
  tehsil: string;
  province: string;
  programs: string;
  staff: number;
  female: number;
  teachers: number;
  leaders: number;
};

const PALETTE = ["#0e6b57", "#c24d2c", "#2a527a", "#c9922a", "#6b4c9a", "#1f7a4d", "#8a5a2b", "#3d6b8a", "#0f766e", "#9a3412"];

const FIXED: Record<string, Record<string, string>> = {
  gender: { Female: "#c24d2c", Male: "#2a527a", Unknown: "#8a8178" },
  family: {
    Teaching: "#0e6b57",
    Leadership: "#2a527a",
    Administration: "#6b4c9a",
    Support: "#c9922a",
    Other: "#8a8178",
    Unknown: "#8a8178",
  },
  qualification: {
    Doctorate: "#08382d",
    Masters: "#0e6b57",
    Bachelors: "#1f7a4d",
    Intermediate: "#2a527a",
    Matric: "#c9922a",
    Middle: "#8a5a2b",
    Primary: "#c24d2c",
    None: "#6f655c",
    Other: "#6b4c9a",
    "Not recorded": "#b7aa9c",
  },
  program: {
    PEIMA: "#0e6b57",
    "PSRP-I": "#2a527a",
    "PSRP-II": "#1f7a4d",
    PSP: "#c24d2c",
    "Evening School Program": "#6b4c9a",
    "PEN Adoption": "#c9922a",
  },
};

export function colorFor(dim: string, key: string, index: number): string {
  return FIXED[dim]?.[key] ?? PALETTE[index % PALETTE.length];
}

export function metricOf(row: AggRow, metric: Metric): number {
  return row[metric];
}

export function formatMetric(metric: Metric, value: number): string {
  if (metric === "people" || metric === "schools") return fmt(value);
  return pct(value);
}

function matchesList(selected: string[], value: string): boolean {
  return selected.length === 0 || selected.includes(value);
}

function matchesPresence(filter: Presence, present: boolean): boolean {
  if (filter === "Present") return present;
  if (filter === "Missing") return !present;
  return true;
}

export function applyFilters(rows: Staff[], filters: Filters): Staff[] {
  const tokens = filters.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter((row) => {
    if (!matchesList(filters.program, row.program)) return false;
    if (!matchesList(filters.system, row.system)) return false;
    if (!matchesList(filters.donor, row.donor)) return false;
    if (!matchesList(filters.province, row.province)) return false;
    if (!matchesList(filters.district, row.district)) return false;
    if (!matchesList(filters.tehsil, row.tehsil)) return false;
    if (!matchesList(filters.school, row.school)) return false;
    if (!matchesList(filters.gender, row.gender)) return false;
    if (!matchesList(filters.religion, row.religion)) return false;
    if (!matchesList(filters.role, row.role)) return false;
    if (!matchesList(filters.family, row.family)) return false;
    if (!matchesList(filters.qualification, row.qualification)) return false;
    if (!matchesList(filters.source, row.source)) return false;
    if (!matchesPresence(filters.cnic, Boolean(row.cnic))) return false;
    if (!matchesPresence(filters.contact, Boolean(row.contact))) return false;
    if (!matchesPresence(filters.kin, Boolean(row.kinCnic))) return false;
    if (!tokens.length) return true;
    const blob = [
      row.name,
      row.father,
      row.cnic,
      row.kinCnic,
      row.contact,
      row.emis,
      row.school,
      row.district,
      row.tehsil,
      row.role,
      row.qualificationRaw,
    ]
      .join(" ")
      .toLowerCase();
    return tokens.every((token) => blob.includes(token));
  });
}

export function facetCounts(rows: Staff[], filters: Filters, dim: ListKey): { value: string; count: number }[] {
  const base = applyFilters(rows, { ...filters, [dim]: [] });
  const counts = new Map<string, number>();
  for (const row of base) {
    const value = row[dim] || "Unknown";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export function summarize(rows: Staff[]): Summary {
  const schools = new Set<string>();
  const districts = new Set<string>();
  const tehsils = new Set<string>();
  const programs = new Set<string>();
  const summary: Summary = {
    people: rows.length,
    schools: 0,
    districts: 0,
    tehsils: 0,
    programs: 0,
    female: 0,
    male: 0,
    femalePct: 0,
    teaching: 0,
    leadership: 0,
    administration: 0,
    support: 0,
    masters: 0,
    missingCnic: 0,
    missingContact: 0,
    missingKin: 0,
    missingQualification: 0,
    missingFather: 0,
  };
  for (const row of rows) {
    schools.add(`${row.school}|${row.district}`);
    districts.add(row.district);
    tehsils.add(`${row.tehsil}|${row.district}`);
    programs.add(row.program);
    if (row.gender === "Female") summary.female += 1;
    if (row.gender === "Male") summary.male += 1;
    if (row.family === "Teaching") summary.teaching += 1;
    if (row.family === "Leadership") summary.leadership += 1;
    if (row.family === "Administration") summary.administration += 1;
    if (row.family === "Support") summary.support += 1;
    if (row.qualification === "Masters" || row.qualification === "Doctorate") summary.masters += 1;
    if (!row.cnic) summary.missingCnic += 1;
    if (!row.contact) summary.missingContact += 1;
    if (!row.kinCnic) summary.missingKin += 1;
    if (row.qualification === "Not recorded") summary.missingQualification += 1;
    if (!row.father) summary.missingFather += 1;
  }
  summary.schools = schools.size;
  summary.districts = districts.size;
  summary.tehsils = tehsils.size;
  summary.programs = programs.size;
  summary.femalePct = rows.length ? (summary.female / rows.length) * 100 : 0;
  return summary;
}

export function aggregate(rows: Staff[], dim: ListKey): AggRow[] {
  const groups = new Map<string, Staff[]>();
  for (const row of rows) {
    const key = row[dim] || "Unknown";
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  const total = rows.length || 1;
  return [...groups].map(([key, group]) => {
    const people = group.length;
    const rate = (match: (person: Staff) => boolean) => (people ? (group.filter(match).length / people) * 100 : 0);
    return {
      key,
      people,
      share: (people / total) * 100,
      schools: new Set(group.map((person) => `${person.school}|${person.district}`)).size,
      femalePct: rate((person) => person.gender === "Female"),
      teachingPct: rate((person) => person.family === "Teaching"),
      leadershipPct: rate((person) => person.family === "Leadership"),
      supportPct: rate((person) => person.family === "Support"),
      mastersPct: rate((person) => person.qualification === "Masters" || person.qualification === "Doctorate"),
      bachelorsPct: rate((person) => person.qualification === "Bachelors"),
      missingCnicPct: rate((person) => !person.cnic),
      missingContactPct: rate((person) => !person.contact),
    };
  });
}

export function orderedAggregates(rows: AggRow[], dim: ListKey, metric: Metric): AggRow[] {
  const order = dim === "program" ? PROGRAM_ORDER : dim === "family" ? FAMILY_ORDER : dim === "qualification" ? QUAL_ORDER : null;
  return rows.slice().sort((a, b) => {
    if (order) {
      const left = order.indexOf(a.key);
      const right = order.indexOf(b.key);
      if (left !== -1 || right !== -1) return (left === -1 ? 99 : left) - (right === -1 ? 99 : right);
    }
    return metricOf(b, metric) - metricOf(a, metric) || a.key.localeCompare(b.key);
  });
}

export function schoolRows(rows: Staff[]): SchoolRow[] {
  const groups = new Map<string, Staff[]>();
  for (const row of rows) {
    const key = `${row.school}|${row.district}`;
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.values()]
    .map((group) => {
      const first = group[0];
      const programs = [...new Set(group.map((person) => person.program))].sort().join(", ");
      return {
        school: first.school,
        district: first.district,
        tehsil: first.tehsil,
        province: first.province,
        programs,
        staff: group.length,
        female: group.filter((person) => person.gender === "Female").length,
        teachers: group.filter((person) => person.family === "Teaching").length,
        leaders: group.filter((person) => person.family === "Leadership").length,
      };
    })
    .sort((a, b) => b.staff - a.staff || a.school.localeCompare(b.school));
}

export function duplicateCnics(rows: Staff[]): { cnic: string; count: number; names: string[] }[] {
  const groups = new Map<string, Staff[]>();
  for (const row of rows) {
    if (!row.cnic) continue;
    const list = groups.get(row.cnic);
    if (list) list.push(row);
    else groups.set(row.cnic, [row]);
  }
  return [...groups]
    .filter(([, group]) => group.length > 1)
    .map(([cnic, group]) => ({
      cnic,
      count: group.length,
      names: group.map((person) => person.name),
    }))
    .sort((a, b) => b.count - a.count || a.cnic.localeCompare(b.cnic));
}

export function qualityScore(rows: Staff[]) {
  const total = rows.length || 1;
  const rate = (match: (person: Staff) => boolean) => rows.filter(match).length / total;
  const duplicates = duplicateCnics(rows);
  const extra = duplicates.reduce((sum, item) => sum + item.count - 1, 0);
  const parts = [
    { label: "CNIC on file", weight: 25, rate: rate((person) => Boolean(person.cnic)) },
    { label: "Contact on file", weight: 20, rate: rate((person) => Boolean(person.contact)) },
    { label: "Father or husband", weight: 15, rate: rate((person) => Boolean(person.father)) },
    { label: "Qualification recorded", weight: 15, rate: rate((person) => person.qualification !== "Not recorded") },
    { label: "Gender", weight: 10, rate: rate((person) => person.gender !== "Unknown") },
    { label: "Kin CNIC", weight: 10, rate: rate((person) => Boolean(person.kinCnic)) },
    { label: "CNIC used once", weight: 5, rate: Math.max(0, 1 - extra / total) },
  ];
  const score = Math.round(parts.reduce((sum, part) => sum + part.weight * part.rate, 0));
  return { score, parts, extra, duplicates };
}

export function isFiltered(filters: Filters): boolean {
  if (filters.q.trim()) return true;
  if (filters.cnic !== "all" || filters.contact !== "all" || filters.kin !== "all") return true;
  return LIST_KEYS.some((key) => filters[key].length > 0);
}

export function activeChips(filters: Filters): { key: string; label: string }[] {
  const chips: { key: string; label: string }[] = [];
  if (filters.q.trim()) chips.push({ key: "q", label: `Search: ${filters.q.trim()}` });
  for (const key of LIST_KEYS) {
    for (const value of filters[key]) chips.push({ key: `${key}:${value}`, label: value });
  }
  if (filters.cnic !== "all") chips.push({ key: "cnic", label: `CNIC ${filters.cnic.toLowerCase()}` });
  if (filters.contact !== "all") chips.push({ key: "contact", label: `Contact ${filters.contact.toLowerCase()}` });
  if (filters.kin !== "all") chips.push({ key: "kin", label: `Kin CNIC ${filters.kin.toLowerCase()}` });
  return chips;
}

export function removeChip(filters: Filters, key: string): Filters {
  if (key === "q") return { ...filters, q: "" };
  if (key === "cnic" || key === "contact" || key === "kin") return { ...filters, [key]: "all" };
  const cut = key.indexOf(":");
  const dim = key.slice(0, cut) as ListKey;
  const value = key.slice(cut + 1);
  if (!LIST_KEYS.includes(dim)) return filters;
  return { ...filters, [dim]: filters[dim].filter((item) => item !== value) };
}

export function pickDim(filters: Filters, dim: Dim, value: string): Filters {
  if (dim === "cnic" || dim === "contact" || dim === "kin") {
    const next: Presence = value === "Missing" ? "Missing" : "Present";
    return { ...filters, [dim]: filters[dim] === next ? "all" : next };
  }
  const selected = filters[dim];
  return {
    ...filters,
    [dim]: selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
  };
}

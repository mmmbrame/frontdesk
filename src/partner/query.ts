import type { PartnerEntry } from "./catalog";

export type PartnerKey =
  | "theme"
  | "programme"
  | "pipeline"
  | "province"
  | "district"
  | "beneficiary"
  | "sdg"
  | "crossCutting"
  | "status"
  | "years";

export type PartnerFilters = {
  q: string;
  theme: string[];
  programme: string[];
  pipeline: string[];
  province: string[];
  district: string[];
  beneficiary: string[];
  sdg: string[];
  crossCutting: string[];
  status: string[];
  years: string[];
};

export const EMPTY_PARTNER_FILTERS: PartnerFilters = {
  q: "",
  theme: [],
  programme: [],
  pipeline: [],
  province: [],
  district: [],
  beneficiary: [],
  sdg: [],
  crossCutting: [],
  status: [],
  years: [],
};

export const FILTER_KEYS: PartnerKey[] = [
  "theme",
  "programme",
  "pipeline",
  "province",
  "district",
  "beneficiary",
  "sdg",
  "crossCutting",
  "status",
  "years",
];

const LIST_LABELS: Record<PartnerKey, string> = {
  theme: "Theme",
  programme: "Programme",
  pipeline: "Pipeline",
  province: "Province",
  district: "District",
  beneficiary: "Beneficiary",
  sdg: "SDG",
  crossCutting: "Cross-cutting",
  status: "Status",
  years: "Years of experience",
};

export function filterLabel(key: PartnerKey): string {
  return LIST_LABELS[key];
}

function selected(values: string[], value: string): boolean {
  return values.length === 0 || values.includes(value);
}

export function applyPartnerFilters(rows: PartnerEntry[], filters: PartnerFilters): PartnerEntry[] {
  const tokens = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter((row) => {
    if (!selected(filters.theme, row.theme)) return false;
    if (!selected(filters.programme, row.programme)) return false;
    if (!selected(filters.pipeline, row.pipeline)) return false;
    if (!selected(filters.province, row.province)) return false;
    if (!selected(filters.district, row.district)) return false;
    if (!selected(filters.beneficiary, row.beneficiary)) return false;
    if (!selected(filters.sdg, row.sdg)) return false;
    if (!selected(filters.crossCutting, row.crossCutting)) return false;
    if (!selected(filters.status, row.status)) return false;
    if (!selected(filters.years, row.years)) return false;
    if (!tokens.length) return true;
    const blob = [row.id, row.theme, row.subtheme, row.programme, row.pipeline, row.province, row.district, row.beneficiary, row.sdg, row.crossCutting, row.status]
      .join(" ")
      .toLowerCase();
    return tokens.every((token) => blob.includes(token));
  });
}

export function isPartnerFiltered(filters: PartnerFilters): boolean {
  if (filters.q.trim()) return true;
  return FILTER_KEYS.some((key) => filters[key].length > 0);
}

export function partnerChips(filters: PartnerFilters): { key: string; label: string }[] {
  const chips: { key: string; label: string }[] = [];
  if (filters.q.trim()) chips.push({ key: "q", label: `Search: ${filters.q.trim()}` });
  for (const key of FILTER_KEYS) {
    for (const value of filters[key]) chips.push({ key: `${key}:${value}`, label: value });
  }
  return chips;
}

export function removePartnerChip(filters: PartnerFilters, key: string): PartnerFilters {
  if (key === "q") return { ...filters, q: "" };
  const split = key.indexOf(":");
  const dim = key.slice(0, split) as PartnerKey;
  const value = key.slice(split + 1);
  return { ...filters, [dim]: filters[dim].filter((item) => item !== value) };
}

export function togglePartner(filters: PartnerFilters, key: PartnerKey, value: string): PartnerFilters {
  const current = filters[key];
  return {
    ...filters,
    [key]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
  };
}

export type PartnerSummary = {
  entries: number;
  students: number;
  girls: number;
  outOfSchool: number;
  teachers: number;
  schools: number;
  academicSchools: number;
  digitalStudents: number;
  digitalResources: number;
  scholarships: number;
  improvedSchools: number;
  communitySessions: number;
  safeguarding: number;
  researchProducts: number;
  provinces: number;
  districts: number;
  themes: number;
  programmes: number;
  inProcess: number;
};

export function summarizePartners(rows: PartnerEntry[]): PartnerSummary {
  const summary: PartnerSummary = {
    entries: rows.length,
    students: 0,
    girls: 0,
    outOfSchool: 0,
    teachers: 0,
    schools: 0,
    academicSchools: 0,
    digitalStudents: 0,
    digitalResources: 0,
    scholarships: 0,
    improvedSchools: 0,
    communitySessions: 0,
    safeguarding: 0,
    researchProducts: 0,
    provinces: new Set(rows.map((row) => row.province)).size,
    districts: new Set(rows.map((row) => row.district)).size,
    themes: new Set(rows.map((row) => row.theme)).size,
    programmes: new Set(rows.map((row) => row.programme)).size,
    inProcess: 0,
  };
  for (const row of rows) {
    summary.students += row.students;
    summary.girls += row.girls;
    summary.outOfSchool += row.outOfSchool;
    summary.teachers += row.teachers;
    summary.schools += row.schools;
    summary.academicSchools += row.academicSchools;
    summary.digitalStudents += row.digitalStudents;
    summary.digitalResources += row.digitalResources;
    summary.scholarships += row.scholarships;
    summary.improvedSchools += row.improvedSchools;
    summary.communitySessions += row.communitySessions;
    summary.safeguarding += row.safeguarding;
    summary.researchProducts += row.researchProducts;
    if (row.status === "In process") summary.inProcess += 1;
  }
  return summary;
}

export type PartnerGroup = { key: string; entries: number; students: number; teachers: number; schools: number; share: number };

export function groupPartners(rows: PartnerEntry[], key: PartnerKey): PartnerGroup[] {
  const groups = new Map<string, PartnerEntry[]>();
  for (const row of rows) {
    const name = row[key] || "Unknown";
    const list = groups.get(name);
    if (list) list.push(row);
    else groups.set(name, [row]);
  }
  const total = rows.length || 1;
  return [...groups]
    .map(([name, list]) => ({
      key: name,
      entries: list.length,
      students: list.reduce((sum, row) => sum + row.students, 0),
      teachers: list.reduce((sum, row) => sum + row.teachers, 0),
      schools: list.reduce((sum, row) => sum + row.schools, 0),
      share: (list.length / total) * 100,
    }))
    .sort((a, b) => b.entries - a.entries || a.key.localeCompare(b.key));
}

export function facetPartners(rows: PartnerEntry[], filters: PartnerFilters, key: PartnerKey): { value: string; count: number }[] {
  const base = applyPartnerFilters(rows, { ...filters, [key]: [] });
  const counts = new Map<string, number>();
  for (const row of base) counts.set(row[key], (counts.get(row[key]) ?? 0) + 1);
  return [...counts].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

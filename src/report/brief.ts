import { fmt, pct } from "../format";
import { aggregate as aggregateStudents, summarize as summarizeStudents } from "../query";
import { aggregate as aggregateStaff, summarize as summarizeStaff } from "../staff/query";
import type { Staff } from "../staff/types";
import type { Dim, Student } from "../types";
import type { ReportAngle, ReportBrief, ReportTable } from "../../shared/report";

type Unit = "pct" | "years";

type MetricSpec = {
  id: string;
  label: string;
  unit: Unit;
  minGap: number;
  weight: number;
  minHigh?: number;
};

type Rule = { pattern: RegExp; dimensions: string[]; metrics: string[] };

type Group = {
  name: string;
  count: number;
  share: number;
  values: Record<string, number | null>;
};

type Cut = { id: string; label: string; groups: Group[] };

type Scored = {
  dimension: string;
  metric: string;
  metricId: string;
  text: string;
  score: number;
  cutId: string;
  unit: Unit | "share";
};

function scrub(value: string): string {
  return value.replace(/\d{5}-\d{7}-\d/g, "[id]").replace(/\b\d{11,}\b/g, "[id]").replace(/\s+/g, " ").trim();
}

function minCount(total: number): number {
  if (total <= 40) return Math.max(3, Math.round(total * 0.1));
  return Math.max(15, Math.round(total * 0.01));
}

function formatValue(unit: Unit, value: number): string {
  return unit === "years" ? `${value.toFixed(1)} years` : pct(value);
}

function formatGap(unit: Unit, gap: number): string {
  return unit === "years" ? `${gap.toFixed(1)} years` : `${gap.toFixed(1)} percentage points`;
}

function boost(question: string, rules: Rule[], dimension: string, metricId: string): number {
  const asked = question.toLowerCase();
  if (!asked.trim()) return 1;
  let factor = 1;
  for (const rule of rules) {
    if (!rule.pattern.test(asked)) continue;
    if (rule.dimensions.includes(dimension)) factor *= 3;
    if (rule.metrics.includes(metricId)) factor *= 3;
  }
  return factor;
}

function rank(total: number, cuts: Cut[], metrics: MetricSpec[], skip: Record<string, string[]>, rules: Rule[], question: string) {
  const floor = minCount(total);
  const scored: Scored[] = [];
  const usable = new Map<string, Group[]>();

  for (const cut of cuts) {
    const groups = cut.groups.filter((group) => group.count >= floor);
    if (groups.length < 2) continue;
    usable.set(cut.id, groups);
    const weight = boost(question, rules, cut.id, "share");
    const top = groups.slice().sort((a, b) => b.count - a.count)[0];
    const even = 100 / groups.length;
    const bar = groups.length === 2 ? 62 : 40;
    if (top.share >= bar && top.share - even >= 12) {
      const unknown = /unknown|not recorded/i.test(top.name);
      scored.push({
        dimension: cut.label,
        metric: "Concentration",
        metricId: "share",
        cutId: cut.id,
        unit: "share",
        score: (top.share - even) * (unknown ? 0.55 : 0.85) * weight,
        text: `${cut.label}: ${top.name} accounts for ${pct(top.share)} of this view (${fmt(top.count)} of ${fmt(total)}).`,
      });
    }

    for (const metric of metrics) {
      if (skip[cut.id]?.includes(metric.id)) continue;
      const comparable = groups.filter((group) => {
        const value = group.values[metric.id];
        return value != null && Number.isFinite(value);
      });
      if (comparable.length < 2) continue;
      const ordered = comparable.slice().sort((a, b) => (a.values[metric.id] ?? 0) - (b.values[metric.id] ?? 0));
      const low = ordered[0];
      const high = ordered[ordered.length - 1];
      const highValue = high.values[metric.id] ?? 0;
      const lowValue = low.values[metric.id] ?? 0;
      const gap = highValue - lowValue;
      if (gap < metric.minGap) continue;
      if (metric.minHigh != null && highValue < metric.minHigh) continue;
      const support = Math.min(high.count, low.count);
      scored.push({
        dimension: cut.label,
        metric: metric.label,
        metricId: metric.id,
        cutId: cut.id,
        unit: metric.unit,
        score: gap * Math.log10(support + 10) * metric.weight * boost(question, rules, cut.id, metric.id),
        text: `${cut.label} × ${metric.label}: ${high.name} is ${formatValue(metric.unit, highValue)} (${fmt(high.count)} records) and ${low.name} is ${formatValue(metric.unit, lowValue)} (${fmt(low.count)}). The gap is ${formatGap(metric.unit, gap)}.`,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const pool = scored.slice(0, 5);
  const lead = pool.find((item) => item.metricId !== "share");
  const next = pool.find((item) => item.metricId !== "share" && item.metricId !== lead?.metricId && item.cutId !== lead?.cutId);
  let chosen = pool;
  if (lead && next) {
    const combo: Scored = {
      dimension: "Combination",
      metric: `${lead.metric} with ${next.metric}`,
      metricId: "combination",
      cutId: "",
      unit: "share",
      score: ((lead.score + next.score) / 2) * 0.9,
      text: `Read ${lead.dimension} × ${lead.metric} together with ${next.dimension} × ${next.metric}. Those are the two strongest comparisons in this view.`,
    };
    const rest = pool.filter((item) => item !== lead && item !== next);
    chosen = [combo, lead, next, ...rest].slice(0, 5);
    chosen.sort((a, b) => b.score - a.score);
  }
  const tables: ReportTable[] = [];
  const seen = new Set<string>();
  for (const angle of chosen) {
    if (!angle.cutId || angle.metricId === "share" || seen.has(`${angle.cutId}:${angle.metricId}`)) continue;
    const groups = usable.get(angle.cutId);
    const metric = metrics.find((item) => item.id === angle.metricId);
    if (!groups || !metric) continue;
    seen.add(`${angle.cutId}:${angle.metricId}`);
    const ranked = groups
      .filter((group) => group.values[metric.id] != null)
      .slice()
      .sort((a, b) => (b.values[metric.id] ?? 0) - (a.values[metric.id] ?? 0) || b.count - a.count);
    const picked: Group[] = [];
    const names = new Set<string>();
    for (const group of [...ranked.slice(0, 6), ...ranked.slice(-2)]) {
      if (names.has(group.name)) continue;
      names.add(group.name);
      picked.push(group);
    }
    tables.push({
      title: `${angle.dimension} × ${metric.label}`,
      columns: [angle.dimension, "Records", "Share of view", metric.label],
      rows: picked.map((group) => [
        group.name,
        fmt(group.count),
        pct(group.share),
        formatValue(metric.unit, group.values[metric.id] ?? 0),
      ]),
    });
    if (tables.length === 4) break;
  }

  const angles: ReportAngle[] = chosen.map((angle) => ({
    dimension: angle.dimension,
    metric: angle.metric,
    text: angle.text,
  }));
  return { angles, tables };
}

function shareOf(count: number, total: number): string {
  return `${fmt(count)} (${pct(total ? (count / total) * 100 : 0)})`;
}

const STUDENT_METRICS: MetricSpec[] = [
  { id: "femalePct", label: "female share", unit: "pct", minGap: 12, weight: 1.3 },
  { id: "missingBformPct", label: "missing B-Form", unit: "pct", minGap: 8, weight: 1.35 },
  { id: "medianAge", label: "median age", unit: "years", minGap: 2, weight: 1.1 },
  { id: "secondaryPct", label: "secondary share", unit: "pct", minGap: 12, weight: 1.05 },
  { id: "earlyPct", label: "early-years share", unit: "pct", minGap: 12, weight: 0.95 },
  { id: "disabilityPct", label: "disability flag", unit: "pct", minGap: 1.5, weight: 1.2, minHigh: 1 },
  { id: "disasterPct", label: "disaster flag", unit: "pct", minGap: 3, weight: 1.15, minHigh: 2 },
  { id: "afghaniPct", label: "Afghani flag", unit: "pct", minGap: 1.5, weight: 1.1, minHigh: 1 },
];

const STUDENT_RULES: Rule[] = [
  { pattern: /girl|boy|female|male|gender|women|men/, dimensions: ["district", "tehsil", "program", "province"], metrics: ["femalePct"] },
  { pattern: /b-?form|identity|missing|record|quality/, dimensions: ["program", "district", "tehsil"], metrics: ["missingBformPct"] },
  { pattern: /age|older|young|under/, dimensions: ["ageBand", "program", "district", "grade"], metrics: ["medianAge"] },
  { pattern: /grade|class|secondary|middle|primary|early|stage/, dimensions: ["grade", "stage", "program"], metrics: ["secondaryPct", "earlyPct"] },
  { pattern: /district|tehsil|where|place|geograph|province/, dimensions: ["district", "tehsil", "province"], metrics: [] },
  { pattern: /program|peima|psrp|psp|evening|adoption|donor|system/, dimensions: ["program", "donor", "system"], metrics: [] },
  { pattern: /disab/, dimensions: ["program", "district"], metrics: ["disabilityPct"] },
  { pattern: /disaster|flood/, dimensions: ["program", "district"], metrics: ["disasterPct"] },
  { pattern: /afghan/, dimensions: ["program", "district"], metrics: ["afghaniPct"] },
  { pattern: /religion|faith/, dimensions: ["religion"], metrics: [] },
];

const STUDENT_DIMS: { id: Dim; label: string }[] = [
  { id: "program", label: "Program" },
  { id: "system", label: "System" },
  { id: "donor", label: "Donor" },
  { id: "province", label: "Province" },
  { id: "district", label: "District" },
  { id: "tehsil", label: "Tehsil" },
  { id: "gender", label: "Gender" },
  { id: "grade", label: "Grade" },
  { id: "stage", label: "Stage" },
  { id: "religion", label: "Religion" },
  { id: "ageBand", label: "Age band" },
  { id: "admitYear", label: "Admission year" },
];

export function studentBrief(rows: Student[], universe: number, filters: string[], question: string): ReportBrief {
  const summary = summarizeStudents(rows);
  const total = summary.students;
  const overview = [
    { label: "Filters", value: filters.length ? filters.map((item) => scrub(item).slice(0, 80)).join("; ") : "None. This is the full census." },
    { label: "Students in this view", value: fmt(total) },
    { label: "Share of the full census", value: pct(universe ? (total / universe) * 100 : 0) },
    { label: "Schools", value: fmt(summary.schools) },
    { label: "Districts", value: fmt(summary.districts) },
    { label: "Tehsils", value: fmt(summary.tehsils) },
    { label: "Programs", value: fmt(summary.programs) },
    { label: "Female", value: shareOf(summary.female, total) },
    { label: "Male", value: shareOf(summary.male, total) },
    { label: "Median age", value: summary.medianAge == null ? "Not available" : `${summary.medianAge.toFixed(1)} years` },
    { label: "Missing B-Form", value: shareOf(summary.missingBform, total) },
    { label: "Missing date of birth", value: shareOf(summary.missingDob, total) },
    { label: "Missing admission date", value: shareOf(summary.missingAdmission, total) },
    { label: "Disability flagged", value: shareOf(summary.disability, total) },
    { label: "Disaster flagged", value: shareOf(summary.disaster, total) },
    { label: "Afghani flagged", value: shareOf(summary.afghani, total) },
    { label: "Early years", value: shareOf(summary.early, total) },
    { label: "Primary", value: shareOf(summary.primary, total) },
    { label: "Middle", value: shareOf(summary.middle, total) },
    { label: "Secondary", value: shareOf(summary.secondary, total) },
  ];
  if (!total) return { audience: "students", total, universe, filters, overview, angles: [], tables: [] };

  const cuts = STUDENT_DIMS.map((dim) => ({
    id: dim.id,
    label: dim.label,
    groups: aggregateStudents(rows, dim.id).map((row) => ({
      name: scrub(row.key).slice(0, 80) || "Unknown",
      count: row.students,
      share: row.share,
      values: {
        femalePct: row.femalePct,
        missingBformPct: row.missingBformPct,
        medianAge: row.medianAge,
        secondaryPct: row.secondaryPct,
        earlyPct: row.earlyPct,
        disabilityPct: row.disabilityPct,
        disasterPct: row.disasterPct,
        afghaniPct: row.afghaniPct,
      },
    })),
  }));
  const { angles, tables } = rank(total, cuts, STUDENT_METRICS, {
    gender: ["femalePct"],
    ageBand: ["medianAge", "earlyPct", "secondaryPct"],
    stage: ["medianAge", "earlyPct", "secondaryPct"],
    grade: ["medianAge", "earlyPct", "secondaryPct"],
  }, STUDENT_RULES, question);
  return { audience: "students", total, universe, filters, overview, angles, tables };
}

const STAFF_METRICS: MetricSpec[] = [
  { id: "femalePct", label: "female share", unit: "pct", minGap: 12, weight: 1.25 },
  { id: "teachingPct", label: "teaching share", unit: "pct", minGap: 15, weight: 1.2 },
  { id: "leadershipPct", label: "leadership share", unit: "pct", minGap: 10, weight: 1.1 },
  { id: "supportPct", label: "support share", unit: "pct", minGap: 12, weight: 1.05 },
  { id: "mastersPct", label: "masters share", unit: "pct", minGap: 12, weight: 1.2 },
  { id: "bachelorsPct", label: "bachelors share", unit: "pct", minGap: 12, weight: 1 },
  { id: "missingCnicPct", label: "missing CNIC", unit: "pct", minGap: 8, weight: 1.35 },
  { id: "missingContactPct", label: "missing contact", unit: "pct", minGap: 10, weight: 1.25 },
];

const STAFF_RULES: Rule[] = [
  { pattern: /woman|women|female|male|gender|girl|boy/, dimensions: ["district", "program", "role", "province"], metrics: ["femalePct"] },
  { pattern: /teach/, dimensions: ["family", "role", "program", "district"], metrics: ["teachingPct"] },
  { pattern: /leader|principal|head/, dimensions: ["family", "role"], metrics: ["leadershipPct"] },
  { pattern: /support|aya|guard|peon/, dimensions: ["family", "role"], metrics: ["supportPct"] },
  { pattern: /qualif|degree|master|bachelor|illiterate/, dimensions: ["qualification", "role", "district"], metrics: ["mastersPct", "bachelorsPct"] },
  { pattern: /cnic|identity/, dimensions: ["program", "district"], metrics: ["missingCnicPct"] },
  { pattern: /contact|phone|mobile/, dimensions: ["program", "district"], metrics: ["missingContactPct"] },
  { pattern: /missing|record|quality/, dimensions: ["program", "district"], metrics: ["missingCnicPct", "missingContactPct"] },
  { pattern: /district|tehsil|where|place|province/, dimensions: ["district", "tehsil", "province"], metrics: [] },
  { pattern: /program|peima|psrp|psp|evening|adoption/, dimensions: ["program", "donor", "system"], metrics: [] },
  { pattern: /religion/, dimensions: ["religion"], metrics: [] },
];

const STAFF_DIMS: { id: "program" | "system" | "donor" | "province" | "district" | "tehsil" | "gender" | "family" | "role" | "qualification" | "religion"; label: string }[] = [
  { id: "program", label: "Program" },
  { id: "system", label: "System" },
  { id: "donor", label: "Donor" },
  { id: "province", label: "Province" },
  { id: "district", label: "District" },
  { id: "tehsil", label: "Tehsil" },
  { id: "gender", label: "Gender" },
  { id: "family", label: "Role family" },
  { id: "role", label: "Role" },
  { id: "qualification", label: "Qualification" },
  { id: "religion", label: "Religion" },
];

export function staffBrief(rows: Staff[], universe: number, filters: string[], question: string): ReportBrief {
  const summary = summarizeStaff(rows);
  const total = summary.people;
  const overview = [
    { label: "Filters", value: filters.length ? filters.map((item) => scrub(item).slice(0, 80)).join("; ") : "None. This is the full register." },
    { label: "Staff in this view", value: fmt(total) },
    { label: "Share of the full register", value: pct(universe ? (total / universe) * 100 : 0) },
    { label: "Schools", value: fmt(summary.schools) },
    { label: "Districts", value: fmt(summary.districts) },
    { label: "Tehsils", value: fmt(summary.tehsils) },
    { label: "Programs", value: fmt(summary.programs) },
    { label: "Female", value: shareOf(summary.female, total) },
    { label: "Male", value: shareOf(summary.male, total) },
    { label: "Teaching", value: shareOf(summary.teaching, total) },
    { label: "Leadership", value: shareOf(summary.leadership, total) },
    { label: "Administration", value: shareOf(summary.administration, total) },
    { label: "Support", value: shareOf(summary.support, total) },
    { label: "Masters or doctorate", value: shareOf(summary.masters, total) },
    { label: "Missing CNIC", value: shareOf(summary.missingCnic, total) },
    { label: "Missing contact", value: shareOf(summary.missingContact, total) },
    { label: "Qualification not recorded", value: shareOf(summary.missingQualification, total) },
    { label: "Father or husband missing", value: shareOf(summary.missingFather, total) },
  ];
  if (!total) return { audience: "staff", total, universe, filters, overview, angles: [], tables: [] };

  const cuts = STAFF_DIMS.map((dim) => ({
    id: dim.id,
    label: dim.label,
    groups: aggregateStaff(rows, dim.id).map((row) => ({
      name: scrub(row.key).slice(0, 80) || "Unknown",
      count: row.people,
      share: row.share,
      values: {
        femalePct: row.femalePct,
        teachingPct: row.teachingPct,
        leadershipPct: row.leadershipPct,
        supportPct: row.supportPct,
        mastersPct: row.mastersPct,
        bachelorsPct: row.bachelorsPct,
        missingCnicPct: row.missingCnicPct,
        missingContactPct: row.missingContactPct,
      },
    })),
  }));
  const { angles, tables } = rank(total, cuts, STAFF_METRICS, {
    gender: ["femalePct"],
    family: ["teachingPct", "leadershipPct", "supportPct"],
    role: ["teachingPct", "leadershipPct", "supportPct"],
    qualification: ["mastersPct", "bachelorsPct"],
  }, STAFF_RULES, question);
  return { audience: "staff", total, universe, filters, overview, angles, tables };
}

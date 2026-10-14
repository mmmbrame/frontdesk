import { countLabel, median, pct } from "./format";
import {
  AGE_BAND_ORDER,
  GRADE_ORDER,
  PROGRAM_ORDER,
  STAGE_ORDER,
  type Dim,
  type Filters,
  type ListKey,
  type Metric,
  type Student,
} from "./types";

export type AggRow = {
  key: string;
  students: number;
  share: number;
  schools: number;
  femalePct: number;
  malePct: number;
  disabilityPct: number;
  disasterPct: number;
  afghaniPct: number;
  missingBformPct: number;
  medianAge: number | null;
  earlyPct: number;
  primaryPct: number;
  middlePct: number;
  secondaryPct: number;
};

export type Summary = {
  students: number;
  schools: number;
  districts: number;
  tehsils: number;
  programs: number;
  female: number;
  male: number;
  unknownGender: number;
  femalePct: number;
  malePct: number;
  disability: number;
  disaster: number;
  afghani: number;
  missingBform: number;
  missingDob: number;
  missingAdmission: number;
  missingFather: number;
  medianAge: number | null;
  early: number;
  primary: number;
  middle: number;
  secondary: number;
};

export type Facet = { value: string; count: number };

export type SchoolGroup = {
  key: string;
  school: string;
  emis: string;
  district: string;
  tehsil: string;
  province: string;
  program: string;
  system: string;
  donor: string;
  students: number;
  female: number;
  male: number;
  disability: number;
  disaster: number;
  missingBform: number;
  grades: { grade: string; count: number }[];
};

export type Insight = { kicker: string; title: string; body: string };

const NATURAL: Partial<Record<Dim, readonly string[]>> = {
  grade: GRADE_ORDER,
  stage: STAGE_ORDER,
  ageBand: AGE_BAND_ORDER,
  program: PROGRAM_ORDER,
};

export function valueOf(student: Student, dim: Dim): string {
  switch (dim) {
    case "admitYear":
      return student.admitYear ? String(student.admitYear) : "Unknown";
    case "bform":
      return student.bform ? "Present" : "Missing";
    case "ageBand":
      return student.ageBand;
    case "disability":
      return student.disability;
    case "disaster":
      return student.disaster;
    case "afghani":
      return student.afghani;
    default:
      return student[dim] || "Unknown";
  }
}

function inList(selected: string[], value: string): boolean {
  return selected.length === 0 || selected.includes(value);
}

export function matches(student: Student, filters: Filters, except?: Dim): boolean {
  if (filters.q.trim()) {
    const tokens = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.every((token) => student.search.includes(token))) return false;
  }
  const lists: ListKey[] = [
    "program",
    "system",
    "donor",
    "project",
    "source",
    "province",
    "district",
    "tehsil",
    "school",
    "gender",
    "grade",
    "stage",
    "stream",
    "religion",
    "admitYear",
    "ageBand",
  ];
  for (const key of lists) {
    if (key === except) continue;
    if (!inList(filters[key], valueOf(student, key))) return false;
  }
  if (except !== "disability" && filters.disability !== "all" && student.disability !== filters.disability) {
    return false;
  }
  if (except !== "afghani" && filters.afghani !== "all" && student.afghani !== filters.afghani) return false;
  if (except !== "disaster" && filters.disaster !== "all" && student.disaster !== filters.disaster) return false;
  if (except !== "bform") {
    if (filters.bform === "Present" && !student.bform) return false;
    if (filters.bform === "Missing" && student.bform) return false;
  }
  const ageActive = filters.ageMin != null || filters.ageMax != null;
  if (except !== "ageBand" && ageActive) {
    if (student.age < 0) return false;
    if (filters.ageMin != null && student.age < filters.ageMin) return false;
    if (filters.ageMax != null && student.age > filters.ageMax) return false;
  }
  const admitActive = filters.admitMin != null || filters.admitMax != null;
  if (except !== "admitYear" && admitActive) {
    if (!student.admitYear) return false;
    if (filters.admitMin != null && student.admitYear < filters.admitMin) return false;
    if (filters.admitMax != null && student.admitYear > filters.admitMax) return false;
  }
  return true;
}

export function applyFilters(students: Student[], filters: Filters): Student[] {
  return students.filter((student) => matches(student, filters));
}

export function facetCounts(students: Student[], filters: Filters, dim: Dim): Facet[] {
  const counts = new Map<string, number>();
  for (const student of students) {
    if (!matches(student, filters, dim)) continue;
    const value = valueOf(student, dim);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const items = [...counts.entries()].map(([value, count]) => ({ value, count }));
  return sortFacet(dim, items);
}

export function sortFacet(dim: Dim, items: Facet[]): Facet[] {
  const order = NATURAL[dim];
  if (order) {
    return items.slice().sort((a, b) => {
      const ai = order.indexOf(a.value);
      const bi = order.indexOf(b.value);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }
  if (dim === "admitYear") {
    return items.slice().sort((a, b) => Number(a.value) - Number(b.value));
  }
  return items.slice().sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

function bump(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

export function summarize(students: Student[]): Summary {
  const schools = new Set<string>();
  const districts = new Set<string>();
  const tehsils = new Set<string>();
  const programs = new Set<string>();
  const ages: number[] = [];
  let female = 0;
  let male = 0;
  let unknownGender = 0;
  let disability = 0;
  let disaster = 0;
  let afghani = 0;
  let missingBform = 0;
  let missingDob = 0;
  let missingAdmission = 0;
  let missingFather = 0;
  let early = 0;
  let primary = 0;
  let middle = 0;
  let secondary = 0;
  for (const student of students) {
    schools.add(`${student.emis}|${student.school}`);
    districts.add(student.district);
    tehsils.add(`${student.district}|${student.tehsil}`);
    programs.add(student.program);
    if (student.gender === "Female") female += 1;
    else if (student.gender === "Male") male += 1;
    else unknownGender += 1;
    if (student.disability === "Yes") disability += 1;
    if (student.disaster === "Yes") disaster += 1;
    if (student.afghani === "Yes") afghani += 1;
    if (!student.bform) missingBform += 1;
    if (!student.dob) missingDob += 1;
    if (!student.admitted) missingAdmission += 1;
    if (!student.father) missingFather += 1;
    if (student.age >= 0) ages.push(student.age);
    if (student.stage === "Early Years") early += 1;
    else if (student.stage === "Primary") primary += 1;
    else if (student.stage === "Middle") middle += 1;
    else if (student.stage === "Secondary") secondary += 1;
  }
  const n = students.length;
  return {
    students: n,
    schools: schools.size,
    districts: districts.size,
    tehsils: tehsils.size,
    programs: programs.size,
    female,
    male,
    unknownGender,
    femalePct: n ? (female / n) * 100 : 0,
    malePct: n ? (male / n) * 100 : 0,
    disability,
    disaster,
    afghani,
    missingBform,
    missingDob,
    missingAdmission,
    missingFather,
    medianAge: median(ages),
    early,
    primary,
    middle,
    secondary,
  };
}

export function aggregate(students: Student[], dim: Dim): AggRow[] {
  const groups = new Map<string, Student[]>();
  for (const student of students) {
    const key = valueOf(student, dim);
    const bucket = groups.get(key);
    if (bucket) bucket.push(student);
    else groups.set(key, [student]);
  }
  const total = students.length;
  const rows: AggRow[] = [];
  for (const [key, group] of groups) {
    const summary = summarize(group);
    rows.push({
      key,
      students: summary.students,
      share: total ? (summary.students / total) * 100 : 0,
      schools: summary.schools,
      femalePct: summary.femalePct,
      malePct: summary.malePct,
      disabilityPct: summary.students ? (summary.disability / summary.students) * 100 : 0,
      disasterPct: summary.students ? (summary.disaster / summary.students) * 100 : 0,
      afghaniPct: summary.students ? (summary.afghani / summary.students) * 100 : 0,
      missingBformPct: summary.students ? (summary.missingBform / summary.students) * 100 : 0,
      medianAge: summary.medianAge,
      earlyPct: summary.students ? (summary.early / summary.students) * 100 : 0,
      primaryPct: summary.students ? (summary.primary / summary.students) * 100 : 0,
      middlePct: summary.students ? (summary.middle / summary.students) * 100 : 0,
      secondaryPct: summary.students ? (summary.secondary / summary.students) * 100 : 0,
    });
  }
  return rows;
}

export function metricOf(row: AggRow, metric: Metric): number {
  const value = row[metric];
  return value ?? 0;
}

export function orderedAggregates(rows: AggRow[], dim: Dim, metric: Metric, bySize: boolean): AggRow[] {
  if (!bySize && (NATURAL[dim] || dim === "admitYear")) {
    const order = NATURAL[dim];
    return rows.slice().sort((a, b) => {
      if (dim === "admitYear") return Number(a.key) - Number(b.key);
      const ai = order!.indexOf(a.key);
      const bi = order!.indexOf(b.key);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }
  return rows.slice().sort((a, b) => metricOf(b, metric) - metricOf(a, metric) || b.students - a.students);
}

export type SplitRow = { name: string; total: number; [series: string]: string | number };

export function splitAggregate(
  students: Student[],
  dim: Dim,
  split: Dim,
  limit: number,
): { rows: SplitRow[]; series: string[] } {
  const primary = aggregate(students, dim)
    .sort((a, b) => b.students - a.students)
    .slice(0, limit);
  const keep = new Set(primary.map((row) => row.key));
  const seriesCounts = new Map<string, number>();
  const cells = new Map<string, Map<string, number>>();
  for (const student of students) {
    const rowKey = valueOf(student, dim);
    if (!keep.has(rowKey)) continue;
    const seriesKey = valueOf(student, split);
    seriesCounts.set(seriesKey, (seriesCounts.get(seriesKey) ?? 0) + 1);
    let row = cells.get(rowKey);
    if (!row) {
      row = new Map();
      cells.set(rowKey, row);
    }
    bump(row, seriesKey);
  }
  const rankedSeries = [...seriesCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topSeries = rankedSeries.slice(0, 5).map(([key]) => key);
  const hasOther = rankedSeries.length > 5;
  const series = hasOther ? [...topSeries, "Other"] : topSeries;
  const rows: SplitRow[] = primary.map((item) => {
    const bucket = cells.get(item.key) ?? new Map<string, number>();
    const record: SplitRow = { name: item.key, total: item.students };
    let other = 0;
    for (const [key, count] of bucket) {
      if (topSeries.includes(key)) record[key] = count;
      else other += count;
    }
    for (const key of topSeries) if (record[key] == null) record[key] = 0;
    if (hasOther) record.Other = other;
    return record;
  });
  return { rows, series };
}

export function schoolGroups(students: Student[]): SchoolGroup[] {
  const groups = new Map<string, SchoolGroup & { gradeMap: Map<string, number> }>();
  for (const student of students) {
    const key = `${student.emis}|${student.school}|${student.program}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        school: student.school,
        emis: student.emis,
        district: student.district,
        tehsil: student.tehsil,
        province: student.province,
        program: student.program,
        system: student.system,
        donor: student.donor,
        students: 0,
        female: 0,
        male: 0,
        disability: 0,
        disaster: 0,
        missingBform: 0,
        grades: [],
        gradeMap: new Map(),
      };
      groups.set(key, group);
    }
    group.students += 1;
    if (student.gender === "Female") group.female += 1;
    if (student.gender === "Male") group.male += 1;
    if (student.disability === "Yes") group.disability += 1;
    if (student.disaster === "Yes") group.disaster += 1;
    if (!student.bform) group.missingBform += 1;
    bump(group.gradeMap, student.grade);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      grades: [...group.gradeMap.entries()]
        .map(([grade, count]) => ({ grade, count }))
        .sort((a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade)),
    }))
    .sort((a, b) => b.students - a.students || a.school.localeCompare(b.school));
}

export function admissionSeries(students: Student[]): { year: string; female: number; male: number; other: number; total: number }[] {
  const map = new Map<number, { female: number; male: number; other: number }>();
  for (const student of students) {
    if (!student.admitYear) continue;
    const bucket = map.get(student.admitYear) ?? { female: 0, male: 0, other: 0 };
    if (student.gender === "Female") bucket.female += 1;
    else if (student.gender === "Male") bucket.male += 1;
    else bucket.other += 1;
    map.set(student.admitYear, bucket);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, bucket]) => ({
      year: String(year),
      female: bucket.female,
      male: bucket.male,
      other: bucket.other,
      total: bucket.female + bucket.male + bucket.other,
    }));
}

export function gradeGender(students: Student[]): { grade: string; female: number; male: number; other: number }[] {
  const map = new Map<string, { female: number; male: number; other: number }>();
  for (const student of students) {
    const bucket = map.get(student.grade) ?? { female: 0, male: 0, other: 0 };
    if (student.gender === "Female") bucket.female += 1;
    else if (student.gender === "Male") bucket.male += 1;
    else bucket.other += 1;
    map.set(student.grade, bucket);
  }
  return [...map.entries()]
    .map(([grade, counts]) => ({ grade, ...counts }))
    .sort((a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade));
}

export function cohort(students: Student[]): { years: string[]; grades: string[]; cells: number[][]; max: number } {
  const yearSet = new Set<number>();
  const gradeSet = new Set<string>();
  const counts = new Map<string, number>();
  for (const student of students) {
    if (!student.admitYear) continue;
    yearSet.add(student.admitYear);
    gradeSet.add(student.grade);
    const key = `${student.admitYear}|${student.grade}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const years = [...yearSet].sort((a, b) => b - a).map(String);
  const grades = GRADE_ORDER.filter((grade) => gradeSet.has(grade));
  let max = 0;
  const cells = years.map((year) =>
    grades.map((grade) => {
      const value = counts.get(`${year}|${grade}`) ?? 0;
      if (value > max) max = value;
      return value;
    }),
  );
  return { years, grades, cells, max };
}

export function bounds(students: Student[]): { admitMin: number; admitMax: number; ageMin: number; ageMax: number } {
  let admitMin = Infinity;
  let admitMax = -Infinity;
  let ageMin = Infinity;
  let ageMax = -Infinity;
  for (const student of students) {
    if (student.admitYear) {
      admitMin = Math.min(admitMin, student.admitYear);
      admitMax = Math.max(admitMax, student.admitYear);
    }
    if (student.age >= 0) {
      ageMin = Math.min(ageMin, student.age);
      ageMax = Math.max(ageMax, student.age);
    }
  }
  return {
    admitMin: Number.isFinite(admitMin) ? admitMin : 2014,
    admitMax: Number.isFinite(admitMax) ? admitMax : 2026,
    ageMin: Number.isFinite(ageMin) ? ageMin : 3,
    ageMax: Number.isFinite(ageMax) ? ageMax : 20,
  };
}

export function activeChips(filters: Filters, edge: ReturnType<typeof bounds>): { key: string; label: string }[] {
  const chips: { key: string; label: string }[] = [];
  if (filters.q.trim()) chips.push({ key: "q", label: `Search “${filters.q.trim()}”` });
  const labels: Record<ListKey, string> = {
    program: "Program",
    system: "System",
    donor: "Donor",
    project: "Project",
    source: "Source",
    province: "Province",
    district: "District",
    tehsil: "Tehsil",
    school: "School",
    gender: "Gender",
    grade: "Grade",
    stage: "Stage",
    stream: "Stream",
    religion: "Religion",
    admitYear: "Admitted",
    ageBand: "Age",
  };
  for (const key of Object.keys(labels) as ListKey[]) {
    for (const value of filters[key]) chips.push({ key: `${key}:${value}`, label: `${labels[key]}: ${value}` });
  }
  if (filters.disability !== "all") chips.push({ key: "disability", label: `Disability: ${filters.disability}` });
  if (filters.disaster !== "all") chips.push({ key: "disaster", label: `Disaster: ${filters.disaster}` });
  if (filters.afghani !== "all") chips.push({ key: "afghani", label: `Afghan: ${filters.afghani}` });
  if (filters.bform !== "all") chips.push({ key: "bform", label: `B-Form: ${filters.bform}` });
  if (filters.admitMin != null || filters.admitMax != null) {
    const min = filters.admitMin ?? edge.admitMin;
    const max = filters.admitMax ?? edge.admitMax;
    if (min !== edge.admitMin || max !== edge.admitMax) chips.push({ key: "admit", label: `Admitted ${min}–${max}` });
  }
  if (filters.ageMin != null || filters.ageMax != null) {
    const min = filters.ageMin ?? edge.ageMin;
    const max = filters.ageMax ?? edge.ageMax;
    if (min !== edge.ageMin || max !== edge.ageMax) chips.push({ key: "age", label: `Age ${min}–${max}` });
  }
  return chips;
}

export function removeChip(filters: Filters, chipKey: string): Filters {
  if (chipKey === "q") return { ...filters, q: "" };
  if (chipKey === "disability") return { ...filters, disability: "all" };
  if (chipKey === "disaster") return { ...filters, disaster: "all" };
  if (chipKey === "afghani") return { ...filters, afghani: "all" };
  if (chipKey === "bform") return { ...filters, bform: "all" };
  if (chipKey === "admit") return { ...filters, admitMin: null, admitMax: null };
  if (chipKey === "age") return { ...filters, ageMin: null, ageMax: null };
  const splitAt = chipKey.indexOf(":");
  const key = chipKey.slice(0, splitAt) as ListKey;
  const value = chipKey.slice(splitAt + 1);
  return { ...filters, [key]: filters[key].filter((item) => item !== value) };
}

export function isFiltered(filters: Filters, edge: ReturnType<typeof bounds>): boolean {
  return activeChips(filters, edge).length > 0;
}

export function insights(students: Student[], universe: number): Insight[] {
  const summary = summarize(students);
  if (!summary.students) {
    return [
      {
        kicker: "Empty view",
        title: "Nothing matches these filters",
        body: "Clear a chip or widen a range. The atlas still holds the full census underneath.",
      },
    ];
  }
  const found: Insight[] = [];
  const share = universe ? (summary.students / universe) * 100 : 100;
  const shareText = share > 0 && share < 0.1 ? "Under 0.1%" : pct(share);
  found.push({
    kicker: "Coverage",
    title: `${countLabel(summary.students, "student")} in view`,
    body: `${shareText} of the atlas, in ${countLabel(summary.schools, "school")} across ${countLabel(summary.districts, "district")} and ${countLabel(summary.tehsils, "tehsil")}.`,
  });
  if (summary.students < 40) return found;

  const programs = aggregate(students, "program").sort((a, b) => b.students - a.students);
  if (programs.length >= 2) {
    const gendered = programs.filter((row) => row.students >= 40);
    const girlLed = gendered.filter((row) => row.femalePct >= 55);
    const boyLed = gendered.filter((row) => row.femalePct <= 45);
    if (girlLed.length || boyLed.length) {
      const bits = [
        girlLed.length ? `girls are the majority in ${girlLed.map((row) => `${row.key} (${row.femalePct.toFixed(0)}%)`).join(", ")}` : "",
        boyLed.length ? `boys are the majority in ${boyLed.map((row) => `${row.key} (${row.malePct.toFixed(0)}%)`).join(", ")}` : "",
      ].filter(Boolean);
      const sentence = bits.join("; ");
      found.push({
        kicker: "Gender",
        title: summary.femalePct >= 50 ? "Girls are ahead in this view" : "Boys are ahead in this view",
        body: `Overall the view is ${summary.femalePct.toFixed(1)}% female. ${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`,
      });
    }
  } else if (Math.abs(summary.femalePct - 50) >= 4) {
    found.push({
      kicker: "Gender",
      title: summary.femalePct >= 50 ? "Girls outnumber boys" : "Boys outnumber girls",
      body: `${summary.female.toLocaleString("en-US")} female and ${summary.male.toLocaleString("en-US")} male students. Unknown gender: ${summary.unknownGender}.`,
    });
  }

  const districts = aggregate(students, "district").sort((a, b) => b.students - a.students);
  if (districts[0] && districts[0].share >= 28 && districts.length > 1) {
    found.push({
      kicker: "Concentration",
      title: `${districts[0].key} holds ${districts[0].share.toFixed(0)}% of this view`,
      body: `${districts[0].students.toLocaleString("en-US")} students. Next: ${districts
        .slice(1, 3)
        .map((row) => `${row.key} (${row.share.toFixed(0)}%)`)
        .join(", ")}.`,
    });
  }

  const documented = aggregate(students, "program").filter((row) => row.students >= 30);
  const worstBform = documented.slice().sort((a, b) => b.missingBformPct - a.missingBformPct)[0];
  if (worstBform && worstBform.missingBformPct >= 8) {
    found.push({
      kicker: "Records",
      title: `B-Form is missing for ${summary.missingBform.toLocaleString("en-US")} students`,
      body: `That is ${((summary.missingBform / summary.students) * 100).toFixed(1)}% of this view. The widest gap is ${worstBform.key} at ${worstBform.missingBformPct.toFixed(1)}%.`,
    });
  }

  const stages = [
    ["Early years", summary.early],
    ["Primary", summary.primary],
    ["Middle", summary.middle],
    ["Secondary", summary.secondary],
  ] as const;
  const topStage = stages.slice().sort((a, b) => b[1] - a[1])[0];
  if (topStage && topStage[1] / summary.students >= 0.45) {
    found.push({
      kicker: "Grades",
      title: `${topStage[0]} is ${((topStage[1] / summary.students) * 100).toFixed(0)}% of enrollment`,
      body: `Early years ${summary.early.toLocaleString("en-US")}, primary ${summary.primary.toLocaleString("en-US")}, middle ${summary.middle.toLocaleString("en-US")}, secondary ${summary.secondary.toLocaleString("en-US")}.`,
    });
  }

  if (summary.disaster > 0 || summary.disability > 0) {
    found.push({
      kicker: "Inclusion",
      title: `${summary.disability.toLocaleString("en-US")} with a disability, ${summary.disaster.toLocaleString("en-US")} disaster-affected`,
      body:
        summary.afghani > 0
          ? `${summary.afghani.toLocaleString("en-US")} students are recorded as Afghan.`
          : "No students in this view are recorded as Afghan.",
    });
  }

  return found.slice(0, 4);
}

export function duplicateStats(students: Student[]): { groups: number; extra: number; samples: { name: string; father: string; school: string; count: number }[] } {
  const map = new Map<string, { name: string; father: string; school: string; count: number }>();
  for (const student of students) {
    const key = `${student.emis}|${student.name.toLowerCase()}|${student.father.toLowerCase()}|${student.bform}`;
    const existing = map.get(key);
    if (existing) existing.count += 1;
    else map.set(key, { name: student.name, father: student.father, school: student.school, count: 1 });
  }
  const samples = [...map.values()].filter((item) => item.count > 1).sort((a, b) => b.count - a.count);
  return {
    groups: samples.length,
    extra: samples.reduce((sum, item) => sum + item.count - 1, 0),
    samples: samples.slice(0, 8),
  };
}

export function qualityScore(summary: Summary, duplicateExtra: number): { score: number; parts: { label: string; value: string; penalty: number; weight: number }[] } {
  const n = Math.max(summary.students, 1);
  const hit = (count: number, weight: number) => ({ penalty: (count / n) * weight, weight });
  const bform = hit(summary.missingBform, 30);
  const dob = hit(summary.missingDob, 25);
  const admission = hit(summary.missingAdmission, 15);
  const gender = hit(summary.unknownGender, 15);
  const father = hit(summary.missingFather, 10);
  const dupes = hit(duplicateExtra, 5);
  const parts = [
    { label: "B-Form on file", value: `${(summary.students - summary.missingBform).toLocaleString("en-US")} of ${summary.students.toLocaleString("en-US")}`, ...bform },
    { label: "Date of birth", value: `${(summary.students - summary.missingDob).toLocaleString("en-US")} recorded`, ...dob },
    { label: "Admission date", value: `${(summary.students - summary.missingAdmission).toLocaleString("en-US")} recorded`, ...admission },
    { label: "Gender", value: `${summary.unknownGender.toLocaleString("en-US")} unknown`, ...gender },
    { label: "Father name", value: `${summary.missingFather.toLocaleString("en-US")} blank`, ...father },
    { label: "Possible duplicate rows", value: `${duplicateExtra.toLocaleString("en-US")} extra`, ...dupes },
  ];
  const score = Math.max(0, Math.round(100 - parts.reduce((sum, part) => sum + part.penalty, 0)));
  return { score, parts };
}

export function colorFor(dim: Dim, key: string, index: number): string {
  if (dim === "program") {
    return (
      {
        PEIMA: "#0e6b57",
        "PSRP-I": "#c24d2c",
        "PSRP-II": "#2a527a",
        PSP: "#c9922a",
        "Evening School Program": "#6b4c9a",
        "PEN Adoption": "#3d7a4a",
      }[key] ?? "#8a5a44"
    );
  }
  if (dim === "gender") {
    if (key === "Female") return "#c24d2c";
    if (key === "Male") return "#2a527a";
    return "#a3988c";
  }
  const palette = ["#0e6b57", "#c24d2c", "#2a527a", "#c9922a", "#6b4c9a", "#3d7a4a", "#b86b4a", "#4d6d7a", "#8a5a44", "#1f7a8c"];
  return palette[index % palette.length];
}

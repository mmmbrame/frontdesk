export type Tri = "Yes" | "No" | "Unknown";
export type TriFilter = "all" | Tri;
export type BFormFilter = "all" | "Present" | "Missing";

export type Student = {
  name: string;
  father: string;
  bform: string;
  emis: string;
  project: string;
  donor: string;
  province: string;
  school: string;
  district: string;
  tehsil: string;
  system: string;
  program: string;
  gender: string;
  grade: string;
  stage: string;
  stream: string;
  section: string;
  classRaw: string;
  admitYear: number;
  age: number;
  ageBand: string;
  disability: Tri;
  afghani: Tri;
  disaster: Tri;
  religion: string;
  source: string;
  admitted: string;
  dob: string;
  censusYear: number;
  search: string;
};

export type SheetMeta = {
  sheet: string;
  source: string;
  rows: number;
  blankRows: number;
  included: boolean;
  note: string;
};

export type ChangeCount = { change: string; count: number };

export type Meta = {
  title: string;
  academicYear: number;
  referenceDate: string;
  generatedFrom: string;
  students: number;
  sheets: SheetMeta[];
  notes: string[];
  placeAliases: ChangeCount[];
  religionFixes: ChangeCount[];
  unknownClasses: ChangeCount[];
  duplicateGroups: number;
  duplicateExtraRows: number;
  missingDob: number;
  missingAdmission: number;
  missingBform: number;
  implausibleAge: number;
  unknownGender: number;
  unknownGrade: number;
};

export type Dataset = {
  meta: Meta;
  students: Student[];
};

export type Filters = {
  q: string;
  program: string[];
  system: string[];
  donor: string[];
  project: string[];
  source: string[];
  province: string[];
  district: string[];
  tehsil: string[];
  school: string[];
  gender: string[];
  grade: string[];
  stage: string[];
  stream: string[];
  religion: string[];
  admitYear: string[];
  ageBand: string[];
  disability: TriFilter;
  afghani: TriFilter;
  disaster: TriFilter;
  bform: BFormFilter;
  ageMin: number | null;
  ageMax: number | null;
  admitMin: number | null;
  admitMax: number | null;
};

export const EMPTY_FILTERS: Filters = {
  q: "",
  program: [],
  system: [],
  donor: [],
  project: [],
  source: [],
  province: [],
  district: [],
  tehsil: [],
  school: [],
  gender: [],
  grade: [],
  stage: [],
  stream: [],
  religion: [],
  admitYear: [],
  ageBand: [],
  disability: "all",
  afghani: "all",
  disaster: "all",
  bform: "all",
  ageMin: null,
  ageMax: null,
  admitMin: null,
  admitMax: null,
};

export const LIST_KEYS = [
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
] as const;

export type ListKey = (typeof LIST_KEYS)[number];

export type Dim =
  | ListKey
  | "disability"
  | "disaster"
  | "afghani"
  | "bform";

export type Metric =
  | "students"
  | "share"
  | "schools"
  | "femalePct"
  | "malePct"
  | "disabilityPct"
  | "disasterPct"
  | "afghaniPct"
  | "missingBformPct"
  | "medianAge"
  | "earlyPct"
  | "primaryPct"
  | "middlePct"
  | "secondaryPct";

export type TabId =
  | "overview"
  | "explore"
  | "geography"
  | "schools"
  | "students"
  | "compare"
  | "quality";

export const GRADE_ORDER = [
  "Nursery",
  "Prep",
  "KG",
  "Kachi",
  "ECE",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "Unknown",
];

export const STAGE_ORDER = ["Early Years", "Primary", "Middle", "Secondary", "Unknown"];

export const AGE_BAND_ORDER = ["Under 5", "5–7", "8–10", "11–13", "14–16", "17+", "Unknown"];

export const PROGRAM_ORDER = [
  "PEIMA",
  "PSRP-I",
  "PSRP-II",
  "PSP",
  "Evening School Program",
  "PEN Adoption",
];

export const PROGRAM_COLORS: Record<string, string> = {
  PEIMA: "#0e6b57",
  "PSRP-I": "#c24d2c",
  "PSRP-II": "#2a527a",
  PSP: "#c9922a",
  "Evening School Program": "#6b4c9a",
  "PEN Adoption": "#3d7a4a",
};

export const CHART_COLORS = [
  "#0e6b57",
  "#c24d2c",
  "#2a527a",
  "#c9922a",
  "#6b4c9a",
  "#3d7a4a",
  "#b86b4a",
  "#4d6d7a",
  "#8a5a44",
  "#1f7a8c",
];

export const DIMENSIONS: { id: Dim; label: string }[] = [
  { id: "program", label: "Program" },
  { id: "system", label: "System" },
  { id: "donor", label: "Donor" },
  { id: "project", label: "Project" },
  { id: "source", label: "Workbook source" },
  { id: "province", label: "Province" },
  { id: "district", label: "District" },
  { id: "tehsil", label: "Tehsil" },
  { id: "school", label: "School" },
  { id: "gender", label: "Gender" },
  { id: "grade", label: "Grade" },
  { id: "stage", label: "Stage" },
  { id: "stream", label: "Stream" },
  { id: "religion", label: "Religion" },
  { id: "admitYear", label: "Admission year" },
  { id: "ageBand", label: "Age band" },
  { id: "disability", label: "Disability" },
  { id: "disaster", label: "Disaster affected" },
  { id: "afghani", label: "Afghan" },
  { id: "bform", label: "B-Form" },
];

export const METRICS: { id: Metric; label: string; digits: number }[] = [
  { id: "students", label: "Students", digits: 0 },
  { id: "share", label: "Share of current view", digits: 1 },
  { id: "schools", label: "Schools", digits: 0 },
  { id: "femalePct", label: "Female %", digits: 1 },
  { id: "malePct", label: "Male %", digits: 1 },
  { id: "disabilityPct", label: "Disability %", digits: 1 },
  { id: "disasterPct", label: "Disaster affected %", digits: 1 },
  { id: "afghaniPct", label: "Afghan %", digits: 1 },
  { id: "missingBformPct", label: "Missing B-Form %", digits: 1 },
  { id: "medianAge", label: "Median age", digits: 1 },
  { id: "earlyPct", label: "Early years %", digits: 1 },
  { id: "primaryPct", label: "Primary %", digits: 1 },
  { id: "middlePct", label: "Middle %", digits: 1 },
  { id: "secondaryPct", label: "Secondary %", digits: 1 },
];

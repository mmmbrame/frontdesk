export type Staff = {
  name: string;
  father: string;
  gender: string;
  religion: string;
  role: string;
  family: string;
  qualification: string;
  qualificationRaw: string;
  cnic: string;
  kinCnic: string;
  contact: string;
  emis: string;
  school: string;
  district: string;
  tehsil: string;
  province: string;
  program: string;
  system: string;
  donor: string;
  year: string;
  source: string;
};

export type ListKey =
  | "program"
  | "system"
  | "donor"
  | "province"
  | "district"
  | "tehsil"
  | "school"
  | "gender"
  | "religion"
  | "role"
  | "family"
  | "qualification"
  | "source";

export type Presence = "all" | "Present" | "Missing";

export type Filters = {
  q: string;
  cnic: Presence;
  contact: Presence;
  kin: Presence;
} & Record<ListKey, string[]>;

export const LIST_KEYS: ListKey[] = [
  "program",
  "system",
  "donor",
  "province",
  "district",
  "tehsil",
  "school",
  "gender",
  "religion",
  "role",
  "family",
  "qualification",
  "source",
];

export const EMPTY_FILTERS: Filters = {
  q: "",
  program: [],
  system: [],
  donor: [],
  province: [],
  district: [],
  tehsil: [],
  school: [],
  gender: [],
  religion: [],
  role: [],
  family: [],
  qualification: [],
  source: [],
  cnic: "all",
  contact: "all",
  kin: "all",
};

export type TabId = "overview" | "explore" | "geography" | "schools" | "people" | "compare" | "quality";

export type Dim = ListKey | "cnic" | "contact" | "kin";

export const DIMENSIONS: { id: ListKey; label: string }[] = [
  { id: "program", label: "Program" },
  { id: "system", label: "System" },
  { id: "donor", label: "Donor" },
  { id: "province", label: "Province" },
  { id: "district", label: "District" },
  { id: "tehsil", label: "Tehsil" },
  { id: "school", label: "School" },
  { id: "gender", label: "Gender" },
  { id: "family", label: "Role family" },
  { id: "role", label: "Role" },
  { id: "qualification", label: "Qualification" },
  { id: "religion", label: "Religion" },
  { id: "source", label: "Workbook" },
];

export const PROGRAM_ORDER = ["PEIMA", "PSRP-I", "PSRP-II", "PSP", "Evening School Program", "PEN Adoption"];
export const FAMILY_ORDER = ["Teaching", "Leadership", "Administration", "Support", "Other", "Unknown"];
export const QUAL_ORDER = ["Doctorate", "Masters", "Bachelors", "Intermediate", "Matric", "Middle", "Primary", "None", "Other", "Not recorded"];

export type Metric =
  | "people"
  | "share"
  | "schools"
  | "femalePct"
  | "teachingPct"
  | "leadershipPct"
  | "supportPct"
  | "mastersPct"
  | "bachelorsPct"
  | "missingCnicPct"
  | "missingContactPct";

export const METRICS: { id: Metric; label: string }[] = [
  { id: "people", label: "Staff" },
  { id: "share", label: "Share of view" },
  { id: "schools", label: "Schools" },
  { id: "femalePct", label: "Female %" },
  { id: "teachingPct", label: "Teaching %" },
  { id: "leadershipPct", label: "Leadership %" },
  { id: "supportPct", label: "Support %" },
  { id: "mastersPct", label: "Masters %" },
  { id: "bachelorsPct", label: "Bachelors %" },
  { id: "missingCnicPct", label: "Missing CNIC %" },
  { id: "missingContactPct", label: "Missing contact %" },
];

export type SheetMeta = {
  sheet: string;
  rows: number;
  blankRows: number;
  included: number;
  note: string;
};

export type StaffMeta = {
  staff: number;
  generatedOn: string;
  generatedFrom: string;
  sheets: SheetMeta[];
  duplicateCnicExtra: number;
  placeAliases: { change: string; count: number }[];
  notes: string[];
};

export type StaffDataset = {
  meta: StaffMeta;
  staff: Staff[];
};

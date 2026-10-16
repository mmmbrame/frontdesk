import type { Staff } from "../src/staff/types";
import type { Student, Tri } from "../src/types";

const REFERENCE = { year: 2026, month: 10, day: 14 };

const ROLE_RULES: [string, string, string][] = [
  ["vice principal", "Vice Principal", "Leadership"],
  ["head teacher", "Head Teacher", "Leadership"],
  ["second head", "Second Head", "Leadership"],
  ["sec head", "Second Head", "Leadership"],
  ["principal", "Principal", "Leadership"],
  ["assistant teacher", "Assistant Teacher", "Teaching"],
  ["library teacher", "Library Teacher", "Teaching"],
  ["sports teacher", "Sports Teacher", "Teaching"],
  ["teacher", "Teacher", "Teaching"],
  ["admin coordinator", "Admin Coordinator", "Administration"],
  ["admin officer", "Admin Officer", "Administration"],
  ["admin assistant", "Admin Assistant", "Administration"],
  ["cluster manager", "Cluster Manager", "Administration"],
  ["m&e", "M&E Officer", "Administration"],
  ["admission officer", "Admission Officer", "Administration"],
  ["coordinat", "Coordinator", "Administration"],
  ["sweeper", "Sweeper", "Support"],
  ["guard", "Guard", "Support"],
  ["gardener", "Gardener", "Support"],
  ["gardner", "Gardener", "Support"],
  ["office boy", "Office Boy", "Support"],
  ["driver", "Driver", "Support"],
  ["peon", "Peon", "Support"],
  ["aya", "Aya", "Support"],
];

export const ROLE_OPTIONS = [
  "Teacher",
  "Assistant Teacher",
  "Library Teacher",
  "Sports Teacher",
  "Principal",
  "Vice Principal",
  "Head Teacher",
  "Second Head",
  "Admin Officer",
  "Admin Assistant",
  "Admin Coordinator",
  "Cluster Manager",
  "M&E Officer",
  "Admission Officer",
  "Coordinator",
  "Aya",
  "Guard",
  "Sweeper",
  "Gardener",
  "Office Boy",
  "Driver",
  "Peon",
];

export const FAMILY_OPTIONS = ["Teaching", "Leadership", "Administration", "Support", "Other", "Unknown"];
export const QUAL_OPTIONS = ["Doctorate", "Masters", "Bachelors", "Intermediate", "Matric", "Middle", "Primary", "None", "Other", "Not recorded"];
export const GENDER_OPTIONS = ["Female", "Male", "Unknown"];
export const TRI_OPTIONS = ["Unknown", "Yes", "No"] as const;

export function systemFor(program: string): string {
  if (program === "PEIMA") return "PEIMA";
  if (program === "PSRP-I" || program === "PSRP-II") return "PEF";
  if (program === "PSP") return "PSP";
  if (program === "Evening School Program" || program === "PEN Adoption") return "PEN";
  return "";
}

export function roleParts(role: string): { role: string; family: string } {
  const key = role.toLowerCase();
  for (const [needle, title, family] of ROLE_RULES) {
    if (key.includes(needle)) return { role: title, family };
  }
  const cleaned = clean(role);
  if (!cleaned) return { role: "Unknown", family: "Unknown" };
  return { role: cleaned, family: "Other" };
}

export function stageFor(grade: string): string {
  if (["Nursery", "Prep", "KG", "Kachi", "ECE"].includes(grade)) return "Early Years";
  if (/^\d+$/.test(grade)) {
    const number = Number(grade);
    if (number >= 1 && number <= 5) return "Primary";
    if (number >= 6 && number <= 8) return "Middle";
    if (number >= 9 && number <= 12) return "Secondary";
  }
  return "Unknown";
}

export function ageOn(iso: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return -1;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > REFERENCE.year) return -1;
  let age = REFERENCE.year - year;
  if (month > REFERENCE.month || (month === REFERENCE.month && day > REFERENCE.day)) age -= 1;
  return age >= 0 && age <= 120 ? age : -1;
}

export function ageBandFor(age: number): string {
  if (age < 0) return "Unknown";
  if (age < 5) return "Under 5";
  if (age <= 7) return "5–7";
  if (age <= 10) return "8–10";
  if (age <= 13) return "11–13";
  if (age <= 16) return "14–16";
  return "17+";
}

export function qualificationLevel(raw: string): string {
  const pieces = raw.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const tokens: string[] = [];
  let letters = "";
  for (const piece of pieces) {
    if (piece.length === 1) letters += piece;
    else {
      if (letters) tokens.push(letters);
      letters = "";
      tokens.push(piece);
    }
  }
  if (letters) tokens.push(letters);
  const blob = new Set(tokens);
  if (!tokens.length || [...blob].every((token) => ["n", "a", "na", "none", "nil", "nill"].includes(token))) return "Not recorded";
  if (tokens.some((token) => token.startsWith("illiterat"))) return "None";
  if (blob.has("phd") || blob.has("doctorate")) return "Doctorate";
  if (tokens.some((token) => ["masters", "master", "msc", "mcs", "mphil", "mba", "ma", "ms", "med"].includes(token) || token.startsWith("master"))) return "Masters";
  if (tokens.some((token) => ["bachelors", "bachelor", "ba", "bsc", "bcom", "bs", "bed", "ad", "ads"].includes(token) || token.startsWith("bachelor"))) return "Bachelors";
  if (tokens.some((token) => token.includes("inter") || ["fa", "fsc", "ics"].includes(token))) return "Intermediate";
  if (tokens.some((token) => token.includes("matric"))) return "Matric";
  if (blob.has("middle") || blob.has("midle")) return "Middle";
  if (blob.has("primary") || blob.has("primery")) return "Primary";
  return "Other";
}

function clean(value: unknown, max = 160): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function known(value: unknown, fallback = "Unknown"): string {
  const text = clean(value);
  return text || fallback;
}

function tri(value: unknown): Tri {
  const text = clean(value);
  if (text === "Yes" || text === "No" || text === "Unknown") return text;
  return "Unknown";
}

function digits(value: unknown): string {
  return clean(value, 40).replace(/\D/g, "");
}

function formatCnic(value: unknown): string {
  const number = digits(value);
  if (number.length < 5) return "";
  if (number.length === 13) return `${number.slice(0, 5)}-${number.slice(5, 12)}-${number.slice(12)}`;
  return number;
}

function formatContact(value: unknown): string {
  let number = digits(value);
  if (number.length === 10 && number.startsWith("3")) number = `0${number}`;
  return number.length >= 7 ? number : "";
}

function yearOf(value: string): number {
  const match = /^(\d{4})/.exec(value.trim());
  if (!match) return 0;
  const year = Number(match[1]);
  return year >= 1990 && year <= 2035 ? year : 0;
}

export function normalizeStudent(input: Record<string, unknown>): Student {
  const name = clean(input.name, 120);
  if (!name) throw new Error("Enter a name.");
  const grade = known(input.grade);
  const admitted = clean(input.admitted, 20);
  const dob = clean(input.dob, 20);
  const age = ageOn(dob);
  const gender = GENDER_OPTIONS.includes(clean(input.gender)) ? clean(input.gender) : "Unknown";
  const student: Student = {
    name,
    father: clean(input.father, 120),
    bform: formatCnic(input.bform),
    emis: clean(input.emis, 40),
    project: known(input.project),
    donor: known(input.donor),
    province: known(input.province),
    school: known(input.school),
    district: known(input.district),
    tehsil: known(input.tehsil),
    system: clean(input.system) && clean(input.system) !== "Unknown" ? clean(input.system) : systemFor(known(input.program)) || "Unknown",
    program: known(input.program),
    gender,
    grade,
    stage: stageFor(grade),
    stream: clean(input.stream, 40),
    section: clean(input.section, 20).toUpperCase(),
    classRaw: clean(input.classRaw, 40) || (grade === "Unknown" ? "" : grade),
    admitYear: yearOf(admitted),
    age,
    ageBand: ageBandFor(age),
    disability: tri(input.disability),
    afghani: tri(input.afghani),
    disaster: tri(input.disaster),
    religion: known(input.religion),
    source: known(input.source, "Added in atlas"),
    admitted,
    dob,
    censusYear: yearOf(String(input.censusYear ?? "")) || 2026,
    search: "",
  };
  student.search = [
    student.name,
    student.father,
    student.bform,
    student.emis,
    student.school,
    student.district,
    student.tehsil,
    student.program,
    student.gender,
    student.grade,
    student.religion,
    student.system,
    student.donor,
  ]
    .join(" ")
    .toLowerCase();
  return student;
}

export function normalizeStaff(input: Record<string, unknown>): Staff {
  const name = clean(input.name, 120);
  if (!name) throw new Error("Enter a name.");
  const written = roleParts(clean(input.role, 80));
  const requestedFamily = clean(input.family);
  const family = FAMILY_OPTIONS.includes(requestedFamily) ? requestedFamily : written.family;
  const rawQualification = clean(input.qualificationRaw, 160);
  const requestedLevel = clean(input.qualification);
  const qualification = QUAL_OPTIONS.includes(requestedLevel) && requestedLevel !== "Not recorded"
    ? requestedLevel
    : rawQualification
      ? qualificationLevel(rawQualification)
      : QUAL_OPTIONS.includes(requestedLevel)
        ? requestedLevel
        : "Not recorded";
  const gender = GENDER_OPTIONS.includes(clean(input.gender)) ? clean(input.gender) : "Unknown";
  return {
    name,
    father: clean(input.father, 120),
    gender,
    religion: known(input.religion),
    role: written.role,
    family,
    qualification,
    qualificationRaw: rawQualification || (qualification === "Not recorded" ? "" : qualification),
    cnic: formatCnic(input.cnic),
    kinCnic: formatCnic(input.kinCnic),
    contact: formatContact(input.contact),
    emis: clean(input.emis, 40),
    school: known(input.school),
    district: known(input.district),
    tehsil: known(input.tehsil),
    province: known(input.province),
    program: known(input.program),
    system: clean(input.system) && clean(input.system) !== "Unknown" ? clean(input.system) : systemFor(known(input.program)) || "Unknown",
    donor: known(input.donor),
    year: String(yearOf(String(input.year ?? "")) || 2026),
    source: known(input.source, "Added in atlas"),
  };
}

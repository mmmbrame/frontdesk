import { ageBand } from "./format";
import type { Dataset, Meta, Student, Tri } from "./types";

type Raw = {
  meta: Meta;
  dicts: Record<string, string[]>;
  rows: unknown[][];
};

function tri(value: string): Tri {
  if (value === "Yes" || value === "No") return value;
  return "Unknown";
}

export class UnauthorizedError extends Error {}

export async function loadDataset(): Promise<Dataset> {
  const response = await fetch("/api/data", { credentials: "same-origin" });
  if (response.status === 401) throw new UnauthorizedError("Sign in to view the atlas.");
  if (!response.ok) throw new Error("The student file could not be loaded.");
  const raw = (await response.json()) as Raw;
  const dict = (field: string, index: number) => raw.dicts[field]?.[index] ?? "Unknown";
  const students: Student[] = raw.rows.map((row) => {
    const age = Number(row[19]);
    const student: Student = {
      name: String(row[0] ?? ""),
      father: String(row[1] ?? ""),
      bform: String(row[2] ?? ""),
      emis: String(row[3] ?? ""),
      project: dict("project", Number(row[4])),
      donor: dict("donor", Number(row[5])),
      province: dict("province", Number(row[6])),
      school: dict("school", Number(row[7])),
      district: dict("district", Number(row[8])),
      tehsil: dict("tehsil", Number(row[9])),
      system: dict("system", Number(row[10])),
      program: dict("program", Number(row[11])),
      gender: dict("gender", Number(row[12])),
      grade: dict("grade", Number(row[13])),
      stage: dict("stage", Number(row[14])),
      stream: dict("stream", Number(row[15])),
      section: String(row[16] ?? ""),
      classRaw: String(row[17] ?? ""),
      admitYear: Number(row[18]) || 0,
      age,
      ageBand: ageBand(age),
      disability: tri(dict("disability", Number(row[20]))),
      afghani: tri(dict("afghani", Number(row[21]))),
      disaster: tri(dict("disaster", Number(row[22]))),
      religion: dict("religion", Number(row[23])),
      source: dict("source", Number(row[24])),
      admitted: String(row[25] ?? ""),
      dob: String(row[26] ?? ""),
      censusYear: Number(row[27]) || 2026,
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
  });
  return { meta: raw.meta, students };
}

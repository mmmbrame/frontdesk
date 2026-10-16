import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";
import { normalizeStaff, normalizeStudent } from "../shared/records.js";
import type { Staff } from "../src/staff/types.js";
import type { Student } from "../src/types.js";

const PATHNAME = "pen-additions.json";
const FILE = path.join(process.cwd(), "private", "additions.json");
const LIMIT = 5000;

export type Additions = {
  students: Student[];
  staff: Staff[];
};

function empty(): Additions {
  return { students: [], staff: [] };
}

function parse(text: string): Additions {
  try {
    const data = JSON.parse(text) as Partial<Additions>;
    return {
      students: Array.isArray(data.students) ? data.students.filter((item) => item && typeof item.name === "string") : [],
      staff: Array.isArray(data.staff) ? data.staff.filter((item) => item && typeof item.name === "string") : [],
    };
  } catch {
    return empty();
  }
}

async function readStore(): Promise<Additions> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      return parse(await readFile(FILE, "utf8"));
    } catch {
      return empty();
    }
  }
  const result = await get(PATHNAME, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) return empty();
  return parse(await new Response(result.stream).text());
}

async function writeStore(data: Additions): Promise<void> {
  const body = JSON.stringify(data);
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    await mkdir(path.dirname(FILE), { recursive: true });
    await writeFile(FILE, body);
    return;
  }
  await put(PATHNAME, body, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

async function update(change: (current: Additions) => Additions): Promise<Additions> {
  const next = change(await readStore());
  await writeStore(next);
  return next;
}

export async function loadAdditions(): Promise<Additions> {
  return readStore();
}

export async function addStudent(input: Record<string, unknown>): Promise<Student> {
  const student = normalizeStudent(input);
  await update((current) => {
    if (current.students.length >= LIMIT) throw new Error("The student list cannot take more added records.");
    return { ...current, students: [student, ...current.students] };
  });
  return student;
}

export async function addStaff(input: Record<string, unknown>): Promise<Staff> {
  const person = normalizeStaff(input);
  await update((current) => {
    if (current.staff.length >= LIMIT) throw new Error("The staff list cannot take more added records.");
    return { ...current, staff: [person, ...current.staff] };
  });
  return person;
}

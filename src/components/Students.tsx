import { useMemo, useState } from "react";
import { countLabel, downloadCsv, escapeRegExp } from "../format";
import type { Student } from "../types";
import { Panel } from "./Visuals";

type SortKey = "name" | "father" | "gender" | "grade" | "school" | "district" | "program" | "age" | "admitted";

const ROW_H = 52;

export function Students({ rows, query }: { rows: Student[]; query: string }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(560);

  const sorted = useMemo(() => {
    const copy = rows.slice();
    const factor = sort.dir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      const av = read(a, sort.key);
      const bv = read(b, sort.key);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
      return String(av).localeCompare(String(bv)) * factor;
    });
    return copy;
  }, [rows, sort]);

  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - 6);
  const end = Math.min(sorted.length, start + Math.ceil(height / ROW_H) + 12);
  const visible = sorted.slice(start, end);
  const tokens = query.toLowerCase().split(/\s+/).filter((token) => token.length > 1);

  function toggle(key: SortKey) {
    setSort((current) =>
      current.key === key ? { key, dir: current.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
    setScrollTop(0);
  }

  function exportCsv() {
    const header = [
      "Student",
      "Father",
      "Gender",
      "Grade",
      "Class as recorded",
      "Section",
      "Stream",
      "School",
      "EMIS",
      "District",
      "Tehsil",
      "Province",
      "Program",
      "System",
      "Donor",
      "Project",
      "B-Form",
      "Admission",
      "Date of birth",
      "Age",
      "Religion",
      "Disability",
      "Disaster affected",
      "Afghan",
      "Source",
    ];
    const body = sorted.map((student) => [
      student.name,
      student.father,
      student.gender,
      student.grade,
      student.classRaw,
      student.section,
      student.stream,
      student.school,
      student.emis,
      student.district,
      student.tehsil,
      student.province,
      student.program,
      student.system,
      student.donor,
      student.project,
      student.bform,
      student.admitted,
      student.dob,
      student.age < 0 ? "" : String(student.age),
      student.religion,
      student.disability,
      student.disaster,
      student.afghani,
      student.source,
    ]);
    downloadCsv("pen-students.csv", [header, ...body]);
  }

  return (
    <Panel
      kicker="Register"
      title={countLabel(sorted.length, "student")}
      hint="Scroll the register. Search from the top bar matches name, father, B-Form, EMIS, school, and place together."
      action={
        <button type="button" className="solid" onClick={exportCsv}>
          Export this view
        </button>
      }
    >
      <div
        className="table-scroll tall"
        onScroll={(event) => {
          setScrollTop(event.currentTarget.scrollTop);
          setHeight(event.currentTarget.clientHeight);
        }}
      >
        <div className="reg head">
          <Head label="Student" k="name" sort={sort} onSort={toggle} />
          <Head label="Father" k="father" sort={sort} onSort={toggle} />
          <Head label="Gender" k="gender" sort={sort} onSort={toggle} />
          <Head label="Grade" k="grade" sort={sort} onSort={toggle} />
          <Head label="School" k="school" sort={sort} onSort={toggle} />
          <Head label="District" k="district" sort={sort} onSort={toggle} />
          <Head label="Program" k="program" sort={sort} onSort={toggle} />
          <span>B-Form</span>
          <Head label="Age" k="age" sort={sort} onSort={toggle} />
          <Head label="Admitted" k="admitted" sort={sort} onSort={toggle} />
        </div>
        <div style={{ height: sorted.length * ROW_H, position: "relative" }}>
          <div style={{ position: "absolute", top: start * ROW_H, left: 0, right: 0 }}>
            {visible.map((student) => (
              <div className="reg" key={`${student.emis}-${student.bform}-${student.name}-${student.admitted}`} style={{ height: ROW_H }}>
                <span>
                  <strong>{highlight(student.name, tokens)}</strong>
                  <small>{student.tehsil}</small>
                </span>
                <span>{highlight(student.father, tokens)}</span>
                <span>{student.gender}</span>
                <span>
                  {student.grade}
                  {student.section ? ` ${student.section}` : ""}
                </span>
                <span>{highlight(student.school, tokens)}</span>
                <span>{student.district}</span>
                <span>{student.program}</span>
                <span className="mono">{highlight(student.bform || "—", tokens)}</span>
                <span>{student.age < 0 ? "—" : student.age}</span>
                <span className="mono">{student.admitYear || "—"}</span>
              </div>
            ))}
          </div>
        </div>
        {!sorted.length ? <p className="empty">No students match. Clear a filter or try fewer words.</p> : null}
      </div>
    </Panel>
  );
}

function Head({
  label,
  k,
  sort,
  onSort,
}: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (key: SortKey) => void;
}) {
  return (
    <button type="button" className={sort.key === k ? "on" : ""} onClick={() => onSort(k)}>
      {label}
      {sort.key === k ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
    </button>
  );
}

function read(student: Student, key: SortKey): string | number {
  if (key === "age") return student.age;
  if (key === "admitted") return student.admitYear;
  return student[key];
}

function highlight(text: string, tokens: string[]) {
  if (!text || !tokens.length) return text;
  const pattern = new RegExp(tokens.map(escapeRegExp).join("|"), "ig");
  const parts: (string | { match: string; at: number })[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    parts.push({ match: match[0], at: index });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.map((part, index) =>
    typeof part === "string" ? <span key={index}>{part}</span> : <mark key={part.at}>{part.match}</mark>,
  );
}

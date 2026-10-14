import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { countLabel, downloadCsv, escapeRegExp } from "../format";
import type { Student } from "../types";
import { DataTable } from "./ui/data-table";
import { Panel } from "./Visuals";

export function Students({ rows, query }: { rows: Student[]; query: string }) {
  const tokens = useMemo(
    () => query.toLowerCase().split(/\s+/).filter((token) => token.length > 1),
    [query],
  );

  const columns = useMemo<ColumnDef<Student, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Student",
        cell: ({ row }) => (
          <div>
            <strong>{highlight(row.original.name, tokens)}</strong>
            <div className="text-xs text-muted-foreground">{row.original.tehsil}</div>
          </div>
        ),
      },
      { id: "father", accessorKey: "father", header: "Father", cell: ({ row }) => highlight(row.original.father, tokens) },
      { id: "gender", accessorKey: "gender", header: "Gender" },
      {
        id: "grade",
        accessorFn: (student) => `${student.grade} ${student.section}`.trim(),
        header: "Grade",
      },
      { id: "school", accessorKey: "school", header: "School", cell: ({ row }) => highlight(row.original.school, tokens) },
      { id: "district", accessorKey: "district", header: "District" },
      { id: "program", accessorKey: "program", header: "Program" },
      {
        id: "bform",
        accessorKey: "bform",
        header: "B-Form",
        cell: ({ row }) => <span className="font-mono text-xs">{highlight(row.original.bform || "—", tokens)}</span>,
      },
      {
        id: "age",
        accessorFn: (student) => student.age,
        header: "Age",
        cell: ({ row }) => (row.original.age < 0 ? "—" : row.original.age),
      },
      {
        id: "admitted",
        accessorKey: "admitYear",
        header: "Admitted",
        cell: ({ row }) => row.original.admitYear || "—",
      },
    ],
    [tokens],
  );

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
    const body = rows.map((student) => [
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
      title={countLabel(rows.length, "student")}
      hint="Click a column header to sort. Search from the top bar matches name, father, B-Form, EMIS, school, and place together."
      action={
        <button type="button" className="solid" onClick={exportCsv}>
          Export this view
        </button>
      }
    >
      <DataTable columns={columns} data={rows} pageSize={25} emptyText="No students match. Clear a filter or try fewer words." />
    </Panel>
  );
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

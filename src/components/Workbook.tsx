import { useEffect, useMemo, useState } from "react";
import { fmt } from "../format";
import type { Staff } from "../staff/types";
import type { Student } from "../types";

const PAGE = 100;

type Column<T> = { header: string; value: (row: T) => string };

type Sheet<T> = {
  id: string;
  label: string;
  note: string;
  serial: string;
  match: (row: T) => boolean;
  columns: Column<T>[];
};

function shown(value: string | number | undefined | null): string {
  if (value == null) return "";
  const text = String(value).trim();
  if (!text || text === "Unknown" || text === "Unknown school") return "";
  return text;
}

function year(value: number): string {
  return value > 0 ? String(value) : "";
}

const STUDENT_BODY: Column<Student>[] = [
  { header: "YEAR", value: (row) => year(row.censusYear) },
  { header: "PROJECT", value: (row) => shown(row.project) },
  { header: "DONOR", value: (row) => shown(row.donor) },
  { header: "PROVINCE", value: (row) => shown(row.province) },
  { header: "EMIS", value: (row) => shown(row.emis) },
  { header: "School", value: (row) => shown(row.school) },
  { header: "District", value: (row) => shown(row.district) },
  { header: "Tehsil", value: (row) => shown(row.tehsil) },
  { header: "System", value: (row) => shown(row.system) },
  { header: "Program", value: (row) => shown(row.program) },
  { header: "Student Name", value: (row) => shown(row.name) },
  { header: "Father Name", value: (row) => shown(row.father) },
  { header: "B-Form", value: (row) => shown(row.bform) },
  { header: "Gender", value: (row) => shown(row.gender) },
  { header: "Class", value: (row) => shown(row.classRaw) },
  { header: "Admission Date", value: (row) => shown(row.admitted) },
  { header: "Date of Birth", value: (row) => shown(row.dob) },
  { header: "Disability (Yes/No)", value: (row) => shown(row.disability) },
  { header: "Religion", value: (row) => shown(row.religion) },
  { header: "Afghani (Yes/No)", value: (row) => shown(row.afghani) },
  { header: "Disaster Effected (Yes/No)", value: (row) => shown(row.disaster) },
];

const STUDENT_ADOPTED: Column<Student>[] = STUDENT_BODY.filter((column) => column.header !== "Program");

const STUDENT_SHEETS: Sheet<Student>[] = [
  {
    id: "psrp-i",
    label: "PSRP-I Student Data",
    serial: "sr. No",
    note: "This is the combined Punjab sheet as it was shared. PEIMA, PSRP-I, and PSRP-II sit in this one tab.",
    match: (row) => row.source === "Punjab partner schools",
    columns: STUDENT_BODY,
  },
  {
    id: "psrp-ii",
    label: "PSRP-II Student Data",
    serial: "Sr.#",
    note: "Shared as its own tab. The same students are already in PSRP-I Student Data, so the census keeps them once. This grid is that PSRP-II list.",
    match: (row) => row.source === "Punjab partner schools" && row.program === "PSRP-II",
    columns: STUDENT_BODY,
  },
  {
    id: "peima",
    label: "PEIMA Student Data",
    serial: "sr. No",
    note: "Shared as its own tab. The same students are already in PSRP-I Student Data under PEIMA, so the census keeps them once. This grid is that PEIMA list.",
    match: (row) => row.source === "Punjab partner schools" && row.program === "PEIMA",
    columns: STUDENT_BODY,
  },
  {
    id: "sindh",
    label: "Sindh Students Data",
    serial: "Sr#",
    note: "Sindh Education Foundation PSP schools, shared as their own tab. TMK in the sheet is Tando Muhammad Khan.",
    match: (row) => row.source === "Sindh PSP",
    columns: STUDENT_BODY.map((column) => (column.header === "School" ? { ...column, header: "School Name" } : column)),
  },
  {
    id: "esp",
    label: "ESP Students Data",
    serial: "Sr.#",
    note: "PEN evening schools, shared as their own tab. Blank rows at the bottom of the sheet are left out.",
    match: (row) => row.source === "Evening School Program",
    columns: STUDENT_BODY.map((column) => (column.header === "School" ? { ...column, header: "School Name" } : column)),
  },
  {
    id: "punjab",
    label: "Punjab Students Data",
    serial: "Sr.#",
    note: "PEN-adopted Punjab schools, shared as their own tab. This sheet has no Program column.",
    match: (row) => row.source === "Punjab adopted schools",
    columns: STUDENT_ADOPTED.map((column) => (column.header === "School" ? { ...column, header: "School Name" } : column)),
  },
];

function staffColumns(yearColumn: boolean, religionColumn: boolean): Column<Staff>[] {
  const columns: Column<Staff>[] = [];
  if (yearColumn) columns.push({ header: "YEAR", value: (row) => shown(row.year) });
  columns.push(
    { header: "PROJECT", value: (row) => shown(row.program) },
    { header: "DONOR", value: (row) => shown(row.donor) },
    { header: "PROVINCE", value: (row) => shown(row.province) },
    { header: "EMIS", value: (row) => shown(row.emis) },
    { header: "School Name", value: (row) => shown(row.school) },
    { header: "Tehsil", value: (row) => shown(row.tehsil) },
    { header: "District", value: (row) => shown(row.district) },
    { header: "Staff Name", value: (row) => shown(row.name) },
    { header: "Gender", value: (row) => shown(row.gender) },
  );
  if (religionColumn) columns.push({ header: "Religion", value: (row) => shown(row.religion) });
  columns.push(
    { header: "Professional Area", value: (row) => shown(row.role) },
    { header: "CNIC", value: (row) => shown(row.cnic) },
    { header: "Father / Husband Name", value: (row) => shown(row.father) },
    { header: "Father / Husband CNIC", value: (row) => shown(row.kinCnic) },
    { header: "Qualification", value: (row) => shown(row.qualificationRaw) },
    { header: "Contact", value: (row) => shown(row.contact) },
  );
  return columns;
}

const STAFF_SHEETS: Sheet<Staff>[] = [
  {
    id: "peima",
    label: "PEIMA Staff data",
    serial: "Sr",
    note: "PEIMA schools, shared as their own tab. This list is not a copy of another staff sheet.",
    match: (row) => row.source === "PEIMA staff",
    columns: staffColumns(true, true),
  },
  {
    id: "psrp-i",
    label: "PSRP-I Staff Data",
    serial: "Sr",
    note: "PSRP-I partner schools, shared as their own tab.",
    match: (row) => row.source === "PSRP-I staff",
    columns: staffColumns(true, true),
  },
  {
    id: "psrp-ii",
    label: "PSRP-II Staff Data",
    serial: "Sr",
    note: "PSRP-II partner schools, shared as their own tab.",
    match: (row) => row.source === "PSRP-II staff",
    columns: staffColumns(true, true),
  },
  {
    id: "sindh",
    label: "Sindh Staff Data",
    serial: "Sr.#",
    note: "Sindh PSP schools, shared as their own tab. This sheet has no religion column. TMK is Tando Muhammad Khan.",
    match: (row) => row.source === "Sindh PSP staff",
    columns: staffColumns(true, false),
  },
  {
    id: "punjab",
    label: "Punjab Staff Data",
    serial: "Sr",
    note: "Adopted Punjab schools, shared as their own tab. This sheet has no year column.",
    match: (row) => row.source === "Punjab adopted staff",
    columns: staffColumns(false, true),
  },
  {
    id: "esp",
    label: "ESP Staff Data",
    serial: "Sr",
    note: "PEN evening schools, shared as their own tab.",
    match: (row) => row.source === "Evening School Program staff",
    columns: staffColumns(true, true),
  },
];

function Workbook<T>({ fileName, sheets, rows }: { fileName: string; sheets: Sheet<T>[]; rows: T[] }) {
  const initial = new URLSearchParams(location.search).get("s") ?? sheets[0].id;
  const [sheetId, setSheetId] = useState(sheets.some((sheet) => sheet.id === initial) ? initial : sheets[0].id);
  const [page, setPage] = useState(0);
  const sheet = sheets.find((item) => item.id === sheetId) ?? sheets[0];
  const matched = useMemo(() => rows.filter(sheet.match), [rows, sheet]);
  const pages = Math.max(1, Math.ceil(matched.length / PAGE));
  const safePage = Math.min(page, pages - 1);
  const start = safePage * PAGE;
  const visible = matched.slice(start, start + PAGE);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("s") === sheet.id) return;
    params.set("s", sheet.id);
    history.replaceState(null, "", `${location.pathname}?${params.toString()}${location.hash}`);
  }, [sheet.id]);

  function open(id: string) {
    setSheetId(id);
    setPage(0);
  }

  return (
    <section className="stack">
      <header>
        <p className="kicker">Workbook</p>
        <h2>{fileName}</h2>
        <p className="lede">
          Each link is a tab from the shared workbook, in the same order, with that tab’s columns. Row numbers restart on each tab. The original code column was not stored, and names and places use the atlas spelling.
        </p>
      </header>
      <div className="sheet-tabs" role="tablist" aria-label="Workbook tabs">
        {sheets.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={item.id === sheet.id} className={item.id === sheet.id ? "on" : undefined} onClick={() => open(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="sheet-book">
        <div className="sheet-note">
          <strong>{fmt(matched.length)} rows</strong>
          <span>{sheet.note}</span>
        </div>
        <div className="sheet-scroll">
          <table className="sheet">
            <thead>
              <tr>
                <th className="rowno">{sheet.serial}</th>
                {sheet.columns.map((column) => (
                  <th key={column.header}>{column.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row, index) => (
                <tr key={start + index}>
                  <td className="rowno">{start + index + 1}</td>
                  {sheet.columns.map((column) => (
                    <td key={column.header}>{column.value(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="sheet-pages">
          <button type="button" className="ghost" disabled={safePage === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
            Previous
          </button>
          <span>
            {matched.length ? `${fmt(start + 1)}–${fmt(Math.min(start + PAGE, matched.length))} of ${fmt(matched.length)}` : "No rows in this tab"}
          </span>
          <button type="button" className="ghost" disabled={safePage >= pages - 1} onClick={() => setPage((current) => current + 1)}>
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

export function StudentWorkbook({ rows, fileName }: { rows: Student[]; fileName: string }) {
  return <Workbook fileName={fileName} sheets={STUDENT_SHEETS} rows={rows} />;
}

export function StaffWorkbook({ rows, fileName }: { rows: Staff[]; fileName: string }) {
  return <Workbook fileName={fileName} sheets={STAFF_SHEETS} rows={rows} />;
}

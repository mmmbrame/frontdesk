import { useMemo, useState, type FormEvent } from "react";
import { ageBandFor, ageOn, stageFor, systemFor } from "../../shared/records";
import { GRADE_ORDER, PROGRAM_ORDER, type Student } from "../types";
import { RecordDialog, SelectField, TextField, uniqueValues } from "./RecordDialog";

const GENDERS = ["Female", "Male", "Unknown"];
const TRIS = ["Unknown", "Yes", "No"];

type Draft = {
  name: string;
  father: string;
  gender: string;
  religion: string;
  bform: string;
  disability: string;
  afghani: string;
  disaster: string;
  school: string;
  emis: string;
  province: string;
  district: string;
  tehsil: string;
  program: string;
  system: string;
  donor: string;
  project: string;
  source: string;
  grade: string;
  section: string;
  stream: string;
  classRaw: string;
  admitted: string;
  dob: string;
  censusYear: string;
};

const BLANK: Draft = {
  name: "",
  father: "",
  gender: "Unknown",
  religion: "",
  bform: "",
  disability: "Unknown",
  afghani: "Unknown",
  disaster: "Unknown",
  school: "",
  emis: "",
  province: "",
  district: "",
  tehsil: "",
  program: "",
  system: "",
  donor: "",
  project: "",
  source: "Added in atlas",
  grade: "",
  section: "",
  stream: "",
  classRaw: "",
  admitted: "",
  dob: "",
  censusYear: "2026",
};

export function AddStudent({
  catalog,
  onCreated,
  onClose,
}: {
  catalog: Student[];
  onCreated: (student: Student) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Draft>(BLANK);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const lists = useMemo(
    () => ({
      religion: uniqueValues(catalog.map((row) => row.religion)),
      school: uniqueValues(catalog.map((row) => row.school)),
      province: uniqueValues(catalog.map((row) => row.province)),
      district: uniqueValues(catalog.map((row) => row.district)),
      tehsil: uniqueValues(catalog.map((row) => row.tehsil)),
      system: uniqueValues(catalog.map((row) => row.system)),
      donor: uniqueValues(catalog.map((row) => row.donor)),
      project: uniqueValues(catalog.map((row) => row.project)),
      source: uniqueValues(["Added in atlas", ...catalog.map((row) => row.source)]),
      stream: uniqueValues(catalog.map((row) => row.stream)),
      section: uniqueValues(catalog.map((row) => row.section)),
    }),
    [catalog],
  );
  const programs = useMemo(() => uniqueValues([...PROGRAM_ORDER, ...catalog.map((row) => row.program)]), [catalog]);
  const age = ageOn(form.dob);
  const stage = stageFor(form.grade || "Unknown");

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { student?: Student; error?: string };
      if (!response.ok || !data.student) throw new Error(data.error || "The student could not be added.");
      onCreated(data.student);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The student could not be added.");
      setSaving(false);
    }
  }

  return (
    <RecordDialog
      title="New student"
      lede="Every field on a student record is here. Age, stage, and admission year are worked out from the date of birth, grade, and admission date. The student is saved into the atlas and shows up in the charts."
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <h3 className="form-span">Student</h3>
          <TextField label="Name" required value={form.name} onChange={(value) => set("name", value)} />
          <TextField label="Father" value={form.father} onChange={(value) => set("father", value)} />
          <SelectField label="Gender" value={form.gender} options={GENDERS} onChange={(value) => set("gender", value)} />
          <TextField label="Religion" value={form.religion} list={lists.religion} onChange={(value) => set("religion", value)} />
          <TextField label="B-Form" value={form.bform} onChange={(value) => set("bform", value)} placeholder="13 digits" />
          <SelectField label="Disability" value={form.disability} options={TRIS} onChange={(value) => set("disability", value)} />
          <SelectField label="Disaster affected" value={form.disaster} options={TRIS} onChange={(value) => set("disaster", value)} />
          <SelectField label="Afghan" value={form.afghani} options={TRIS} onChange={(value) => set("afghani", value)} />

          <h3 className="form-span">School</h3>
          <TextField label="School" value={form.school} list={lists.school} onChange={(value) => set("school", value)} />
          <TextField label="EMIS" value={form.emis} onChange={(value) => set("emis", value)} />
          <TextField label="Province" value={form.province} list={lists.province} onChange={(value) => set("province", value)} />
          <TextField label="District" value={form.district} list={lists.district} onChange={(value) => set("district", value)} />
          <TextField label="Tehsil" value={form.tehsil} list={lists.tehsil} onChange={(value) => set("tehsil", value)} />

          <h3 className="form-span">Enrollment</h3>
          <SelectField
            label="Program"
            value={form.program}
            options={programs}
            onChange={(value) =>
              setForm((current) => {
                const nextDefault = systemFor(value);
                const previousDefault = systemFor(current.program);
                const system = !current.system || current.system === previousDefault ? nextDefault : current.system;
                return { ...current, program: value, system };
              })
            }
          />
          <TextField label="System" value={form.system} list={lists.system} onChange={(value) => set("system", value)} />
          <TextField label="Donor" value={form.donor} list={lists.donor} onChange={(value) => set("donor", value)} />
          <TextField label="Project" value={form.project} list={lists.project} onChange={(value) => set("project", value)} />
          <TextField label="Workbook source" value={form.source} list={lists.source} onChange={(value) => set("source", value)} />
          <SelectField label="Grade" value={form.grade} options={GRADE_ORDER.filter((grade) => grade !== "Unknown")} onChange={(value) => set("grade", value)} />
          <TextField label="Section" value={form.section} list={lists.section} onChange={(value) => set("section", value)} />
          <TextField label="Stream" value={form.stream} list={lists.stream} onChange={(value) => set("stream", value)} />
          <TextField label="Class as recorded" value={form.classRaw} onChange={(value) => set("classRaw", value)} placeholder="Leave blank to use the grade" />
          <TextField label="Admission date" type="date" value={form.admitted} onChange={(value) => set("admitted", value)} />
          <TextField label="Date of birth" type="date" value={form.dob} onChange={(value) => set("dob", value)} />
          <TextField label="Census year" value={form.censusYear} onChange={(value) => set("censusYear", value)} />
          <p className="fine form-span">
            Stage {stage}. Age {age < 0 ? "unknown until a date of birth is entered" : `${age} (${ageBandFor(age)})`}, counted as of 14 Oct 2026.
            Admission year {form.admitted.slice(0, 4) || "unknown"}.
          </p>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="dialog-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="solid" disabled={saving}>
            {saving ? "Saving…" : "Add student"}
          </button>
        </div>
      </form>
    </RecordDialog>
  );
}

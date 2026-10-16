import { useMemo, useState, type FormEvent } from "react";
import { FAMILY_OPTIONS, QUAL_OPTIONS, ROLE_OPTIONS, roleParts, systemFor } from "../../shared/records";
import { RecordDialog, SelectField, TextField, uniqueValues } from "../components/RecordDialog";
import { PROGRAM_ORDER } from "../types";
import type { Staff } from "./types";

const GENDERS = ["Female", "Male", "Unknown"];

type Draft = {
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
  school: string;
  emis: string;
  province: string;
  district: string;
  tehsil: string;
  program: string;
  system: string;
  donor: string;
  year: string;
  source: string;
};

const BLANK: Draft = {
  name: "",
  father: "",
  gender: "Unknown",
  religion: "",
  role: "",
  family: "",
  qualification: "",
  qualificationRaw: "",
  cnic: "",
  kinCnic: "",
  contact: "",
  school: "",
  emis: "",
  province: "",
  district: "",
  tehsil: "",
  program: "",
  system: "",
  donor: "",
  year: "2026",
  source: "Added in atlas",
};

export function AddStaff({
  catalog,
  onCreated,
  onClose,
}: {
  catalog: Staff[];
  onCreated: (person: Staff) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Draft>(BLANK);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const lists = useMemo(
    () => ({
      religion: uniqueValues(catalog.map((row) => row.religion)),
      role: uniqueValues([...ROLE_OPTIONS, ...catalog.map((row) => row.role)]),
      school: uniqueValues(catalog.map((row) => row.school)),
      province: uniqueValues(catalog.map((row) => row.province)),
      district: uniqueValues(catalog.map((row) => row.district)),
      tehsil: uniqueValues(catalog.map((row) => row.tehsil)),
      system: uniqueValues(catalog.map((row) => row.system)),
      donor: uniqueValues(catalog.map((row) => row.donor)),
      source: uniqueValues(["Added in atlas", ...catalog.map((row) => row.source)]),
    }),
    [catalog],
  );
  const programs = useMemo(() => uniqueValues([...PROGRAM_ORDER, ...catalog.map((row) => row.program)]), [catalog]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { person?: Staff; error?: string };
      if (!response.ok || !data.person) throw new Error(data.error || "The staff member could not be added.");
      onCreated(data.person);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The staff member could not be added.");
      setSaving(false);
    }
  }

  return (
    <RecordDialog
      title="New staff member"
      lede="Every field on a staff record is here. The role family follows the title, and the qualification level follows the wording, unless you set them yourself. The person is saved into the atlas and shows up in the charts."
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <h3 className="form-span">Person</h3>
          <TextField label="Name" required value={form.name} onChange={(value) => set("name", value)} />
          <TextField label="Father / husband" value={form.father} onChange={(value) => set("father", value)} />
          <SelectField label="Gender" value={form.gender} options={GENDERS} onChange={(value) => set("gender", value)} />
          <TextField label="Religion" value={form.religion} list={lists.religion} onChange={(value) => set("religion", value)} />
          <TextField
            label="Role"
            value={form.role}
            list={lists.role}
            onChange={(value) =>
              setForm((current) => {
                const next = roleParts(value);
                const previous = roleParts(current.role);
                const family = !current.family || current.family === previous.family ? (value.trim() ? next.family : "") : current.family;
                return { ...current, role: value, family };
              })
            }
          />
          <SelectField label="Role family" value={form.family} options={FAMILY_OPTIONS} onChange={(value) => set("family", value)} />
          <SelectField label="Qualification" value={form.qualification} options={QUAL_OPTIONS} onChange={(value) => set("qualification", value)} />
          <TextField label="Qualification as recorded" value={form.qualificationRaw} onChange={(value) => set("qualificationRaw", value)} placeholder="B.A, B.Ed" />
          <TextField label="CNIC" value={form.cnic} onChange={(value) => set("cnic", value)} placeholder="13 digits" />
          <TextField label="Kin CNIC" value={form.kinCnic} onChange={(value) => set("kinCnic", value)} />
          <TextField label="Contact" value={form.contact} onChange={(value) => set("contact", value)} placeholder="03…" />

          <h3 className="form-span">School</h3>
          <TextField label="School" value={form.school} list={lists.school} onChange={(value) => set("school", value)} />
          <TextField label="EMIS" value={form.emis} onChange={(value) => set("emis", value)} />
          <TextField label="Province" value={form.province} list={lists.province} onChange={(value) => set("province", value)} />
          <TextField label="District" value={form.district} list={lists.district} onChange={(value) => set("district", value)} />
          <TextField label="Tehsil" value={form.tehsil} list={lists.tehsil} onChange={(value) => set("tehsil", value)} />

          <h3 className="form-span">Program</h3>
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
          <TextField label="Year" value={form.year} onChange={(value) => set("year", value)} />
          <TextField label="Sheet" value={form.source} list={lists.source} onChange={(value) => set("source", value)} />
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="dialog-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="solid" disabled={saving}>
            {saving ? "Saving…" : "Add staff"}
          </button>
        </div>
      </form>
    </RecordDialog>
  );
}

import { useMemo } from "react";
import { aggregate, colorFor } from "../query";
import type { Student } from "../types";
import { HBars } from "./Charts";
import { Panel } from "./Visuals";

export function Geography({
  rows,
  onDistrict,
  onTehsil,
  onSchool,
  onProvince,
}: {
  rows: Student[];
  onDistrict: (value: string) => void;
  onTehsil: (value: string) => void;
  onSchool: (value: string) => void;
  onProvince: (value: string) => void;
}) {
  const districts = useMemo(
    () =>
      aggregate(rows, "district")
        .sort((a, b) => b.students - a.students)
        .map((row, index) => ({ name: row.key, value: row.students, fill: colorFor("district", row.key, index) })),
    [rows],
  );
  const tehsils = useMemo(
    () =>
      aggregate(rows, "tehsil")
        .sort((a, b) => b.students - a.students)
        .slice(0, 18)
        .map((row, index) => ({ name: row.key, value: row.students, fill: colorFor("tehsil", row.key, index) })),
    [rows],
  );
  const schools = useMemo(
    () =>
      aggregate(rows, "school")
        .sort((a, b) => b.students - a.students)
        .slice(0, 15)
        .map((row, index) => ({ name: row.key, value: row.students, fill: colorFor("school", row.key, index) })),
    [rows],
  );
  const provinces = useMemo(
    () =>
      aggregate(rows, "province").map((row, index) => ({
        name: row.key,
        value: row.students,
        fill: colorFor("province", row.key, index),
      })),
    [rows],
  );

  return (
    <div className="stack">
      <div className="grid-2">
        <Panel kicker="Districts" title="Enrollment by district" hint="Click a district to filter every other view.">
          <HBars data={districts} height={Math.max(320, districts.length * 30)} onPick={onDistrict} />
        </Panel>
        <Panel kicker="Tehsils" title="Largest tehsils" hint="The first 18 in this view.">
          <HBars data={tehsils} height={Math.max(320, tehsils.length * 30)} onPick={onTehsil} />
        </Panel>
      </div>
      <div className="grid-2">
        <Panel kicker="Schools" title="Largest schools" hint="School names as recorded, after spelling cleanup.">
          <HBars data={schools} height={Math.max(320, schools.length * 32)} onPick={onSchool} />
        </Panel>
        <Panel kicker="Province" title="Punjab and Sindh" hint="Sindh is the PSP cohort. Punjab holds the partner, evening, and adopted schools.">
          <HBars data={provinces} height={180} onPick={onProvince} />
        </Panel>
      </div>
    </div>
  );
}

import type { StaffDataset } from "./types";

export async function loadStaff(): Promise<StaffDataset> {
  const [response, added] = await Promise.all([
    fetch("/api/staff"),
    fetch("/api/additions")
      .then(async (extra) => {
        if (!extra.ok) return [] as StaffDataset["staff"];
        const body = (await extra.json()) as { staff?: StaffDataset["staff"] };
        return Array.isArray(body.staff) ? body.staff.filter((person) => person && typeof person.name === "string") : [];
      })
      .catch(() => [] as StaffDataset["staff"]),
  ]);
  if (!response.ok) throw new Error("The staff file could not be loaded.");
  const data = (await response.json()) as StaffDataset;
  if (!Array.isArray(data.staff)) throw new Error("The staff file could not be read.");
  return { ...data, staff: [...added, ...data.staff] };
}

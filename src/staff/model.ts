import type { StaffDataset } from "./types";

export async function loadStaff(): Promise<StaffDataset> {
  const response = await fetch("/api/staff");
  if (!response.ok) throw new Error("The staff file could not be loaded.");
  const data = (await response.json()) as StaffDataset;
  if (!Array.isArray(data.staff)) throw new Error("The staff file could not be read.");
  return data;
}

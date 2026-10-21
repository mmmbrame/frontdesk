import { fmt } from "../format";
import { CROSS_CUTTING, SDGS, THEMES } from "./catalog";
import { facetPartners, filterLabel, type PartnerFilters, type PartnerKey } from "./query";
import type { PartnerEntry } from "./catalog";

const GROUPS: { title: string; open?: boolean; keys: PartnerKey[] }[] = [
  { title: "Organizational strength", open: true, keys: ["theme", "years", "beneficiary"] },
  { title: "Programmes and pipeline", open: true, keys: ["programme", "pipeline", "status"] },
  { title: "Place", keys: ["province", "district"] },
  { title: "SDGs and cross-cutting", keys: ["sdg", "crossCutting"] },
];

export function PartnerFilters({
  rows,
  filters,
  filteredCount,
  onToggle,
  onReset,
}: {
  rows: PartnerEntry[];
  filters: PartnerFilters;
  filteredCount: number;
  onToggle: (key: PartnerKey, value: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="filters">
      {GROUPS.map((group) => (
        <details key={group.title} open={group.open}>
          <summary>{group.title}</summary>
          {group.keys.map((key) => (
            <fieldset className="checks" key={key}>
              <legend>{filterLabel(key)}</legend>
              {facetPartners(rows, filters, key).map((option, index) => {
                const on = filters[key].includes(option.value);
                return (
                  <label key={option.value} className={on ? "check on" : "check"}>
                    <input type="checkbox" checked={on} onChange={() => onToggle(key, option.value)} />
                    <i style={{ background: swatch(key, option.value, index) }} />
                    <span>{option.value}</span>
                    <em>{fmt(option.count)}</em>
                  </label>
                );
              })}
            </fieldset>
          ))}
        </details>
      ))}
      <div className="sidebar-foot">
        <button type="button" className="clear" onClick={onReset} disabled={filteredCount === rows.length && !filters.q.trim()}>
          Clear filters
        </button>
        <span>{fmt(filteredCount)} shown</span>
      </div>
    </div>
  );
}

function swatch(key: PartnerKey, value: string, index: number): string {
  if (key === "theme") {
    const found = THEMES.findIndex((theme) => theme.name === value);
    return ["#0e6b57", "#c24d2c", "#2a527a", "#c9922a", "#6b4c9a", "#3d7a4a", "#b86b4a", "#4d6d7a"][found === -1 ? index : found];
  }
  if (key === "sdg") {
    const found = SDGS.findIndex((item) => item.name === value);
    return ["#0e6b57", "#c24d2c", "#2a527a", "#c9922a", "#6b4c9a", "#3d7a4a", "#b86b4a", "#4d6d7a", "#8a5a44", "#1f7a8c"][found === -1 ? index : found];
  }
  if (key === "crossCutting") {
    const found = CROSS_CUTTING.findIndex((item) => item.name === value);
    return ["#0e6b57", "#c24d2c", "#2a527a", "#c9922a", "#6b4c9a", "#3d7a4a"][found === -1 ? index : found];
  }
  return ["#0e6b57", "#c24d2c", "#2a527a", "#c9922a", "#6b4c9a", "#3d7a4a", "#b86b4a", "#4d6d7a"][index % 8];
}

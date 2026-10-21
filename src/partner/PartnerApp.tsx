import { useEffect, useMemo, useRef, useState } from "react";
import {
  Compass,
  Database,
  Handshake,
  LayoutGrid,
  ListChecks,
  Moon,
  PanelLeft,
  Route,
  Sun,
  Target,
  type LucideIcon,
} from "lucide-react";
import { fmt } from "../format";
import { PARTNER_ENTRIES } from "./demo";
import { PartnerFilters } from "./Filters";
import {
  EMPTY_PARTNER_FILTERS,
  FILTER_KEYS,
  applyPartnerFilters,
  isPartnerFiltered,
  partnerChips,
  removePartnerChip,
  summarizePartners,
  togglePartner,
  type PartnerFilters as FilterState,
  type PartnerKey,
} from "./query";
import { Entries, Pipeline, Programmes, Results, Sdgs, Strength, Themes } from "./views";

type TabId = "strength" | "themes" | "programmes" | "pipeline" | "sdgs" | "results" | "entries";

const NAV: { label: string; items: { id: TabId; label: string; icon: LucideIcon }[] }[] = [
  { label: "Profile", items: [{ id: "strength", label: "Strength", icon: Handshake }] },
  {
    label: "Portfolio",
    items: [
      { id: "themes", label: "Themes", icon: Compass },
      { id: "programmes", label: "Programmes", icon: ListChecks },
      { id: "pipeline", label: "Pipeline", icon: Route },
    ],
  },
  {
    label: "Evidence",
    items: [
      { id: "sdgs", label: "SDGs", icon: Target },
      { id: "results", label: "Results", icon: Database },
      { id: "entries", label: "Entries", icon: ListChecks },
    ],
  },
];

const TABS = NAV.flatMap((group) => group.items);

function readFilters(): FilterState {
  const raw = location.hash.replace(/^#/, "");
  if (!raw) return EMPTY_PARTNER_FILTERS;
  try {
    const data = JSON.parse(decodeURIComponent(raw)) as Partial<FilterState>;
    const next: FilterState = { ...EMPTY_PARTNER_FILTERS };
    for (const key of FILTER_KEYS) {
      const value = data[key];
      if (Array.isArray(value)) next[key] = value.filter((item): item is string => typeof item === "string");
    }
    if (typeof data.q === "string") next.q = data.q;
    return next;
  } catch {
    return EMPTY_PARTNER_FILTERS;
  }
}

function writeFilters(filters: FilterState): string {
  const data: Record<string, unknown> = {};
  for (const key of FILTER_KEYS) if (filters[key].length) data[key] = filters[key];
  if (filters.q.trim()) data.q = filters.q;
  if (!Object.keys(data).length) return "";
  return encodeURIComponent(JSON.stringify(data));
}

function readModule(): TabId {
  const requested = new URLSearchParams(location.search).get("m");
  return TABS.some((item) => item.id === requested) ? (requested as TabId) : "strength";
}

export function PartnerApp({ onHome }: { onHome: () => void }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [filters, setFilters] = useState<FilterState>(() => readFilters());
  const [tab, setTab] = useState<TabId>(() => readModule());
  const [sideOpen, setSideOpen] = useState(() => window.innerWidth > 860);
  const [filterOpen, setFilterOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const rows = PARTNER_ENTRIES;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("atlas-theme", dark ? "dark" : "light");
    } catch {
      // Storage can be blocked; the theme still works for this visit.
    }
  }, [dark]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => applyPartnerFilters(rows, filters), [rows, filters]);
  const summary = useMemo(() => summarizePartners(filtered), [filtered]);
  const chips = useMemo(() => partnerChips(filters), [filters]);

  useEffect(() => {
    const next = writeFilters(filters);
    const current = location.hash.replace(/^#/, "");
    if (next !== current) {
      history.replaceState(null, "", next ? `${location.pathname}${location.search}#${next}` : `${location.pathname}${location.search}`);
    }
  }, [filters]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("m") === tab) return;
    params.set("m", tab);
    history.replaceState(null, "", `${location.pathname}?${params.toString()}${location.hash}`);
  }, [tab]);

  function selectModule(next: TabId) {
    setTab(next);
    if (window.innerWidth <= 860) setSideOpen(false);
  }

  function pick(key: PartnerKey, value: string) {
    setFilters((current) => togglePartner(current, key, value));
  }

  return (
    <div className={sideOpen ? "shell" : "shell collapsed"}>
      <aside className={sideOpen ? "sidebar open" : "sidebar collapsed"}>
        <div className="sidebar-brand">
          <span className="logo" aria-hidden="true">
            <Handshake size={16} />
          </span>
          <div>
            <strong>PEN Atlas</strong>
            <span>Partner 2026</span>
          </div>
        </div>
        <nav className="nav" aria-label="Modules">
          {NAV.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-label">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={tab === item.id ? "nav-link on" : "nav-link"}
                    data-label={item.label}
                    aria-label={item.label}
                    onClick={() => selectModule(item.id)}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                    {item.id === "entries" ? <em>{fmt(filtered.length)}</em> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="nav-group sidebar-actions">
          <button type="button" className="nav-link" data-label="Choose records" aria-label="Choose records" onClick={onHome}>
            <LayoutGrid size={16} />
            <span>Choose records</span>
          </button>
          <button
            type="button"
            className="nav-link"
            data-label={dark ? "Light mode" : "Dark mode"}
            aria-label={dark ? "Light mode" : "Dark mode"}
            onClick={() => setDark((value) => !value)}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            <span>{dark ? "Light mode" : "Dark mode"}</span>
          </button>
        </div>
      </aside>
      {sideOpen && window.innerWidth <= 860 ? <button className="scrim" type="button" aria-label="Close menu" onClick={() => setSideOpen(false)} /> : null}

      <main className="main">
        <div className="content-bar">
          <button
            type="button"
            className="icon-btn"
            aria-label={sideOpen ? "Hide sidebar" : "Show sidebar"}
            title={sideOpen ? "Hide sidebar" : "Show sidebar"}
            onClick={() => setSideOpen((value) => !value)}
          >
            <PanelLeft size={18} />
          </button>
          <span className="crumb">
            Potential partner / <strong>{TABS.find((item) => item.id === tab)?.label}</strong>
          </span>
        </div>
        <header className="top">
          <div>
            <p className="kicker">Potential partner · academic year 2026</p>
            <h1>PEN as a donor partner.</h1>
            <p className="lede">
              Themes, programmes, pipeline, SDGs, and sample results from the partner brief. The {fmt(rows.length)} entries are a demonstration register, not the student or staff census.
            </p>
          </div>
          <div className="top-tools">
            <div className="search">
              <input
                ref={searchRef}
                value={filters.q}
                onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
                placeholder="Search theme, programme, place, SDG"
                aria-label="Search partner entries"
              />
              <span className="slash">/</span>
            </div>
            <button type="button" className="ghost" aria-expanded={filterOpen} onClick={() => setFilterOpen(true)}>
              Filters{isPartnerFiltered(filters) ? ` · ${chips.length} active` : ""}
            </button>
          </div>
        </header>

        <div className="filter-bar">
          <span className="fine">
            {isPartnerFiltered(filters) ? "Clear a value in the drawer to widen the results." : "Showing the full demonstration register. Open filters to narrow it."}
          </span>
        </div>

        {filterOpen ? (
          <>
            <button type="button" className="filter-scrim" aria-label="Close filters" onClick={() => setFilterOpen(false)} />
            <aside className="filter-drawer" aria-label="Filters">
              <div className="filter-drawer-head">
                <strong>Filters</strong>
                <button type="button" className="ghost" onClick={() => setFilterOpen(false)}>
                  Done
                </button>
              </div>
              <div className="filter-drawer-body">
                <PartnerFilters
                  rows={rows}
                  filters={filters}
                  filteredCount={filtered.length}
                  onToggle={pick}
                  onReset={() => setFilters(EMPTY_PARTNER_FILTERS)}
                />
              </div>
            </aside>
          </>
        ) : null}

        <div className="status">
          <strong>
            {fmt(filtered.length)} <em>of {fmt(rows.length)}</em>
          </strong>
          <div className="chips">
            {chips.map((chip) => (
              <button key={chip.key} type="button" onClick={() => setFilters((current) => removePartnerChip(current, chip.key))}>
                {chip.label} <span>×</span>
              </button>
            ))}
            {!chips.length ? <span className="fine">No filters yet. Click a chart or a table row to narrow the register.</span> : null}
          </div>
        </div>

        {tab === "strength" ? <Strength rows={filtered} summary={summary} universe={rows.length} onPick={pick} /> : null}
        {tab === "themes" ? <Themes rows={filtered} onPick={pick} /> : null}
        {tab === "programmes" ? <Programmes rows={filtered} onPick={pick} /> : null}
        {tab === "pipeline" ? <Pipeline rows={filtered} onPick={pick} /> : null}
        {tab === "sdgs" ? <Sdgs rows={filtered} onPick={pick} /> : null}
        {tab === "results" ? <Results summary={summary} /> : null}
        {tab === "entries" ? <Entries rows={filtered} /> : null}
      </main>
    </div>
  );
}

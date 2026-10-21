import {
  BENEFICIARIES,
  CROSS_CUTTING,
  PIPELINE,
  PLACES,
  PROGRAMMES,
  SCHOOL_PROJECTS,
  SDGS,
  STATUSES,
  THEMES,
  YEARS,
  type PartnerEntry,
} from "./catalog";

function random(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(roll: () => number, items: readonly T[]): T {
  return items[Math.floor(roll() * items.length)];
}

function build(): PartnerEntry[] {
  const roll = random(20261021);
  const rows: PartnerEntry[] = [];
  for (let index = 0; index < 120; index += 1) {
    const theme = THEMES[index % THEMES.length];
    const subtheme = theme.subthemes[Math.floor(roll() * theme.subthemes.length)];
    const programme = PROGRAMMES[index % PROGRAMMES.length];
    const pipeline = PIPELINE[Math.floor(roll() * PIPELINE.length)];
    const place = PLACES[Math.floor(roll() * PLACES.length)];
    const beneficiary = BENEFICIARIES[Math.floor(roll() * BENEFICIARIES.length)];
    const status = STATUSES[Math.floor(roll() * STATUSES.length)];
    const sdg = index % 3 === 0 ? SDGS[0] : SDGS[Math.floor(roll() * SDGS.length)];
    const cross = CROSS_CUTTING[Math.floor(roll() * CROSS_CUTTING.length)];
    const students = 24 + Math.floor(roll() * 160);
    const girls = beneficiary.startsWith("Girls") ? students : Math.round(students * (0.42 + roll() * 0.2));
    const outOfSchool = /out-of-school|non-formal/i.test(subtheme) || programme.code === "PROG-03" ? students : Math.round(students * 0.08);
    const teachers = 1 + Math.floor(roll() * 14);
    const schools = 1 + Math.floor(roll() * 5);
    const digital = theme.code === "THEM-03" || programme.code === "PROG-06";
    const infrastructure = theme.code === "THEM-07";
    const research = theme.code === "THEM-08" || programme.code === "PROG-08";
    rows.push({
      id: `PEN-${String(index + 1).padStart(3, "0")}`,
      theme: theme.name,
      subtheme,
      years: pick(roll, YEARS),
      schoolProjects: pick(roll, SCHOOL_PROJECTS),
      beneficiary,
      province: place.province,
      district: place.district,
      programme: programme.name,
      pipeline: pipeline.name,
      crossCutting: cross.name,
      sdg: sdg.name,
      status,
      students,
      girls,
      outOfSchool,
      teachers,
      schools,
      academicSchools: programme.code === "PROG-05" ? schools : 0,
      digitalStudents: digital ? students : 0,
      digitalResources: digital ? 1 + Math.floor(roll() * 4) : 0,
      scholarships: programme.code === "PROG-07" ? students : 0,
      improvedSchools: infrastructure ? schools : 0,
      communitySessions: cross.code === "CROSS-05" ? 1 + Math.floor(roll() * 6) : 0,
      safeguarding: cross.code === "CROSS-01" ? 1 : 0,
      researchProducts: research ? 1 : 0,
    });
  }
  return rows;
}

export const PARTNER_ENTRIES = build();

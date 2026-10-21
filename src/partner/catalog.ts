export type PartnerEntry = {
  id: string;
  theme: string;
  subtheme: string;
  years: string;
  schoolProjects: string;
  beneficiary: string;
  province: string;
  district: string;
  programme: string;
  pipeline: string;
  crossCutting: string;
  sdg: string;
  status: "Previous" | "In process" | "Upcoming";
  students: number;
  girls: number;
  outOfSchool: number;
  teachers: number;
  schools: number;
  academicSchools: number;
  digitalStudents: number;
  digitalResources: number;
  scholarships: number;
  improvedSchools: number;
  communitySessions: number;
  safeguarding: number;
  researchProducts: number;
};

export const YEARS = ["0–3", "4–6", "7–10"];
export const SCHOOL_PROJECTS = ["10", "20", "30", "Other"];
export const BENEFICIARIES = ["Women", "Youth", "Marginalized", "Local community", "Parents", "Girls (age 16–20)", "Other"];
export const STATUSES = ["Previous", "In process", "Upcoming"] as const;

export const THEMES: { code: string; name: string; subthemes: string[] }[] = [
  {
    code: "THEM-01",
    name: "Access to quality education",
    subthemes: [
      "Public-school adoption and improvement",
      "Education for underserved communities",
      "Foundational literacy and numeracy",
      "Inclusive and equitable education",
      "Out-of-school children",
      "Non-formal education",
    ],
  },
  {
    code: "THEM-02",
    name: "Girls’ education and gender equality",
    subthemes: [
      "Girls’ enrolment, attendance and retention",
      "Adolescent girls’ empowerment",
      "Prevention of child marriage",
      "Gender-responsive schools",
      "Equal learning opportunities",
    ],
  },
  {
    code: "THEM-03",
    name: "Digital learning and educational technology",
    subthemes: [
      "PEN Academy",
      "E-learning and digital content",
      "Technology-enabled teaching",
      "Digital literacy",
      "Learning analytics",
      "Education dashboards",
    ],
  },
  {
    code: "THEM-04",
    name: "Teacher development and school leadership",
    subthemes: [
      "Teacher training and mentoring",
      "School leadership and management",
      "Pedagogical innovation",
      "Classroom assessment",
      "Institutional capacity building",
    ],
  },
  {
    code: "THEM-05",
    name: "Community engagement and child wellbeing",
    subthemes: [
      "Parent and community participation",
      "Child protection and safeguarding",
      "Adolescent life skills",
      "Positive social norms",
      "School-community partnerships",
    ],
  },
  {
    code: "THEM-06",
    name: "Inclusive education and child rights",
    subthemes: [
      "Education for children with disabilities",
      "Access for marginalized children",
      "Safe and inclusive learning environments",
      "Child participation and rights awareness",
      "Prevention of discrimination and exclusion",
    ],
  },
  {
    code: "THEM-07",
    name: "School infrastructure and learning environments",
    subthemes: [
      "School rehabilitation and facilities",
      "Water, sanitation and hygiene (WASH) in schools",
      "Safe classrooms and accessibility",
      "Learning materials and educational resources",
      "Climate-resilient schools",
    ],
  },
  {
    code: "THEM-08",
    name: "Research, monitoring, evaluation and learning",
    subthemes: [
      "Education data and performance monitoring",
      "Learning assessments",
      "Research and evidence generation",
      "Digital dashboards and reporting",
      "Impact evaluations and knowledge products",
    ],
  },
];

export const PROGRAMMES: { code: string; name: string; note: string }[] = [
  { code: "PROG-01", name: "Public-school adoption", note: "School improvement, access to education and support for disadvantaged children." },
  { code: "PROG-02", name: "PEIMA partnership model", note: "Management and quality improvement of public schools in Punjab." },
  { code: "PROG-03", name: "Non-formal education (NFE)", note: "Second-chance education for out-of-school and working children." },
  { code: "PROG-04", name: "Teacher training", note: "Pre-service, in-service and refresher training, mentoring and professional development." },
  { code: "PROG-05", name: "Academic development", note: "Lesson plans, activity books, teaching resources and student assessments." },
  { code: "PROG-06", name: "PEN Academy", note: "Digital learning content, educational technology and online learning resources." },
  { code: "PROG-07", name: "Scholarships", note: "Financial support for academically strong students from marginalized families." },
  { code: "PROG-08", name: "Monitoring and evaluation", note: "Monitoring attendance, retention, classroom quality, teacher performance and school facilities." },
];

export const PIPELINE: { code: string; name: string; note: string }[] = [
  { code: "PIPE-01", name: "Education: inclusion, innovation and impact", note: "Equitable access, innovative education delivery and measurable learning outcomes." },
  { code: "PIPE-02", name: "Quality education and school improvement", note: "Public-school improvement, foundational learning and non-formal education." },
  { code: "PIPE-03", name: "Girls’ education and inclusion", note: "Girls’ retention, gender equality, child rights and safeguarding." },
  { code: "PIPE-04", name: "PEN Academy and digital learning", note: "Digital learning resources, e-learning and educational technology." },
  { code: "PIPE-05", name: "Teacher and school development", note: "Teacher training, school leadership, institutional strengthening and facilities." },
  { code: "PIPE-06", name: "Research, monitoring and impact", note: "Education research, assessments, M&E, dashboards and results reporting." },
  { code: "PIPE-07", name: "Partnerships and resource mobilization", note: "Donor partnerships, consortium opportunities, grant applications and technical collaboration." },
];

export const CROSS_CUTTING: { code: string; name: string }[] = [
  { code: "CROSS-01", name: "Child safeguarding and PSEA" },
  { code: "CROSS-02", name: "Gender equality and social inclusion" },
  { code: "CROSS-03", name: "Disability inclusion and accessibility" },
  { code: "CROSS-04", name: "Climate resilience and disaster risk reduction" },
  { code: "CROSS-05", name: "Community participation" },
  { code: "CROSS-06", name: "Evidence-based programming and accountability" },
];

export const SDGS: { code: string; name: string }[] = [
  { code: "SDG-04", name: "Quality education" },
  { code: "SDG-05", name: "Gender equality" },
  { code: "SDG-03", name: "Good health and well-being" },
  { code: "SDG-08", name: "Decent work and economic growth" },
  { code: "SDG-09", name: "Industry, innovation and infrastructure" },
  { code: "SDG-10", name: "Reduced inequalities" },
  { code: "SDG-16", name: "Peace, justice and strong institutions" },
  { code: "SDG-17", name: "Partnerships for the goals" },
  { code: "SDG-06", name: "Clean water and sanitation" },
  { code: "SDG-13", name: "Climate action" },
];

export const RUNNERS: { code: string; title: string; sdgs: string }[] = [
  { code: "RUN-01", title: "Quality education and school improvement", sdgs: "SDG 4, SDG 10" },
  { code: "RUN-02", title: "Girls’ education and child protection", sdgs: "SDG 5, SDG 3, SDG 16" },
  { code: "RUN-03", title: "Digital learning — PEN Academy", sdgs: "SDG 4, SDG 9" },
  { code: "RUN-04", title: "Teacher development and institutional strengthening", sdgs: "SDG 4, SDG 8, SDG 16" },
  { code: "RUN-05", title: "Inclusive education and community engagement", sdgs: "SDG 4, SDG 5, SDG 10, SDG 17" },
];

export const PLACES: { province: string; district: string }[] = [
  { province: "Punjab", district: "Lahore" },
  { province: "Punjab", district: "Multan" },
  { province: "Punjab", district: "Muzaffargarh" },
  { province: "Punjab", district: "Narowal" },
  { province: "Punjab", district: "Rahim Yar Khan" },
  { province: "Punjab", district: "Gujrat" },
  { province: "Punjab", district: "Khanewal" },
  { province: "Punjab", district: "Bahawalpur" },
  { province: "Khyber Pakhtunkhwa", district: "Peshawar" },
  { province: "Khyber Pakhtunkhwa", district: "Swat" },
  { province: "Khyber Pakhtunkhwa", district: "Mardan" },
  { province: "Merged Districts", district: "Khyber" },
  { province: "Merged Districts", district: "Bajaur" },
  { province: "Gilgit-Baltistan", district: "Gilgit" },
  { province: "Gilgit-Baltistan", district: "Skardu" },
];

export const COLORS = ["#0e6b57", "#c24d2c", "#2a527a", "#c9922a", "#6b4c9a", "#3d7a4a", "#b86b4a", "#4d6d7a", "#8a5a44", "#1f7a8c"];

export function colorFor(index: number): string {
  return COLORS[index % COLORS.length];
}

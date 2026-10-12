const samples = [
  { label: "English", text: "Hello, I need some help." },
  { label: "اردو", text: "السلام علیکم، مجھے مدد چاہیے۔" },
  { label: "العربية", text: "مرحباً، أحتاج إلى مساعدة." },
];

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }
  res.status(200).json({ samples });
}

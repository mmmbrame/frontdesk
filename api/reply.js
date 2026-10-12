import { generateText } from "ai";
import { EdgeTTS } from "edge-tts-universal";

const MODEL = "google/gemini-3.5-flash";

const VOICES = {
  "en:us:female": "en-US-JennyNeural",
  "en:us:male": "en-US-GuyNeural",
  "en:gb:female": "en-GB-SoniaNeural",
  "en:gb:male": "en-GB-RyanNeural",
  "en:in:female": "en-IN-NeerjaNeural",
  "en:in:male": "en-IN-PrabhatNeural",
  "ur:pk:female": "ur-PK-UzmaNeural",
  "ur:pk:male": "ur-PK-AsadNeural",
  "ar:sa:female": "ar-SA-ZariyahNeural",
  "ar:sa:male": "ar-SA-HamedNeural",
  "ar:ae:female": "ar-AE-FatimaNeural",
  "ar:ae:male": "ar-AE-HamdanNeural",
  "ar:eg:female": "ar-EG-SalmaNeural",
  "ar:eg:male": "ar-EG-ShakirNeural",
  "ar:lb:female": "ar-LB-LaylaNeural",
  "ar:lb:male": "ar-LB-RamiNeural",
};

const VOICE_LABELS = {
  "en-US-JennyNeural": "American English, female",
  "en-US-GuyNeural": "American English, male",
  "en-GB-SoniaNeural": "British English, female",
  "en-GB-RyanNeural": "British English, male",
  "en-IN-NeerjaNeural": "South Asian English, female",
  "en-IN-PrabhatNeural": "South Asian English, male",
  "ur-PK-UzmaNeural": "Pakistani Urdu, female",
  "ur-PK-AsadNeural": "Pakistani Urdu, male",
  "ar-SA-ZariyahNeural": "Saudi Arabic, female",
  "ar-SA-HamedNeural": "Saudi Arabic, male",
  "ar-AE-FatimaNeural": "Emirati Arabic, female",
  "ar-AE-HamdanNeural": "Emirati Arabic, male",
  "ar-EG-SalmaNeural": "Egyptian Arabic, female",
  "ar-EG-ShakirNeural": "Egyptian Arabic, male",
  "ar-LB-LaylaNeural": "Lebanese Arabic, female",
  "ar-LB-RamiNeural": "Lebanese Arabic, male",
};

const ACCENTS = {
  en: new Set(["us", "gb", "in"]),
  ur: new Set(["pk"]),
  ar: new Set(["sa", "ae", "eg", "lb"]),
};

const DEFAULT_ACCENT = { en: "us", ur: "pk", ar: "sa" };
const JOBS = ["answer", "book", "remind", "review", "recover"];
const URDU_MARKS = /[ٹڈڑںےھ]/;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const message = String(payload.message || "").trim();
    if (!message) {
      res.status(400).json({ error: "Message is empty." });
      return;
    }

    const business = cleanBusiness(payload.business || {});
    const jobs = (Array.isArray(payload.jobs) ? payload.jobs : []).filter((job) => JOBS.includes(job));
    const allowed = jobs.length ? jobs : ["answer"];
    const gender = payload.gender === "male" ? "male" : "female";
    const locked = ["en", "ur", "ar"].includes(payload.language) ? payload.language : "auto";
    const channel = ["phone", "whatsapp", "sms", "email", "web"].includes(payload.channel)
      ? payload.channel
      : "whatsapp";
    const language = locked === "auto" ? detect(message) : locked;
    const accent = accentFor(language, payload.accents || {});
    const voice = VOICES[`${language}:${accent}:${gender}`];
    const history = sanitizeHistory(payload.history);

    const generated = await generateText({
      model: MODEL,
      messages: [
        { role: "system", content: instructions({ business, allowed, language, channel, voice }) },
        ...history,
        { role: "user", content: message.slice(0, 2000) },
      ],
    });

    const { text, outcome } = splitOutcome(generated.text);
    const spoken = text || fallback(language);
    const result = {
      text: spoken,
      subject: channel === "email" ? emailSubject(business.name, language) : null,
      language,
      accent,
      voice,
      voiceLabel: VOICE_LABELS[voice],
      outcome,
      dir: language === "en" ? "ltr" : "rtl",
      audio: null,
    };

    if (payload.speak !== false) {
      try {
        const rate = channel === "phone" ? "-8%" : "+0%";
        const tts = new EdgeTTS(spoken, voice, { rate });
        const { audio } = await tts.synthesize();
        result.audio = Buffer.from(await audio.arrayBuffer()).toString("base64");
      } catch (error) {
        result.audioError = error instanceof Error ? error.message : "Voice unavailable.";
      }
    }

    res.status(200).json(result);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "The desk could not reply.";
    res.status(500).json({ error: detail });
  }
}

function instructions({ business, allowed, language, channel, voice }) {
  const languageRule =
    language === "en"
      ? "Reply only in spoken English."
      : language === "ur"
        ? "Reply only in standard Urdu, using Urdu script."
        : "Reply only in Modern Standard Arabic. The accent is in the voice, so do not write dialect spellings.";
  const length = channel === "sms" ? "Use one or two short sentences." : "Use two to four sentences.";
  return [
    `You are the front desk for ${business.name}, at ${business.location}.`,
    `Hours: ${business.hours}. Services: ${business.services}.`,
    "Hold a normal conversation. Answer general questions as well as questions about this business.",
    languageRule,
    `The voice that will speak your reply is ${VOICE_LABELS[voice]}. Write standard language, not a phonetic accent.`,
    length,
    "No markdown, lists, or emoji.",
    "Use the business facts only when the customer asks about the business. Do not invent prices, staff names, or appointment times.",
    `You may do these jobs: ${allowed.join(", ")}.`,
    "If the customer asks for a job that is not in that list, say that task is turned off.",
    "When you actually confirm a booking, a reminder, or a collected review, end with exactly one of these tags: [[outcome:booked]] [[outcome:reminded]] [[outcome:reviewed]]. Otherwise include no tag.",
  ].join(" ");
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((turn) => turn && (turn.role === "user" || turn.role === "assistant"))
    .slice(-12)
    .map((turn) => ({ role: turn.role, content: String(turn.content || "").slice(0, 2000) }));
}

function detect(text) {
  if (URDU_MARKS.test(text)) return "ur";
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  return "en";
}

function accentFor(language, accents) {
  const choice = String(accents[language] || DEFAULT_ACCENT[language]);
  return ACCENTS[language].has(choice) ? choice : DEFAULT_ACCENT[language];
}

function splitOutcome(raw) {
  const match = String(raw || "").match(/\[\[outcome:(booked|reminded|reviewed)\]\]/);
  const text = String(raw || "")
    .replace(/\[\[outcome:(booked|reminded|reviewed)\]\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return { text, outcome: match ? match[1] : null };
}

function emailSubject(name, language) {
  if (language === "ur") return `${name} کی طرف سے پیغام`;
  if (language === "ar") return `رسالة من ${name}`;
  return `Message from ${name}`;
}

function fallback(language) {
  if (language === "ur") return "براہ کرم اسے دوبارہ کہیے؟";
  if (language === "ar") return "هل يمكنكم قول ذلك بطريقة أخرى؟";
  return "Could you say that another way?";
}

function cleanBusiness(raw) {
  const text = (key, fallbackValue) => String(raw[key] || "").trim().slice(0, 180) || fallbackValue;
  return {
    name: text("name", "Sysmatixx"),
    location: text("location", "27 K Model Town Lahore"),
    hours: text("hours", "Mon–Sat 10am–7pm"),
    services: text("services", "game consultations, estimates, and social media planning"),
  };
}

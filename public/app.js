const thread = document.querySelector("#thread");
const message = document.querySelector("#message");
const send = document.querySelector("#send");
const player = document.querySelector("#player");
const hubName = document.querySelector("#hub-name");
const hubStatus = document.querySelector("#hub-status");
const channelLabel = document.querySelector("#channel-label");

const counts = { booked: 0, reminded: 0, reviewed: 0 };
let history = [];
let channel = "phone";
let audioUrl = "";

function selectedJobs() {
  return [...document.querySelectorAll(".jobs input:checked")].map((input) => input.value);
}

function business() {
  return {
    name: document.querySelector("#biz-name").value.trim(),
    location: document.querySelector("#biz-location").value.trim(),
    hours: document.querySelector("#biz-hours").value.trim(),
    services: document.querySelector("#biz-services").value.trim(),
  };
}

function paintHub() {
  hubName.textContent = (business().name || "Front desk").toUpperCase();
}

document.querySelector("#biz-name").addEventListener("input", paintHub);
paintHub();

document.querySelector("#channels").addEventListener("click", (event) => {
  const button = event.target.closest(".channel");
  if (!button) return;
  channel = button.dataset.channel;
  document.querySelectorAll(".channel").forEach((item) => item.classList.toggle("active", item === button));
  channelLabel.textContent = button.textContent.trim();
  message.placeholder = channel === "email" ? "What the email says" : `What the customer says on ${channelLabel.textContent}`;
});

document.querySelector("#reset").addEventListener("click", () => {
  history = [];
  thread.replaceChildren();
  hubStatus.textContent = "READY";
  player.pause();
});

document.querySelector("#composer").addEventListener("submit", (event) => {
  event.preventDefault();
  submit(message.value);
});

async function loadSamples() {
  const response = await fetch("/api/meta");
  const meta = await response.json();
  const box = document.querySelector("#samples");
  meta.samples.forEach((sample) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = sample.label;
    button.addEventListener("click", () => submit(sample.text));
    box.appendChild(button);
  });
}

async function submit(text) {
  const trimmed = text.trim();
  if (!trimmed || send.disabled) return;
  message.value = "";
  addBubble(trimmed, "user", "ltr");
  send.disabled = true;
  hubStatus.textContent = "LISTENING";
  const prior = history.slice(-12);
  history.push({ role: "user", content: trimmed });
  try {
    const response = await fetch("/api/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: trimmed,
        history: prior,
        channel,
        language: document.querySelector("#language").value,
        accents: {
          en: document.querySelector("#accent-en").value,
          ur: document.querySelector("#accent-ur").value,
          ar: document.querySelector("#accent-ar").value,
        },
        gender: document.querySelector("#gender").value,
        jobs: selectedJobs(),
        business: business(),
        speak: document.querySelector("#speak").checked,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The desk could not reply.");
    history.push({ role: "assistant", content: data.text });
    addBubble(data.text, "bot", data.dir, data);
    if (data.outcome && counts[data.outcome] !== undefined) {
      counts[data.outcome] += 1;
      document.querySelector(`#count-${data.outcome}`).textContent = String(counts[data.outcome]);
      document.querySelector(`#pill-${data.outcome}`).classList.add("on");
      hubStatus.textContent = data.outcome.toUpperCase();
    } else {
      hubStatus.textContent = "READY";
    }
    if (data.audio) await play(data.audio);
  } catch (error) {
    history.pop();
    addBubble(error.message, "bot", "ltr");
    hubStatus.textContent = "READY";
  } finally {
    send.disabled = false;
    message.focus();
  }
}

function addBubble(text, who, dir, data) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${who}${dir === "rtl" ? " rtl" : ""}`;
  if (data && data.subject) {
    const subject = document.createElement("div");
    subject.className = "subject";
    subject.textContent = data.subject;
    bubble.appendChild(subject);
  }
  bubble.appendChild(document.createTextNode(text));
  if (data && data.voiceLabel) {
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = data.voiceLabel + (data.audioError ? " · voice unavailable" : "");
    bubble.appendChild(meta);
  }
  thread.appendChild(bubble);
  thread.scrollTop = thread.scrollHeight;
}

async function play(base64) {
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  audioUrl = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
  player.src = audioUrl;
  hubStatus.textContent = "SPEAKING";
  try {
    await player.play();
  } catch {
    hubStatus.textContent = "READY";
  }
}

player.addEventListener("ended", () => {
  if (hubStatus.textContent === "SPEAKING") hubStatus.textContent = "READY";
});

loadSamples();

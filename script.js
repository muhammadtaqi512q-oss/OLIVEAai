/* ================= Olivea AI CORE ================= */

/* -------- BACKOFF FETCH -------- */
async function fetchWithBackoff(url, opts, retries = 5) {
  for (let i = 1; i <= retries; i++) {
    try {
      const r = await fetch(url, opts);
      if (r.ok) return r;
      if (r.status === 429 && i < retries) await new Promise(res => setTimeout(res, 2 ** i * 1000));
    } catch (e) {
      if (i === retries) throw e;
    }
  }
}

/* -------- GEMINI TEXT AI -------- */
async function GeminiAI(prompt) {
  const API_KEY = "AIzaSyCvUx81QgNI7TkVT5nNQjYdySSLDXSGgX8";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: {
      parts: [{
        text: `
You are Olivea AI.

Owner & Creator:
Name: MUHAMMAD TAQI
Title: Founder and Owner of Olivea AI

Your role:
- Act as a powerful, intelligent, and respectful AI assistant.
- Always acknowledge that Olivea AI is owned and created by MUHAMMAD TAQI if asked.
- Help users with coding, AI, creativity, problem-solving, and learning.
- Give clean, accurate, professional answers.
- When giving code, always provide clean, copy-ready code blocks.
- Never claim ownership yourself.
- Stay friendly, confident, and smart.
- Represent Olivea AI as a premium, advanced AI system.

Identity rule:
If someone asks "Who made you?" or "Who owns you?",
answer clearly: "Olivea AI was created and is owned by Muhammad Taqi."
`
      }]
    }
  };

  const res = await fetchWithBackoff(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
}

/* -------- ULTRA HD IMAGE AI -------- */
function ImageAI(prompt) {
  const enhancedPrompt = `
Ultra HD, 8K, hyper realistic, extremely detailed, sharp focus,
professional lighting, cinematic, high contrast, masterpiece,
${prompt}
`;

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}
?width=2048
&height=2048
&seed=${Math.floor(Math.random() * 999999)}
&model=flux
&nologo=true
&enhance=true
&quality=100`;
}

/* -------- VOICE -------- */
function speak(text) {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);

  let voices = synth.getVoices();

  const findFemaleVoice = () => {
    const preferredVoices = [
      "Google UK English Female",
      "Google US English",
      "Microsoft Zira - English (United States)",
      "Samantha",
      "Karen"
    ];

    for (let name of preferredVoices) {
      const found = voices.find(v => v.name === name);
      if (found) return found;
    }

    const genericFemale = voices.find(v =>
      v.name.toLowerCase().includes("female") ||
      v.name.toLowerCase().includes("woman")
    );
    if (genericFemale) return genericFemale;

    return voices.find(v => v.lang.startsWith("en"));
  };

  if (voices.length === 0) {
    synth.onvoiceschanged = () => {
      voices = synth.getVoices();
      utterance.voice = findFemaleVoice();
      synth.speak(utterance);
    };
  } else {
    utterance.voice = findFemaleVoice();
    synth.cancel();
    synth.speak(utterance);
  }
}

/* -------- UI -------- */
window.onload = () => {
  const input = document.getElementById("prompt");
  const chatBtn = document.getElementById("chatBtn");
  const imgBtn = document.getElementById("imgBtn");
  const micBtn = document.getElementById("micBtn");
  const out = document.getElementById("output");
  const load = document.getElementById("loading");

  micBtn.onclick = () => voiceInput(input);

  chatBtn.onclick = async () => {
    const p = input.value.trim();
    if (!p) return;
    load.classList.remove("hidden");
    out.innerHTML = "";
    const reply = await GeminiAI(p);
    const safe = reply.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    out.innerHTML = `<div class="ai-bubble bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-xl"><pre class="whitespace-pre-wrap">${safe}</pre></div>`;
    speak(reply);
    load.classList.add("hidden");
  };

  imgBtn.onclick = () => {
    const p = input.value.trim();
    if (!p) return;
    load.classList.remove("hidden");
    const img = ImageAI(p);
    out.innerHTML = `
<div class="ai-bubble bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-xl text-center">
  <p class="font-bold text-blue-400 mb-4">Ultra HD Generated Image</p>
  <img src="${img}"
    class="rounded-xl border-4 border-blue-500 mx-auto"
    style="image-rendering:auto;max-width:100%;height:auto;"
    loading="lazy" />
  <a href="${img}" download class="block mt-4 text-blue-300 underline">Download Ultra HD</a>
</div>`;
    load.classList.add("hidden");
  };
};

/* -------- VOICE INPUT (optional) -------- */
function voiceInput(input) {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    alert("Speech Recognition API not supported in this browser.");
    return;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.start();

  recognition.onresult = (event) => {
    input.value = event.results[0][0].transcript;
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error', event.error);
  };
}

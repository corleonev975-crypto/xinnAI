function detectMode(message = "", image = null) {
  if (image) return "vision";

  const text = String(message).toLowerCase();
  const codingKeywords = [
    "script", "coding", "code", "html", "css", "js", "javascript",
    "typescript", "react", "nextjs", "next.js", "api", "bug", "error",
    "fix", "debug", "website", "web", "landing page", "portfolio",
    "portofolio", "login", "dashboard", "database", "sql", "php", "python"
  ];

  return codingKeywords.some((keyword) => text.includes(keyword)) ? "coding" : "chat";
}

function buildSystemPrompt(mode) {
  if (mode === "coding") {
    return `
Kamu adalah Xinn AI, asisten coding yang jago membuat website, script, debugging, dan revisi kode.
Jawab dalam Bahasa Indonesia.
Kalau user minta coding, fokus ke hasil siap pakai.
Kalau perlu beberapa file, pisahkan jelas per file.
Jangan terlalu banyak teori.
`;
  }

  if (mode === "vision") {
    return `
Kamu adalah Xinn AI Vision.
Jawab dalam Bahasa Indonesia.
Analisis gambar dengan jelas, jujur, dan natural.
Kalau gambar kurang jelas, bilang dengan jujur.
`;
  }

  return `
Kamu adalah Xinn AI.
Jawab dalam Bahasa Indonesia dengan gaya natural, santai, pintar, seperti ChatGPT.
Bisa membahas semua topik.
Jangan kaku.
`;
}

function buildMessages({ mode, message, history = [], image = null }) {
  const base = [
    {
      role: "system",
      content: buildSystemPrompt(mode)
    }
  ];

  if (mode === "vision") {
    return [
      ...base,
      ...history,
      {
        role: "user",
        content: [
          {
            type: "text",
            text: String(message || "Jelaskan gambar ini.")
          },
          {
            type: "image_url",
            image_url: { url: image }
          }
        ]
      }
    ];
  }

  return [
    ...base,
    ...history,
    {
      role: "user",
      content: String(message).trim()
    }
  ];
}

function buildModelConfig(mode) {
  if (mode === "vision") {
    return {
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0.4,
      max_completion_tokens: 1000
    };
  }

  if (mode === "coding") {
    return {
      model: "llama-3.3-70b-versatile",
      temperature: 0.35,
      max_tokens: 1400
    };
  }

  return {
    model: "llama-3.3-70b-versatile",
    temperature: 0.6,
    max_tokens: 900
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, history = [], image = null } = req.body || {};

    if ((!message || !String(message).trim()) && !image) {
      return res.status(400).json({ reply: "Pesan kosong" });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ reply: "GROQ_API_KEY belum diatur." });
    }

    const mode = detectMode(message, image);
    const messages = buildMessages({ mode, message, history, image });
    const modelConfig = buildModelConfig(mode);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...modelConfig,
        messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        reply: data?.error?.message || "Server error / API bermasalah",
        mode
      });
    }

    const reply = data?.choices?.[0]?.message?.content || "No response";

    return res.status(200).json({ reply, mode });
  } catch (error) {
    return res.status(500).json({ reply: "Server offline / error" });
  }
}

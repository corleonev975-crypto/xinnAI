const chatBox = document.querySelector(".chat-box");
const input = document.querySelector("input");
const sendBtn = document.querySelector(".send-btn");

function addMessage(text, type = "bot") {
  const div = document.createElement("div");
  div.className = "msg " + type;
  div.innerText = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, "user");
  input.value = "";

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: text })
    });

    const data = await res.json();
    addMessage(data.reply || "Error response", "bot");

  } catch (err) {
    addMessage("❌ API error / koneksi gagal", "bot");
    console.error(err);
  }
}

sendBtn.onclick = sendMessage;
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

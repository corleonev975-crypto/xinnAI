const STORAGE_KEY = "xinn_ai_full_app_v1";
const sidebar = document.getElementById("sidebar");
const openSidebar = document.getElementById("openSidebar");
const closeSidebar = document.getElementById("closeSidebar");
const overlay = document.getElementById("overlay");
const plusBtn = document.getElementById("plusBtn");
const plusMenu = document.getElementById("plusMenu");
const statusBtn = document.getElementById("statusBtn");
const statusCard = document.getElementById("statusCard");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const hero = document.getElementById("hero");
const chatArea = document.getElementById("chatArea");
const messagesEl = document.getElementById("messages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const historyList = document.getElementById("historyList");
const historySearch = document.getElementById("historySearch");
const fileInput = document.getElementById("fileInput");
const cameraInput = document.getElementById("cameraInput");
const fileBtn = document.getElementById("fileBtn");
const cameraBtn = document.getElementById("cameraBtn");
const galleryBtn = document.getElementById("galleryBtn");
const micBtn = document.getElementById("micBtn");

let chats = loadChats();
let currentChatId = chats[0]?.id || null;
let pendingImage = null;
let recognition = null;
let isRecording = false;

if (micBtn) {
  micBtn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"></path><path d="M19 11a7 7 0 0 1-14 0"></path><path d="M12 18v3"></path><path d="M8 21h8"></path></svg>`;
}

openSidebar.addEventListener("click", () => { sidebar.classList.add("open"); overlay.classList.add("show"); });
closeSidebar.addEventListener("click", closeSide);
overlay.addEventListener("click", closeSide);
function closeSide(){ sidebar.classList.remove("open"); overlay.classList.remove("show"); }

plusBtn.addEventListener("click", (e) => { e.stopPropagation(); plusMenu.classList.toggle("show"); statusCard.classList.remove("show"); });
statusBtn.addEventListener("click", (e) => { e.stopPropagation(); statusCard.classList.toggle("show"); plusMenu.classList.remove("show"); });
document.addEventListener("click", () => { plusMenu.classList.remove("show"); statusCard.classList.remove("show"); });
fileBtn.addEventListener("click", () => { plusMenu.classList.remove("show"); fileInput.click(); });
galleryBtn.addEventListener("click", () => { plusMenu.classList.remove("show"); fileInput.click(); });
cameraBtn.addEventListener("click", () => { plusMenu.classList.remove("show"); cameraInput.click(); });
fileInput.addEventListener("change", handleSelectedFile);
cameraInput.addEventListener("change", handleSelectedFile);
sendBtn.addEventListener("click", sendMessage);
chatInput.addEventListener("keydown", (e)=>{ if(e.key === "Enter"){ e.preventDefault(); sendMessage(); } });
chatInput.addEventListener("input", updateSendButtonState);
chatInput.addEventListener("focus", ()=> setTimeout(scrollBottom, 350));
window.addEventListener("resize", ()=> setTimeout(scrollBottom,100));
newChatBtn.addEventListener("click", ()=>{ createNewChat(); clearPendingImage(); updateSendButtonState(); closeSide(); });
historySearch.addEventListener("input", renderHistory);
if (micBtn) micBtn.addEventListener("click", toggleVoiceInput);

function loadChats(){ try{ const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; }catch{return [];} }
function saveChats(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(chats)); }
function createNewChat(){ const chat = { id: crypto.randomUUID(), title: "Chat baru", messages: [] }; chats.unshift(chat); currentChatId = chat.id; saveChats(); renderHistory(); renderCurrentChat(); }
function getCurrentChat(){ return chats.find(c=>c.id===currentChatId) || null; }

function renderHistory(){
  const keyword = historySearch.value.trim().toLowerCase();
  historyList.innerHTML = "";
  const filtered = chats.filter(chat => chat.title.toLowerCase().includes(keyword));
  if(!filtered.length){ historyList.innerHTML = `<div class="history-empty">Belum ada riwayat chat.</div>`; return; }
  filtered.forEach(chat => {
    const btn = document.createElement("button");
    btn.className = "history-card" + (chat.id === currentChatId ? " active" : "");
    btn.textContent = chat.title;
    btn.onclick = ()=>{ currentChatId = chat.id; clearPendingImage(); renderHistory(); renderCurrentChat(); updateSendButtonState(); closeSide(); };
    historyList.appendChild(btn);
  });
}

function renderCurrentChat(){
  const chat = getCurrentChat();
  messagesEl.innerHTML = "";
  if(!chat || !chat.messages.length){ hero.classList.remove("hidden"); chatArea.classList.remove("active"); }
  else {
    hero.classList.add("hidden"); chatArea.classList.add("active");
    chat.messages.forEach(msg => messagesEl.appendChild(createMessageElement(msg)));
  }
  renderPendingImagePreview();
  scrollBottom();
  updateSendButtonState();
}

function createMessageElement(msg){
  const el = document.createElement("div");
  el.className = `msg ${msg.role}`;
  if(msg.type === "image"){
    el.classList.add("without-copy");
    el.style.padding = "10px";
    el.innerHTML = `<div class="image-preview-wrap"><span class="vision-badge">Vision</span><img src="${msg.image}" alt="preview"></div>`;
    return el;
  }
  if(msg.type === "hint"){
    el.classList.add("image-hint", "without-copy");
    el.innerHTML = `<div class="image-hint-title">Gambar siap dikirim ✨</div><div class="image-hint-sub">Tambahkan pertanyaan, atau langsung tekan kirim untuk analisis.</div>`;
    return el;
  }
  if(msg.role === "ai"){
    const needsCopy = shouldShowCopyAll(msg.text);
    if(needsCopy){
      el.classList.add("has-top-actions");
      const top = document.createElement("div");
      top.className = "msg-top-actions";
      const copyBtn = document.createElement("button");
      copyBtn.className = "copy-btn";
      copyBtn.dataset.label = "Salin Semua";
      copyBtn.textContent = "Salin Semua";
      copyBtn.addEventListener("click", ()=>copyText(msg.text, copyBtn));
      top.appendChild(copyBtn);
      el.appendChild(top);
    }
    const content = document.createElement("div");
    content.className = "msg-content";
    content.innerHTML = renderMarkdown(msg.text);
    el.appendChild(content);
    enhanceCodeBlocks(el);
    return el;
  }
  el.textContent = msg.text;
  return el;
}

function renderPendingImagePreview(){
  removePendingPreviewElements();
  if(!pendingImage) return;
  hero.classList.add("hidden");
  chatArea.classList.add("active");
  const previewWrap = document.createElement("div");
  previewWrap.className = "msg user without-copy";
  previewWrap.style.padding = "10px";
  previewWrap.dataset.pendingPreview = "true";
  previewWrap.innerHTML = `<div class="image-preview-wrap"><span class="vision-badge">Vision</span><button type="button" class="remove-image-btn" data-remove-image="true">×</button><img src="${pendingImage}" alt="preview"></div>`;
  const hintWrap = document.createElement("div");
  hintWrap.className = "msg ai image-hint without-copy";
  hintWrap.dataset.pendingHint = "true";
  hintWrap.innerHTML = `<div class="image-hint-title">Gambar siap dikirim ✨</div><div class="image-hint-sub">Tambahkan pertanyaan, tekan kirim untuk analisis, atau hapus gambar dulu.</div>`;
  messagesEl.appendChild(previewWrap);
  messagesEl.appendChild(hintWrap);
  previewWrap.querySelector('[data-remove-image="true"]').addEventListener("click", clearPendingImage);
}
function removePendingPreviewElements(){ messagesEl.querySelectorAll("[data-pending-preview='true'], [data-pending-hint='true']").forEach(el=>el.remove()); }
function clearPendingImage(){ pendingImage = null; removePendingPreviewElements(); const chat = getCurrentChat(); if((!chat || !chat.messages.length) && !chatInput.value.trim()){ hero.classList.remove("hidden"); chatArea.classList.remove("active"); } updateSendButtonState(); }

async function sendMessage(){
  const text = chatInput.value.trim();
  if(!text && !pendingImage) return;
  if(!currentChatId) createNewChat();
  const chat = getCurrentChat();
  if(!chat.messages.length) chat.title = makeTitle(text || "Analisis gambar");
  hero.classList.add("hidden"); chatArea.classList.add("active");
  if(pendingImage){ chat.messages.push({ role:"user", type:"image", image:pendingImage }); }
  if(text){ chat.messages.push({ role:"user", text, type:"text" }); }
  const imageToSend = pendingImage;
  pendingImage = null;
  saveChats(); renderHistory(); renderCurrentChat();
  chatInput.value = ""; updateSendButtonState();
  const typing = document.createElement("div");
  typing.className = "msg ai without-copy";
  typing.innerHTML = imageToSend ? `Menganalisis gambar...` : `<div class="typing"><span></span><span></span><span></span></div>`;
  messagesEl.appendChild(typing); scrollBottom();
  try{
    const history = chat.messages.filter(m=>m.type === "text").slice(-10).map(m=>({ role: m.role === "user" ? "user" : "assistant", content: m.text }));
    const payload = { message: text || "Jelaskan gambar ini.", history };
    if(imageToSend) payload.image = imageToSend;
    const res = await fetch("/api/chat", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
    const data = await res.json();
    typing.remove();
    chat.messages.push({ role:"ai", text:data.reply || "No response", type:"text" });
    saveChats(); renderHistory(); renderCurrentChat(); setOnline(true);
  }catch{
    typing.remove();
    chat.messages.push({ role:"ai", text:"Server offline / API error", type:"text" });
    saveChats(); renderHistory(); renderCurrentChat(); setOnline(false);
  }
}

function shouldShowCopyAll(text){ const value = String(text || "").trim(); return value.includes("```") || value.length > 220 || /file:\s|index\.html|style\.css|script\.js/i.test(value); }
function renderMarkdown(text){
  const escaped = escapeHtml(text);
  const withBlocks = escaped.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code)=>{
    const safeLang = lang ? lang.toLowerCase() : detectLanguageFromCode(code);
    return `<div class="code-block"><div class="code-block-top"><div class="code-lang">${safeLang}</div><button class="copy-btn code-copy-btn" data-copy-code="${encodeURIComponent(code.trim())}">Salin Kode</button></div><pre><code>${code.trim()}</code></pre></div>`;
  });
  const withInline = withBlocks.replace(/`([^`]+)`/g, "<code style='display:inline;background:rgba(255,255,255,.06);padding:2px 6px;border-radius:6px;'>$1</code>");
  return withInline.split(/\n{2,}/).map(p => p.startsWith("<div class=\"code-block\"") ? p : `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
}
function enhanceCodeBlocks(scope){ scope.querySelectorAll("[data-copy-code]").forEach(btn=>{ if(btn.dataset.bound === "true") return; btn.dataset.bound = "true"; btn.addEventListener("click", ()=> copyText(decodeURIComponent(btn.dataset.copyCode), btn)); }); }
function detectLanguageFromCode(code){ const value = String(code).trim(); if(/^<!DOCTYPE html>|<html|<head|<body|<div|<section/i.test(value)) return "html"; if(/:root|background:|display:\s*flex|@media|border-radius|color:/i.test(value)) return "css"; if(/const |let |function |=>|document\.|addEventListener|fetch\(/i.test(value)) return "javascript"; if(/export default|interface |type |: string|: number/i.test(value)) return "typescript"; if(/SELECT |INSERT INTO |UPDATE |DELETE FROM |CREATE TABLE/i.test(value)) return "sql"; if(/from flask|def |print\(|import os|if __name__/i.test(value)) return "python"; return "code"; }
function escapeHtml(str){ return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
async function copyText(text, button){ try{ await navigator.clipboard.writeText(text); button.textContent = "Tersalin"; button.classList.add("copied"); setTimeout(()=>{ button.textContent = button.dataset.label || "Salin Kode"; button.classList.remove("copied"); }, 1600);}catch{ button.textContent = "Gagal"; setTimeout(()=>{ button.textContent = button.dataset.label || "Salin Kode"; }, 1200);} }

function updateSendButtonState(){ const hasText = chatInput.value.trim().length > 0; const hasImage = !!pendingImage; if(hasText || hasImage) sendBtn.classList.add("active"); else sendBtn.classList.remove("active"); }
function scrollBottom(){ requestAnimationFrame(()=>{ chatArea.scrollTo({ top: chatArea.scrollHeight, behavior:"smooth" }); }); }
function setOnline(state){ statusDot.textContent = state ? "🟢" : "🔴"; statusText.textContent = state ? "Online" : "Offline"; }
async function checkAPI(){ try{ const res = await fetch("/api/chat", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ message:"ping" }) }); setOnline(res.ok);}catch{ setOnline(false);} }

async function handleSelectedFile(event){
  const file = event.target.files[0];
  if(!file) return;
  if(!currentChatId) createNewChat();
  if(file.type.startsWith("image/")){
    const base64 = await fileToBase64(file);
    if(!base64){ alert("Gagal membaca gambar."); event.target.value = ""; return; }
    if(base64.length > 4_000_000){ alert("Ukuran gambar terlalu besar. Coba gambar yang lebih kecil."); event.target.value = ""; return; }
    pendingImage = base64;
    hero.classList.add("hidden"); chatArea.classList.add("active"); renderCurrentChat();
  } else {
    alert("Saat ini mode Vision hanya untuk gambar.");
  }
  event.target.value = "";
}
function fileToBase64(file){ return new Promise((resolve)=>{ const reader = new FileReader(); reader.onload = ()=>resolve(reader.result); reader.onerror = ()=>resolve(null); reader.readAsDataURL(file); }); }
function makeTitle(text){ const clean = text.trim(); return clean.length > 26 ? clean.slice(0,26) + "..." : clean; }

function toggleVoiceInput(){
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition){ alert("Voice input belum didukung di browser ini."); return; }
  if(!recognition){
    recognition = new SpeechRecognition();
    recognition.lang = "id-ID";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => { const transcript = event.results[0][0].transcript || ""; chatInput.value = transcript; updateSendButtonState(); };
    recognition.onend = () => { isRecording = false; micBtn.style.color = "rgba(255,255,255,.72)"; };
    recognition.onerror = () => { isRecording = false; micBtn.style.color = "rgba(255,255,255,.72)"; };
  }
  if(isRecording){ recognition.stop(); isRecording = false; micBtn.style.color = "rgba(255,255,255,.72)"; }
  else { recognition.start(); isRecording = true; micBtn.style.color = "#fff"; }
}

if(!chats.length){ createNewChat(); const first = getCurrentChat(); if(first){ first.messages = []; saveChats(); } }
renderHistory(); renderCurrentChat(); checkAPI(); updateSendButtonState();

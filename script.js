const CONFIG = {
  storageKey: "lardesports-cordage-v2",
  cordeurPassword: "Badlab1996!",
  timePerRacketMinutes: 30,
  historyLimit: 20,
  supabaseUrl: "https://jbclmwoyrrvmtqagnati.supabase.co",
  supabaseAnonKey: "sb_publishable_T_XvMxifuWza8WZ-Kok1Jw_KX_v43go",
  useSupabase: false,
};

const state = {
  queue: [],
  history: [],
  adminUnlocked: false,
  supabaseReady: false,
};

const els = {
  form: document.getElementById("add-form"),
  playerName: document.getElementById("player-name"),
  racketName: document.getElementById("racket-name"),
  stringType: document.getElementById("string-type"),
  tension: document.getElementById("tension"),
  comment: document.getElementById("comment"),
  priority: document.getElementById("priority"),
  formMessage: document.getElementById("form-message"),
  queueList: document.getElementById("queue-list"),
  queueEmpty: document.getElementById("queue-empty"),
  queueCount: document.getElementById("queue-count"),
  cordeurBtn: document.getElementById("cordeur-btn"),
  cordeurPanel: document.getElementById("cordeur-panel"),
  cordeurList: document.getElementById("cordeur-list"),
  adminEmpty: document.getElementById("admin-empty"),
  historyList: document.getElementById("history-list"),
  historyEmpty: document.getElementById("history-empty"),
  statWaiting: document.getElementById("stat-waiting"),
  statDoneToday: document.getElementById("stat-done-today"),
  statDoneTotal: document.getElementById("stat-done-total"),
  statTopString: document.getElementById("stat-top-string"),
};

let supabaseClient = null;

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getStoredData() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (!raw) {
      return { queue: [], history: [] };
    }

    const parsed = JSON.parse(raw);
    return {
      queue: Array.isArray(parsed.queue) ? parsed.queue : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch (error) {
    console.error("Erreur lecture stockage local:", error);
    return { queue: [], history: [] };
  }
}

function saveStoredData() {
  localStorage.setItem(
    CONFIG.storageKey,
    JSON.stringify({
      queue: state.queue,
      history: state.history,
    })
  );
}

function setMessage(message, type = "success") {
  els.formMessage.textContent = message;
  els.formMessage.className = `form-message form-message--${type}`;
}

function clearMessage() {
  els.formMessage.textContent = "";
  els.formMessage.className = "form-message";
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTodayKey(dateString) {
  const date = new Date(dateString);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTodayKey() {
  return formatTodayKey(new Date().toISOString());
}

function getEstimatedMinutes(position) {
  return (position + 1) * CONFIG.timePerRacketMinutes;
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, "0")}`;
}

function normalizeQueueOrder() {
  state.queue.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority ? -1 : 1;
    if (a.status === "in_progress" && b.status !== "in_progress") return -1;
    if (a.status !== "in_progress" && b.status === "in_progress") return 1;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
}

function buildRacketFromForm() {
  const playerName = els.playerName.value.trim();
  const racketName = els.racketName.value.trim();
  const stringType = els.stringType.value.trim();
  const tension = Number(els.tension.value);
  const comment = els.comment.value.trim();
  const priority = els.priority.checked;

  if (!playerName || !racketName || !stringType || Number.isNaN(tension)) {
    throw new Error("Merci de remplir les champs obligatoires.");
  }

  return {
    id: generateId(),
    playerName,
    racketName,
    stringType,
    tension,
    comment,
    priority,
    status: "waiting",
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
  };
}

function resetForm() {
  els.form.reset();
  els.stringType.value = "BG65";
}

function renderQueue() {
  normalizeQueueOrder();
  els.queueCount.textContent = String(state.queue.length);
  els.queueEmpty.classList.toggle("hidden", state.queue.length > 0);

  if (state.queue.length === 0) {
    els.queueList.innerHTML = "";
    return;
  }

  els.queueList.innerHTML = state.queue
    .map((item, index) => {
      const eta = formatDuration(getEstimatedMinutes(index));
      const statusLabel = item.status === "in_progress" ? "En cours" : "En attente";
      const commentHtml = item.comment
        ? `<div class="comment-box">${escapeHtml(item.comment)}</div>`
        : "";

      return `
        <li class="queue-item">
          <div class="queue-item__top">
            <div class="name-block">
              <span class="player-name">${escapeHtml(item.playerName)}</span>
              <span class="racket-name">${escapeHtml(item.racketName)}</span>
            </div>
            <div class="eta">Attente estimée • ${eta}</div>
          </div>

          <div class="tags">
            <span class="tag">${escapeHtml(item.stringType)}</span>
            <span class="tag">${escapeHtml(item.tension)} kg</span>
            <span class="tag tag--status">${statusLabel}</span>
            ${item.priority ? '<span class="tag tag--priority">Priorité match</span>' : ""}
          </div>
          ${commentHtml}
        </li>
      `;
    })
    .join("");
}

function renderAdminList() {
  els.adminEmpty.classList.toggle("hidden", state.queue.length > 0);

  if (state.queue.length === 0) {
    els.cordeurList.innerHTML = "";
    return;
  }

  els.cordeurList.innerHTML = state.queue
    .map((item, index) => {
      const canStart = item.status === "waiting";
      const canDone = item.status === "in_progress" || item.status === "waiting";

      return `
        <li class="admin-item">
          <div class="admin-item__top">
            <div class="name-block">
              <span class="player-name">${escapeHtml(item.playerName)}</span>
              <span class="racket-name">${escapeHtml(item.racketName)}</span>
            </div>
            <div class="eta">#${index + 1}</div>
          </div>

          <div class="meta-line">
            <span class="tag">${escapeHtml(item.stringType)}</span>
            <span class="tag">${escapeHtml(item.tension)} kg</span>
            ${item.priority ? '<span class="tag tag--priority">Priorité match</span>' : ""}
            <span class="tag tag--status">${item.status === "in_progress" ? "En cours" : "En attente"}</span>
          </div>

          ${item.comment ? `<div class="comment-box">${escapeHtml(item.comment)}</div>` : ""}

          <div class="meta" style="margin-top:12px;">Ajoutée le ${formatDateTime(item.createdAt)}</div>

          <div class="action-row" style="margin-top:14px;">
            ${canStart ? `<button class="action-btn action-btn--start" data-action="start" data-id="${item.id}">Démarrer</button>` : ""}
            ${canDone ? `<button class="action-btn action-btn--done" data-action="done" data-id="${item.id}">Terminée</button>` : ""}
            <button class="action-btn action-btn--delete" data-action="delete" data-id="${item.id}">Supprimer</button>
          </div>
        </li>
      `;
    })
    .join("");
}

function renderHistory() {
  const history = [...state.history]
    .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))
    .slice(0, CONFIG.historyLimit);

  els.historyEmpty.classList.toggle("hidden", history.length > 0);

  if (history.length === 0) {
    els.historyList.innerHTML = "";
    return;
  }

  els.historyList.innerHTML = history
    .map(
      (item) => `
        <li class="history-item">
          <div class="history-item__top">
            <div class="name-block">
              <span class="player-name">${escapeHtml(item.playerName)}</span>
              <span class="racket-name">${escapeHtml(item.racketName)}</span>
            </div>
            <span class="tag tag--done">Terminée</span>
          </div>

          <div class="tags">
            <span class="tag">${escapeHtml(item.stringType)}</span>
            <span class="tag">${escapeHtml(item.tension)} kg</span>
          </div>

          <div class="meta" style="margin-top:12px;">
            Terminée le ${formatDateTime(item.completedAt || item.createdAt)}
          </div>
        </li>
      `
    )
    .join("");
}

function renderStats() {
  const doneToday = state.history.filter((item) => formatTodayKey(item.completedAt || item.createdAt) === getTodayKey()).length;
  const stringCounter = [...state.queue, ...state.history].reduce((acc, item) => {
    acc[item.stringType] = (acc[item.stringType] || 0) + 1;
    return acc;
  }, {});

  const topString = Object.entries(stringCounter).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  els.statWaiting.textContent = String(state.queue.length);
  els.statDoneToday.textContent = String(doneToday);
  els.statDoneTotal.textContent = String(state.history.length);
  els.statTopString.textContent = topString;
}

function renderAll() {
  renderQueue();
  renderAdminList();
  renderHistory();
  renderStats();
}

async function trySetupSupabase() {
  if (!CONFIG.useSupabase) return;
  if (!window.supabase || !CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) return;

  try {
    supabaseClient = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
    state.supabaseReady = true;
    await loadFromSupabase();
    subscribeToSupabase();
  } catch (error) {
    console.warn("Supabase indisponible, bascule en mode local.", error);
    state.supabaseReady = false;
  }
}

async function loadFromSupabase() {
  if (!state.supabaseReady) return;

  const { data, error } = await supabaseClient
    .from("stringing_queue")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("Lecture Supabase impossible, mode local conservé.", error.message);
    state.supabaseReady = false;
    return;
  }

  state.queue = data.filter((item) => item.status !== "done").map(mapSupabaseRowToItem);
  state.history = data.filter((item) => item.status === "done").map(mapSupabaseRowToItem);
  saveStoredData();
  renderAll();
}

function subscribeToSupabase() {
  if (!state.supabaseReady) return;

  supabaseClient
    .channel("lardesports-stringing-queue")
    .on("postgres_changes", { event: "*", schema: "public", table: "stringing_queue" }, async () => {
      await loadFromSupabase();
    })
    .subscribe();
}

function mapSupabaseRowToItem(row) {
  return {
    id: row.id,
    playerName: row.player_name,
    racketName: row.racket_name,
    stringType: row.string_type,
    tension: row.tension,
    comment: row.comment || "",
    priority: Boolean(row.priority),
    status: row.status,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

function mapItemToSupabaseRow(item) {
  return {
    id: item.id,
    player_name: item.playerName,
    racket_name: item.racketName,
    string_type: item.stringType,
    tension: item.tension,
    comment: item.comment,
    priority: item.priority,
    status: item.status,
    created_at: item.createdAt,
    started_at: item.startedAt,
    completed_at: item.completedAt,
  };
}

async function persistQueueItem(item) {
  if (!state.supabaseReady) return;
  const { error } = await supabaseClient.from("stringing_queue").upsert(mapItemToSupabaseRow(item));
  if (error) console.warn("Impossible de sauvegarder sur Supabase:", error.message);
}

async function addRacket(item) {
  state.queue.push(item);
  normalizeQueueOrder();
  saveStoredData();
  renderAll();
  await persistQueueItem(item);
}

async function updateItemStatus(id, action) {
  const index = state.queue.findIndex((item) => item.id === id);
  if (index === -1) return;

  const item = state.queue[index];

  if (action === "start") {
    item.status = "in_progress";
    item.startedAt = new Date().toISOString();
    normalizeQueueOrder();
    saveStoredData();
    renderAll();
    await persistQueueItem(item);
    return;
  }

  if (action === "done") {
    const completedItem = {
      ...item,
      status: "done",
      completedAt: new Date().toISOString(),
    };

    state.queue.splice(index, 1);
    state.history.unshift(completedItem);
    state.history = state.history.slice(0, 200);
    saveStoredData();
    renderAll();
    await persistQueueItem(completedItem);
    return;
  }

  if (action === "delete") {
    state.queue.splice(index, 1);
    saveStoredData();
    renderAll();

    if (state.supabaseReady) {
      const { error } = await supabaseClient.from("stringing_queue").delete().eq("id", id);
      if (error) console.warn("Suppression Supabase impossible:", error.message);
    }
  }
}

function unlockAdmin() {
  const password = window.prompt("Mot de passe cordeur :");
  if (password === null) return;

  if (password !== CONFIG.cordeurPassword) {
    window.alert("Mot de passe incorrect.");
    return;
  }

  state.adminUnlocked = true;
  els.cordeurPanel.classList.remove("hidden");
  els.cordeurBtn.textContent = "Espace ouvert";
  els.cordeurBtn.disabled = true;
}

function bindEvents() {
  els.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    try {
      const racket = buildRacketFromForm();
      await addRacket(racket);
      resetForm();
      setMessage("Raquette ajoutée avec succès à la file d’attente.", "success");
    } catch (error) {
      setMessage(error.message || "Une erreur est survenue.", "error");
    }
  });

  els.cordeurBtn.addEventListener("click", unlockAdmin);

  els.cordeurList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;
    await updateItemStatus(id, action);
  });
}

async function init() {
  const stored = getStoredData();
  state.queue = stored.queue;
  state.history = stored.history;

  normalizeQueueOrder();
  renderAll();
  bindEvents();
  await trySetupSupabase();
}

init();

const SUPABASE_URL = "https://jbclmwoyrrvmtqagnati.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_T_XvMxifuWza8WZ-Kok1Jw_KX_v43go";

const CORDEUR_PASSWORD = "Badlab1996!";
const TIME_PER_RACKET = 30;

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById("add-form");
const playerNameInput = document.getElementById("player-name");
const racketNameInput = document.getElementById("racket-name");
const stringTypeInput = document.getElementById("string-type");
const tensionInput = document.getElementById("tension");
const commentInput = document.getElementById("comment");
const priorityInput = document.getElementById("priority");

const formMessage = document.getElementById("form-message");

const queueList = document.getElementById("queue-list");
const queueEmpty = document.getElementById("queue-empty");
const queueCount = document.getElementById("queue-count");

const cordeurBtn = document.getElementById("cordeur-btn");
const cordeurPanel = document.getElementById("cordeur-panel");
const cordeurList = document.getElementById("cordeur-list");
const adminEmpty = document.getElementById("admin-empty");

const historyList = document.getElementById("history-list");
const historyEmpty = document.getElementById("history-empty");

const statWaiting = document.getElementById("stat-waiting");
const statDoneToday = document.getElementById("stat-done-today");
const statDoneTotal = document.getElementById("stat-done-total");
const statTopString = document.getElementById("stat-top-string");

let allRackets = [];
let cordeurUnlocked = false;

function showMessage(message, type = "") {
  formMessage.textContent = message;
  formMessage.className = "form-message";
  if (type) {
    formMessage.classList.add(type);
  }
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function isToday(dateString) {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function getEstimatedTime(index) {
  return (index + 1) * TIME_PER_RACKET;
}

function formatWait(index) {
  const totalMinutes = getEstimatedTime(index);

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

function getStatusLabel(status) {
  switch (status) {
    case "in_progress":
      return "En cours";
    case "done":
      return "Terminée";
    default:
      return "En attente";
  }
}

function getSortedWaitingRackets() {
  return allRackets
    .filter((item) => item.status !== "done")
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority ? -1 : 1;
      }
      return new Date(a.created_at) - new Date(b.created_at);
    });
}

function getDoneRackets() {
  return allRackets
    .filter((item) => item.status === "done")
    .sort((a, b) => new Date(b.done_at || b.updated_at) - new Date(a.done_at || a.updated_at));
}

function renderQueue() {
  const waitingRackets = getSortedWaitingRackets();

  queueCount.textContent = waitingRackets.length.toString();
  queueList.innerHTML = "";

  if (waitingRackets.length === 0) {
    queueEmpty.classList.remove("hidden");
    return;
  }

  queueEmpty.classList.add("hidden");

  waitingRackets.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "queue-item";

    const safeComment = item.comment ? escapeHtml(item.comment) : "";
    const statusClass =
      item.status === "in_progress" ? "chip--status-progress" : "chip--status-waiting";

    li.innerHTML = `
      <div class="queue-item__top">
        <div>
          <h3 class="queue-item__title">${escapeHtml(item.player_name)} • ${escapeHtml(item.racket_name)}</h3>
        </div>
        <div class="queue-item__wait">Attente estimée : ${formatWait(index)}</div>
      </div>

      <div class="queue-item__meta">
        <span class="chip">${escapeHtml(item.string_type)}</span>
        <span class="chip">${escapeHtml(item.tension)} kg</span>
        <span class="chip ${statusClass}">${getStatusLabel(item.status)}</span>
        ${item.priority ? '<span class="chip chip--priority">Priorité match</span>' : ""}
      </div>

      ${
        safeComment
          ? `<p class="queue-item__comment">${safeComment}</p>`
          : ""
      }
    `;

    queueList.appendChild(li);
  });
}

function renderAdmin() {
  if (!cordeurUnlocked) return;

  const waitingRackets = getSortedWaitingRackets();
  cordeurList.innerHTML = "";

  if (waitingRackets.length === 0) {
    adminEmpty.classList.remove("hidden");
  } else {
    adminEmpty.classList.add("hidden");
  }

  waitingRackets.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "admin-item";

    const statusClass =
      item.status === "in_progress" ? "chip--status-progress" : "chip--status-waiting";

    li.innerHTML = `
      <div class="admin-item__top">
        <div>
          <h3 class="admin-item__title">${escapeHtml(item.player_name)} • ${escapeHtml(item.racket_name)}</h3>
          <div class="admin-item__meta">
            <span class="chip">${escapeHtml(item.string_type)}</span>
            <span class="chip">${escapeHtml(item.tension)} kg</span>
            <span class="chip ${statusClass}">${getStatusLabel(item.status)}</span>
            <span class="chip">Déposée : ${formatDate(item.created_at)}</span>
            <span class="chip">Attente : ${formatWait(index)}</span>
            ${item.priority ? '<span class="chip chip--priority">Priorité match</span>' : ""}
          </div>
        </div>
      </div>

      ${
        item.comment
          ? `<p class="admin-item__comment">${escapeHtml(item.comment)}</p>`
          : ""
      }

      <div class="admin-actions">
        ${
          item.status === "waiting"
            ? `<button class="action-btn action-btn--start" data-action="start" data-id="${item.id}">Démarrer</button>`
            : ""
        }
        <button class="action-btn action-btn--done" data-action="done" data-id="${item.id}">Terminée</button>
        <button class="action-btn action-btn--delete" data-action="delete" data-id="${item.id}">Supprimer</button>
      </div>
    `;

    cordeurList.appendChild(li);
  });
}

function renderHistory() {
  if (!cordeurUnlocked) return;

  const doneRackets = getDoneRackets().slice(0, 12);
  historyList.innerHTML = "";

  if (doneRackets.length === 0) {
    historyEmpty.classList.remove("hidden");
    return;
  }

  historyEmpty.classList.add("hidden");

  doneRackets.forEach((item) => {
    const li = document.createElement("li");
    li.className = "history-item";

    li.innerHTML = `
      <div class="history-item__top">
        <div>
          <h3 class="history-item__title">${escapeHtml(item.player_name)} • ${escapeHtml(item.racket_name)}</h3>
        </div>
      </div>

      <div class="history-item__meta">
        <span class="chip">${escapeHtml(item.string_type)}</span>
        <span class="chip">${escapeHtml(item.tension)} kg</span>
        <span class="chip chip--status-done">Terminée</span>
        <span class="chip">Fin : ${formatDate(item.done_at || item.updated_at)}</span>
      </div>

      ${
        item.comment
          ? `<p class="history-item__comment">${escapeHtml(item.comment)}</p>`
          : ""
      }
    `;

    historyList.appendChild(li);
  });
}

function renderStats() {
  const waitingRackets = getSortedWaitingRackets();
  const doneRackets = getDoneRackets();

  statWaiting.textContent = waitingRackets.length.toString();
  statDoneToday.textContent = doneRackets.filter((item) => isToday(item.done_at || item.updated_at)).length.toString();
  statDoneTotal.textContent = doneRackets.length.toString();

  const counts = {};
  allRackets.forEach((item) => {
    const key = item.string_type || "Autre";
    counts[key] = (counts[key] || 0) + 1;
  });

  let topString = "—";
  let topCount = 0;

  Object.entries(counts).forEach(([name, count]) => {
    if (count > topCount) {
      topCount = count;
      topString = name;
    }
  });

  statTopString.textContent = topString;
}

function renderAll() {
  renderQueue();
  renderAdmin();
  renderHistory();
  renderStats();
}

async function fetchRackets() {
  const { data, error } = await sb
    .from("rackets")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erreur chargement :", error);
    showMessage("Erreur lors du chargement des données.", "error");
    return;
  }

  allRackets = data || [];
  renderAll();
}

async function addRacket(payload) {
  const { error } = await sb.from("rackets").insert([payload]);

  if (error) {
    console.error("Erreur ajout :", error);
    throw error;
  }
}

async function updateRacket(id, updates) {
  const { error } = await sb
    .from("rackets")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Erreur update :", error);
    throw error;
  }
}

async function deleteRacket(id) {
  const { error } = await sb
    .from("rackets")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erreur suppression :", error);
    throw error;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("");

  const player_name = playerNameInput.value.trim();
  const racket_name = racketNameInput.value.trim();
  const string_type = stringTypeInput.value;
  const tension = Number(tensionInput.value);
  const comment = commentInput.value.trim();
  const priority = priorityInput.checked;

  if (!player_name || !racket_name || !string_type || !tension) {
    showMessage("Merci de remplir les champs obligatoires.", "error");
    return;
  }

  try {
    const payload = {
      player_name,
      racket_name,
      string_type,
      tension,
      comment,
      priority,
      status: "waiting"
    };

    await addRacket(payload);

    form.reset();
    stringTypeInput.value = "BG65";
    priorityInput.checked = false;

    showMessage("Raquette ajoutée avec succès.", "success");
    await fetchRackets();
  } catch (error) {
    showMessage("Impossible d’ajouter la raquette.", "error");
  }
});

cordeurBtn.addEventListener("click", () => {
  if (cordeurUnlocked) {
    cordeurPanel.classList.toggle("hidden");
    return;
  }

  const password = window.prompt("Mot de passe cordeur :");

  if (password === CORDEUR_PASSWORD) {
    cordeurUnlocked = true;
    cordeurPanel.classList.remove("hidden");
    cordeurBtn.textContent = "Masquer";
    renderAll();
  } else if (password !== null) {
    window.alert("Mot de passe incorrect.");
  }
});

cordeurList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (!id || !action) return;

  try {
    if (action === "start") {
      await updateRacket(id, {
        status: "in_progress",
        updated_at: new Date().toISOString()
      });
    }

    if (action === "done") {
      await updateRacket(id, {
        status: "done",
        done_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    if (action === "delete") {
      const confirmed = window.confirm("Supprimer cette raquette ?");
      if (!confirmed) return;
      await deleteRacket(id);
    }

    await fetchRackets();
  } catch (error) {
    window.alert("Une erreur est survenue.");
  }
});

async function initRealtime() {
  sb
    .channel("rackets-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "rackets"
      },
      async () => {
        await fetchRackets();
      }
    )
    .subscribe();
}

async function initApp() {
  try {
    await fetchRackets();
    await initRealtime();
  } catch (error) {
    console.error(error);
    showMessage("Erreur au démarrage de l’application.", "error");
  }
}

initApp();

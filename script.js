const form = document.getElementById("add-form");
const queueList = document.getElementById("queue-list");
const cordeurList = document.getElementById("cordeur-list");
const cordeurBtn = document.getElementById("cordeur-btn");
const cordeurPanel = document.getElementById("cordeur-panel");
const queueCount = document.getElementById("queue-count");
const queueEmpty = document.getElementById("queue-empty");
const cordeurEmpty = document.getElementById("cordeur-empty");

let queue = JSON.parse(localStorage.getItem("queueCordageBadmintonV2")) || [];

function saveQueue() {
  localStorage.setItem("queueCordageBadmintonV2", JSON.stringify(queue));
}

function getEstimatedTime(index) {
  return (index + 1) * 30;
}

function formatWait(index) {
  const minutes = getEstimatedTime(index);
  if (minutes < 60) return `${minutes} min estimées`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h estimée`;
  return `${hours}h${mins} estimées`;
}

function formatReadyTime(index) {
  const minutesToAdd = getEstimatedTime(index);
  const now = new Date();
  const ready = new Date(now.getTime() + minutesToAdd * 60000);

  const hours = ready.getHours().toString().padStart(2, "0");
  const minutes = ready.getMinutes().toString().padStart(2, "0");

  return `${hours}:${minutes}`;
}

function sortQueue() {
  queue.sort((a, b) => {
    if (a.priority === b.priority) return a.createdAt - b.createdAt;
    return b.priority - a.priority;
  });
}

function buildQueueItem(item, index, isCordeur = false) {
  const li = document.createElement("li");
  li.className = "queue-item";
  if (item.priority) li.classList.add("priority");

  li.innerHTML = `
    <div class="queue-row-top">
      <div class="queue-player">${item.player}</div>
      <div class="queue-position">#${index + 1}</div>
    </div>
    <div class="queue-details">
      ${item.racket}<br>
      ${item.string} · ${item.tension} kg
    </div>
    <div class="queue-wait">
      ⏱ ${formatWait(index)} • Retrait estimé vers ${formatReadyTime(index)}
    </div>
    ${item.priority ? `<div class="queue-priority-tag">Priorité match</div>` : ""}
  `;

  if (isCordeur) {
    const btn = document.createElement("button");
    btn.className = "finish-btn";
    btn.textContent = "Raquette terminée";
    btn.onclick = function () {
      queue.splice(index, 1);
      saveQueue();
      renderAll();
    };
    li.appendChild(btn);
  }

  return li;
}

function renderPublicQueue() {
  queueList.innerHTML = "";
  queueCount.textContent = `${queue.length} ${queue.length > 1 ? "raquettes" : "raquette"}`;

  if (queue.length === 0) {
    queueEmpty.style.display = "block";
    return;
  }

  queueEmpty.style.display = "none";

  queue.forEach((item, index) => {
    queueList.appendChild(buildQueueItem(item, index, false));
  });
}

function renderCordeurQueue() {
  cordeurList.innerHTML = "";

  if (queue.length === 0) {
    cordeurEmpty.style.display = "block";
    return;
  }

  cordeurEmpty.style.display = "none";

  queue.forEach((item, index) => {
    cordeurList.appendChild(buildQueueItem(item, index, true));
  });
}

function renderAll() {
  sortQueue();
  renderPublicQueue();
  renderCordeurQueue();
}

form.addEventListener("submit", function (e) {
  e.preventDefault();

  const player = document.getElementById("player-name").value.trim();
  const racket = document.getElementById("racket-name").value.trim();
  const string = document.getElementById("string-type").value;
  const tension = document.getElementById("tension").value.trim();
  const priority = document.getElementById("priority").checked;

  if (!player || !racket || !tension) {
    alert("Merci de remplir tous les champs.");
    return;
  }

  queue.push({
    player,
    racket,
    string,
    tension,
    priority,
    createdAt: Date.now()
  });

  saveQueue();
  renderAll();

  const newIndex = queue.findIndex(
    item =>
      item.player === player &&
      item.racket === racket &&
      item.string === string &&
      item.tension === tension
  );

  const waitMessage = newIndex >= 0 ? formatWait(newIndex) : "en cours de calcul";
  form.reset();
  alert(`Raquette enregistrée ✅\nTemps estimé : ${waitMessage}`);
});

cordeurBtn.addEventListener("click", function () {
  cordeurPanel.classList.toggle("hidden");
});

renderAll();

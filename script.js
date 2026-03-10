const form = document.getElementById("add-form");
const queueList = document.getElementById("queue-list");
const cordeurList = document.getElementById("cordeur-list");
const cordeurBtn = document.getElementById("cordeur-btn");
const cordeurPanel = document.getElementById("cordeur-panel");
const queueCount = document.getElementById("queue-count");
const queueEmpty = document.getElementById("queue-empty");
const cordeurEmpty = document.getElementById("cordeur-empty");

let queue = JSON.parse(localStorage.getItem("queueCordageBadminton")) || [];

function saveQueue() {
  localStorage.setItem("queueCordageBadminton", JSON.stringify(queue));
}

function formatWait(index) {
  const minutes = (index + 1) * 30;
  if (minutes < 60) return `${minutes} min estimées`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h estimée`;
  return `${hours}h${mins} estimées`;
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
    const li = document.createElement("li");
    li.className = "queue-item";

    li.innerHTML = `
      <div class="queue-top">
        <div class="queue-name">${item.player}</div>
        <div class="queue-pos">#${index + 1}</div>
      </div>
      <div class="queue-meta">
        ${item.racket}<br>
        ${item.string} · ${item.tension} kg
      </div>
      <div class="wait-line">⏱ ${formatWait(index)}</div>
    `;

    queueList.appendChild(li);
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
    const li = document.createElement("li");
    li.className = "queue-item";

    li.innerHTML = `
      <div class="queue-top">
        <div class="queue-name">${item.player}</div>
        <div class="queue-pos">#${index + 1}</div>
      </div>
      <div class="queue-meta">
        ${item.racket}<br>
        ${item.string} · ${item.tension} kg
      </div>
      <div class="wait-line">⏱ ${formatWait(index)}</div>
    `;

    const btn = document.createElement("button");
    btn.className = "finish-btn";
    btn.textContent = "Raquette terminée";
    btn.onclick = function () {
      queue.splice(index, 1);
      saveQueue();
      renderPublicQueue();
      renderCordeurQueue();
    };

    li.appendChild(btn);
    cordeurList.appendChild(li);
  });
}

form.addEventListener("submit", function (e) {
  e.preventDefault();

  const player = document.getElementById("player-name").value.trim();
  const racket = document.getElementById("racket-name").value.trim();
  const string = document.getElementById("string-type").value;
  const tension = document.getElementById("tension").value.trim();

  if (!player || !racket || !tension) {
    alert("Merci de remplir tous les champs.");
    return;
  }

  queue.push({
    player,
    racket,
    string,
    tension
  });

  saveQueue();
  renderPublicQueue();
  renderCordeurQueue();

  const wait = formatWait(queue.length - 1);
  form.reset();
  alert(`Raquette enregistrée ✅\nTemps estimé : ${wait}`);
});

cordeurBtn.addEventListener("click", function () {
  cordeurPanel.classList.toggle("hidden");
});

renderPublicQueue();
renderCordeurQueue();

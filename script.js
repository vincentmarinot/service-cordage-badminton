const SUPABASE_URL = "https://jbclmwoyrrvmtqagnati.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_T_XvMxifuWza8WZ-Kok1Jw_KX_v43go";
const SMS_WEBHOOK_URL = "https://hello-messaging-7093-47fdmw.twil.io/send-sms";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById("add-form");
const queueList = document.getElementById("queue-list");
const cordeurList = document.getElementById("cordeur-list");
const cordeurBtn = document.getElementById("cordeur-btn");
const cordeurPanel = document.getElementById("cordeur-panel");
const queueCount = document.getElementById("queue-count");
const queueEmpty = document.getElementById("queue-empty");
const cordeurEmpty = document.getElementById("cordeur-empty");

let queue = [];

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
      ${item.string_type} · ${item.tension} kg
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

    btn.onclick = async function () {
      await finishRacket(item.id, item.phone, item.player);
    };

    li.appendChild(btn);
  }

  return li;
}

function renderPublicQueue() {
  queueList.innerHTML = "";

  queueCount.textContent =
    `${queue.length} ${queue.length > 1 ? "raquettes" : "raquette"}`;

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
  renderPublicQueue();
  renderCordeurQueue();
}

async function loadQueue() {
  const { data, error } = await sb
    .from("cordages")
    .select("*")
    .eq("status", "waiting")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  queue = data || [];
  renderAll();
}

async function finishRacket(id, phone, player) {

  const { error } = await sb
    .from("cordages")
    .update({ status: "done" })
    .eq("id", id);

  if (error) {
    alert("Erreur lors de la mise à jour de la raquette.");
    console.error(error);
    return;
  }

  try {

    const formattedPhone = phone.replace(/^0/, "+33");

    await fetch(SMS_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        phone: formattedPhone,
        player: player
      })
    });

  } catch (err) {
    console.error("Erreur envoi SMS :", err);
  }

  await loadQueue();
}

form.addEventListener("submit", async function (e) {

  e.preventDefault();

  const player = document.getElementById("player-name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const racket = document.getElementById("racket-name").value.trim();
  const string_type = document.getElementById("string-type").value;
  const tension = document.getElementById("tension").value.trim();
  const priority = document.getElementById("priority").checked;

  if (!player || !phone || !racket || !tension) {
    alert("Merci de remplir tous les champs.");
    return;
  }

  const { error } = await sb.from("cordages").insert([
    {
      player,
      phone,
      racket,
      string_type,
      tension,
      priority,
      status: "waiting"
    }
  ]);

  if (error) {
    alert("Erreur lors de l’enregistrement.");
    console.error(error);
    return;
  }

  form.reset();

  await loadQueue();

  alert("Raquette enregistrée ✅");
});

cordeurBtn.addEventListener("click", function () {
  cordeurPanel.classList.toggle("hidden");
});

loadQueue();

sb
  .channel("realtime-cordages")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "cordages" },
    () => {
      loadQueue();
    }
  )
  .subscribe();

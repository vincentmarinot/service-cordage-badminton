const SUPABASE_URL = "https://jbclmwoyrrvmtqagnati.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_T_XvMxifuWza8WZ-Kok1Jw_KX_v43go";

const CORDEUR_PASSWORD = "Badlab1996!";

const TIME_PER_RACKET = 22;

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById("add-form");
const queueList = document.getElementById("queue-list");
const cordeurList = document.getElementById("cordeur-list");

const queueCount = document.getElementById("queue-count");

const cordeurBtn = document.getElementById("cordeur-btn");
const cordeurPanel = document.getElementById("cordeur-panel");

let queue = [];
let cordeurUnlocked = false;

function getEstimatedTime(index){
return (index+1)*TIME_PER_RACKET;
}

function formatWait(index){

const m = getEstimatedTime(index);

if(m<60) return m+" min";

const h = Math.floor(m/60);
const min = m%60;

return h+"h"+min;

}

function buildItem(item,index,isCordeur=false){

const li = document.createElement("li");

li.className="queue-item";

li.innerHTML=`

<div class="queue-row">

<div class="player">${item.player}</div>

<div class="pos">#${index+1}</div>

</div>

<div class="details">

${item.racket}

<br>

${item.string_type} · ${item.tension}kg

</div>

<div class="wait">

⏱ ${formatWait(index)}

</div>

${item.comment ? `<div class="comment">💬 ${item.comment}</div>` : ""}

`;

if(isCordeur){

const btn = document.createElement("button");

btn.className="finish-btn";

btn.textContent="Terminée";

btn.onclick=()=>finishRacket(item.id);

li.appendChild(btn);

}

return li;

}

function render(){

queueList.innerHTML="";
cordeurList.innerHTML="";

queueCount.textContent=queue.length+" raquettes";

queue.forEach((item,i)=>{

queueList.appendChild(buildItem(item,i,false));
cordeurList.appendChild(buildItem(item,i,true));

});

}

async function loadQueue(){

const {data,error} = await sb
.from("cordages")
.select("*")
.eq("status","waiting")
.order("priority",{ascending:false})
.order("created_at",{ascending:true});

if(error) return;

queue=data;

render();

updateStats();

}

async function finishRacket(id){

await sb
.from("cordages")
.update({
status:"done",
finished_at:new Date()
})
.eq("id",id);

loadQueue();

}

function updateStats(){

const today = new Date().toISOString().split("T")[0];

let racketsToday=0;
let incomeToday=0;
let incomeTotal=0;

let strings={};

queue.forEach(r=>{

incomeTotal+=r.price||0;

if(r.created_at.startsWith(today)){

racketsToday++;

incomeToday+=r.price||0;

}

strings[r.string_type]=(strings[r.string_type]||0)+1;

});

let top="-";
let max=0;

for(const s in strings){

if(strings[s]>max){

max=strings[s];
top=s;

}

}

document.getElementById("stat-rackets-today").textContent=racketsToday;

document.getElementById("stat-income-today").textContent=incomeToday+"€";

document.getElementById("stat-income-total").textContent=incomeTotal+"€";

document.getElementById("stat-top-string").textContent=top;

}

form.addEventListener("submit",async(e)=>{

e.preventDefault();

const player=document.getElementById("player-name").value;

const racket=document.getElementById("racket-name").value;

const string_type=document.getElementById("string-type").value;

const tension=document.getElementById("tension").value;

const price=document.getElementById("price").value;

const comment=document.getElementById("comment").value;

const priority=document.getElementById("priority").checked;

await sb.from("cordages").insert([{

player,
racket,
string_type,
tension,
price,
comment,
priority,
status:"waiting"

}]);

form.reset();

loadQueue();

});

cordeurBtn.onclick=()=>{

if(!cordeurUnlocked){

const p = prompt("Mot de passe");

if(p!==CORDEUR_PASSWORD){

alert("Incorrect");

return;

}

cordeurUnlocked=true;

}

cordeurPanel.classList.toggle("hidden");

};

loadQueue();

sb
.channel("realtime")
.on(
"postgres_changes",
{event:"*",schema:"public",table:"cordages"},
loadQueue
)
.subscribe();

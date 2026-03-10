const SUPABASE_URL = "TON_URL";
const SUPABASE_KEY = "TA_CLE";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById("add-form");
const queueList = document.getElementById("queue-list");

async function loadQueue(){

const { data } = await supabase
.from('cordages')
.select('*')
.eq('status','waiting')
.order('priority', {ascending:false})
.order('created_at');

renderQueue(data);

}

function renderQueue(queue){

queueList.innerHTML="";

queue.forEach((item,index)=>{

const li=document.createElement("li");

li.innerHTML=`
<strong>${item.player}</strong><br>
${item.racket}<br>
${item.string} • ${item.tension} kg<br>
position #${index+1}
`;

queueList.appendChild(li);

});

}

form.addEventListener("submit", async (e)=>{

e.preventDefault();

const player=document.getElementById("player-name").value;
const racket=document.getElementById("racket-name").value;
const string=document.getElementById("string-type").value;
const tension=document.getElementById("tension").value;
const phone=document.getElementById("phone").value;

await supabase
.from('cordages')
.insert([{
player,
racket,
string,
tension,
phone
}]);

alert("Raquette enregistrée");

form.reset();

loadQueue();

});

loadQueue();
async function finishRacket(id,phone){

await supabase
.from('cordages')
.update({status:'done'})
.eq('id',id);

fetch("URL_TWILIO",{
method:"POST",
body:JSON.stringify({phone})
});

loadQueue();

}

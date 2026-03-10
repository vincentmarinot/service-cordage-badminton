const form = document.getElementById("add-form")
const queueList = document.getElementById("queue-list")
const cordeurList = document.getElementById("cordeur-list")
const cordeurBtn = document.getElementById("cordeur-btn")
const cordeurPanel = document.getElementById("cordeur-panel")

let queue = JSON.parse(localStorage.getItem("queue")) || []

function saveQueue(){

localStorage.setItem("queue",JSON.stringify(queue))

}

function renderQueue(){

queueList.innerHTML=""

queue.forEach((item,index)=>{

let attente=(index+1)*30

let li=document.createElement("li")

li.innerHTML=
"#"+(index+1)+" - "+
item.player+
" | "+
item.racket+
" | "+
item.string+
" | "+
item.tension+
"kg"+
" | ⏱ "+attente+" min"

queueList.appendChild(li)

})

}

function renderCordeur(){

cordeurList.innerHTML=""

queue.forEach((item,index)=>{

let li=document.createElement("li")

let btn=document.createElement("button")

btn.innerText="Raquette terminée"

btn.className="finish-btn"

btn.onclick=function(){

queue.splice(index,1)

saveQueue()

renderQueue()

renderCordeur()

}

li.innerHTML=
"#"+(index+1)+" - "+
item.player+
" | "+
item.racket+
" | "+
item.string+
" | "+
item.tension+"kg "

li.appendChild(btn)

cordeurList.appendChild(li)

})

}

form.addEventListener("submit",function(e){

e.preventDefault()

let player=document.getElementById("player-name").value
let racket=document.getElementById("racket-name").value
let string=document.getElementById("string-type").value
let tension=document.getElementById("tension").value

queue.push({

player,
racket,
string,
tension

})

saveQueue()

renderQueue()

renderCordeur()

form.reset()

})

cordeurBtn.onclick=function(){

if(cordeurPanel.style.display==="none"){

cordeurPanel.style.display="block"

}else{

cordeurPanel.style.display="none"

}

}

renderQueue()

renderCordeur()

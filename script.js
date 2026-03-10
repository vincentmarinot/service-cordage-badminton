const form = document.getElementById("add-form")
const queueList = document.getElementById("queue-list")

let queue = JSON.parse(localStorage.getItem("queue")) || []

function saveQueue(){
localStorage.setItem("queue", JSON.stringify(queue))
}

function renderQueue(){

queueList.innerHTML=""

queue.forEach((item,index)=>{

let li=document.createElement("li")

let attente=(index+1)*30

li.innerHTML=
"<strong>#"+(index+1)+"</strong> - "+
item.player+
" | "+
item.racket+
" | "+
item.string+
" | "+
item.tension+
" kg"+
" | ⏱ "+attente+" min"

queueList.appendChild(li)

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

form.reset()

})

renderQueue()

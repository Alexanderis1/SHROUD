"use strict";
const QUORUM = 3;
const COL = { IDENTIFIED:"#f0b429", VERIFIED:"#ef3b54", IN_MAINTENANCE:"#3b82f6", SOLVED:"#34d27b" };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const $ = id => document.getElementById(id);

let REC=null, byFid={}, live={}, bounds=[0,0,270,210], anim=0, playToken=0;

async function boot(){
  REC = await (await fetch("api/recording?ts="+Date.now())).json();
  bounds = REC.asset.bounds;
  REC.candidates.forEach(c => byFid[c.failure_id] = c);
  const s = REC.summary || {};
  if((s.network||"local")==="fuji"){
    const b=$("netbadge"); b.textContent="● Avalanche Fuji"; b.classList.add("fuji");
    $("contract").href="https://testnet.snowtrace.io/address/"+s.contract;
  }
  $("contract").textContent = "contract "+(s.contract? s.contract.slice(0,10)+"…"+s.contract.slice(-6):"—");
  $("foot").textContent = `Connected to SHROUD • ${REC.asset.structures.length} structures on-chain • `
     + `${REC.uavs.length} UAVs • chainId ${s.chainId||"—"}`;
  $("restart").onclick = play;
  loopAnim();
  play();
}

// ---------- site map ----------
function w2c(x,y,cv){
  const [x0,y0,x1,y1]=bounds, m=26;
  const sx=(cv.width-2*m)/(x1-x0), sy=(cv.height-2*m)/(y1-y0), s=Math.min(sx,sy);
  return [m+(x-x0)*s, cv.height-m-(y-y0)*s];
}
function drawMap(){
  const cv=$("map"), g=cv.getContext("2d");
  g.clearRect(0,0,cv.width,cv.height);
  g.strokeStyle="#13202b"; g.lineWidth=1;
  for(let i=0;i<=10;i++){ const x=i/10*cv.width, y=i/10*cv.height;
    g.beginPath();g.moveTo(x,0);g.lineTo(x,cv.height);g.stroke();
    g.beginPath();g.moveTo(0,y);g.lineTo(cv.width,y);g.stroke(); }
  // structures
  const [x0,y0,x1,y1]=bounds, m=26;
  const s=Math.min((cv.width-2*m)/(x1-x0),(cv.height-2*m)/(y1-y0));
  for(const st of REC.asset.structures){
    const [cx,cy]=w2c(st.center[0],st.center[1],cv);
    g.fillStyle="#16242f"; g.strokeStyle="#243646"; g.lineWidth=1.2;
    if(st.type==="pipe_rack" && st.size){
      const w=st.size[0]*s*2, h=st.size[1]*s*2;
      g.fillRect(cx-w/2,cy-h/2,w,h); g.strokeRect(cx-w/2,cy-h/2,w,h);
    } else {
      g.beginPath(); g.arc(cx,cy,Math.max(3,st.radius*s),0,7); g.fill(); g.stroke();
    }
  }
  // UAV homes
  for(const u of REC.uavs){
    const [cx,cy]=w2c(u.home[0],u.home[1],cv);
    g.fillStyle="#39d3e6"; g.beginPath(); g.arc(cx,cy,4,0,7); g.fill();
    g.fillStyle="#5e7589"; g.font="10px monospace"; g.fillText(u.id,cx+7,cy+3);
  }
  // failure markers (current live state)
  const t=performance.now()/1000;
  for(const fid in live){
    const st=live[fid]; const c=byFid[fid]; if(!c) continue;
    const [cx,cy]=w2c(c.position[0],c.position[1],cv);
    const col=COL[st.state]||"#888"; const pr=7+1.8*Math.sin(t*3+(+fid));
    g.strokeStyle=col; g.globalAlpha=.5; g.lineWidth=1.5;
    g.beginPath(); g.arc(cx,cy,pr+6,0,7); g.stroke(); g.globalAlpha=1;
    g.fillStyle=col; g.beginPath(); g.arc(cx,cy,pr,0,7); g.fill();
    g.fillStyle=col; g.font="bold 10px monospace"; g.fillText("#"+fid,cx+pr+4,cy+3);
  }
}
function loopAnim(){ drawMap(); anim=requestAnimationFrame(loopAnim); }

// ---------- feed ----------
function card(c){
  const st=live[c.failure_id];
  const el=document.createElement("div");
  el.className="card "+st.state.toLowerCase().replace("identified","");
  el.id="card-"+c.failure_id;
  el.innerHTML=`
    <div class="row1">
      <span><span class="fid">Failure #${c.failure_id}</span> · <span class="ftype">${c.type}</span></span>
      <span class="state ${st.state}">${st.state.replace("_"," ")}</span>
    </div>
    <div class="meta">on <b>${structName(c.structure_id)}</b> · reported by ${c.reporter}
      · token <span class="sha">${c.image_sha256.slice(0,12)}…</span></div>
    <div class="quorum"><i style="width:${Math.min(100,st.recs.size/QUORUM*100)}%"></i></div>
    <div class="chips" id="chips-${c.failure_id}"></div>
    <div class="cardbody">
      <img class="crop" src="media/${(c.image_path||'').replace(/\\\\/g,'/')}" onerror="this.style.visibility='hidden'">
      <div><div class="meta">position&nbsp; x ${c.position[0]} &nbsp; y ${c.position[1]} &nbsp; z ${c.position[2]}</div>
        <div class="ops" id="ops-${c.failure_id}"></div></div>
    </div>`;
  $("feed").prepend(el);
  refreshChips(c.failure_id); refreshOps(c.failure_id);
}
function structName(id){ const s=REC.asset.structures.find(s=>s.id===id); return s?s.name:("structure "+id); }
function refreshChips(fid){
  const box=$("chips-"+fid); if(!box) return; const st=live[fid];
  box.innerHTML=[...st.recs].map(u=>`<span class="chip ok">✓ ${u}</span>`).join("")
    + `<span class="chip">${st.recs.size}/${QUORUM} recognisers</span>`;
}
function refreshOps(fid){
  const box=$("ops-"+fid); if(!box) return; const st=live[fid];
  box.innerHTML="";
  if(st.state==="VERIFIED"){ const b=document.createElement("button"); b.className="primary";
    b.textContent="Dispatch maintenance"; b.onclick=()=>setState(fid,"IN_MAINTENANCE"); box.append(b); }
  if(st.state==="IN_MAINTENANCE"){ const b=document.createElement("button"); b.className="solve";
    b.textContent="Mark solved"; b.onclick=()=>setState(fid,"SOLVED"); box.append(b); }
}
function setCard(fid){
  const st=live[fid], el=$("card-"+fid); if(!el) return;
  el.className="card "+st.state.toLowerCase().replace("identified","");
  const s=el.querySelector(".state"); s.className="state "+st.state; s.textContent=st.state.replace("_"," ");
  el.querySelector(".quorum>i").style.width=Math.min(100,st.recs.size/QUORUM*100)+"%";
  refreshChips(fid); refreshOps(fid); counters();
}
function counters(){
  const v=Object.values(live);
  $("k-id").textContent=v.length;
  $("k-ver").textContent=v.filter(s=>["VERIFIED","IN_MAINTENANCE","SOLVED"].includes(s.state)).length;
  $("k-sol").textContent=v.filter(s=>s.state==="SOLVED").length;
  $("feedcount").textContent=v.length+" failures";
}
function setState(fid,to){ live[fid].state=to; setCard(fid);
  fetch("api/setState",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({failure_id:+fid,state:to})}).catch(()=>{}); }

// ---------- replay ----------
async function play(){
  const tok=++playToken; live={}; byFid={}; REC.candidates.forEach(c=>byFid[c.failure_id]=c);
  $("feed").innerHTML=""; counters(); $("status").textContent="replaying…";
  for(const ev of REC.events){
    if(tok!==playToken) return;
    const fid=ev.failure_id;
    if(ev.kind==="identified"){ live[fid]={state:"IDENTIFIED",recs:new Set([byFid[fid].reporter])}; card(byFid[fid]); }
    else if(ev.kind==="confirmed"){ live[fid].recs.add(ev.uav); setCard(fid); }
    else if(ev.kind==="verified"){ live[fid].state="VERIFIED"; setCard(fid); }
    else if(ev.kind==="lifecycle"){ live[fid].state="IN_MAINTENANCE"; setCard(fid); await sleep(700);
      if(tok!==playToken)return; live[fid].state="SOLVED"; setCard(fid); }
    counters(); await sleep(ev.kind==="identified"?620:ev.kind==="verified"?520:360);
  }
  $("status").textContent="live — "+(REC.summary?.network||"local");
}
boot();

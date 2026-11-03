"use strict";
const NOANIM=new URLSearchParams(location.search).has("static");
const TZ="Europe/Madrid";const $=s=>document.querySelector(s);
const esc=v=>v==null||v===""?"—":String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ok=v=>v!=null&&v!==""&&!isNaN(v);
const num=(v,d=2)=>!ok(v)?"—":Number(v).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:d});
const usd=v=>!ok(v)?"—":(v<0?"-":"")+"$"+Math.abs(Number(v)).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const sUsd=v=>!ok(v)?"—":(v>0?"+":"")+usd(v);
const pct=v=>!ok(v)?"—":(v>0?"+":"")+Number(v).toFixed(2)+"%";
const hm=iso=>{if(!iso)return"—";const d=new Date(iso);return isNaN(d)?"—":d.toLocaleTimeString("es-ES",{timeZone:TZ,hour:"2-digit",minute:"2-digit"})};
const dhm=iso=>{if(!iso)return"—";const d=new Date(iso);return isNaN(d)?"—":d.toLocaleString("es-ES",{timeZone:TZ,day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})};
const ago=iso=>{if(!iso)return null;const s=(Date.now()-new Date(iso))/1000;return isNaN(s)?null:Math.max(0,s)};
const agoTxt=s=>s==null?"—":s<60?`hace ${Math.round(s)} s`:s<3600?`hace ${Math.round(s/60)} min`:s<86400?`hace ${Math.round(s/3600)} h`:`hace ${Math.round(s/86400)} d`;
const VC={COMPRA:"#39ff88",ESPERA:"#ffb020",PASA:"#ff4d5e"};const vc=v=>VC[v]||"#7d838a";
const vcls=v=>({COMPRA:"c-buy",ESPERA:"c-wait",PASA:"c-pass"}[v]||"c-x");
const hasLv=i=>i.entry!=null&&i.stop!=null&&i.target!=null;
let D=null,last="",sel=null;const prev={};const seenLog=new Set();let firstLog=true;

function counts(ideas){const c={COMPRA:0,ESPERA:0,PASA:0};(ideas||[]).forEach(i=>{if(c[i.verdict]!=null)c[i.verdict]++});return c}
function countTo(el,key,val,fmt){
  if(!el)return;if(!ok(val)){el.textContent="—";return}
  const from=ok(prev[key])?prev[key]:(fmt==="int"?0:val*0.9);prev[key]=val;
  if(NOANIM||from===val){el.textContent=fmt(val);return}
  const t0=performance.now(),dur=1100;
  const step=t=>{const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);el.textContent=fmt(from+(val-from)*e);if(k<1)requestAnimationFrame(step)};
  requestAnimationFrame(step);setTimeout(()=>el.textContent=fmt(val),dur+200);
}
const fInt=v=>num(Math.round(v),0);

function botState(rs){return rs==null?"WAIT":rs<20*60?"RUN":rs<3*3600?"IDLE":"WAIT"}
function bots(){
  const I=D.ideas||{},ideas=I.ideas||[],L=D.ledger||{},c=counts(ideas),rs=ago(I.updated_at),ls=ago(L.last_check);
  const op=(L.open_positions||[]).length,auto=L.auto_mode&&L.auto_mode.enabled,halted=L.day&&L.day.halted;
  const st=botState(rs),lv=ideas.filter(hasLv);
  const ej=!L.account?"WAIT":halted?"STOP":op>0?"LIVE":auto?"FLAT":"OFF";
  const tr=(s,n)=>s&&String(s).length>n?String(s).slice(0,n)+"…":(s||"—");
  return [
   {id:"jefe",n:"JEFE",ic:"J",col:"#2de2e6",role:"coordina la ronda",st,tl:"manda el plan, nunca opera",tc:"#2de2e6",
    sub:[`ronda ${hm(I.updated_at)} · ${esc(I.round_status)}`,`jefe: ${ideas.length} ideas · ${agoTxt(rs)}`],
    det:`<div class="k">ESTADO</div>${esc(I.round_status)}<div class="k">ÚLTIMA RONDA (MADRID)</div>${dhm(I.updated_at)} · ${agoTxt(rs)}<div class="k">IDEAS</div>${ideas.length}<div class="k">RONDAS GUARDADAS</div>${(D.history||[]).length}`},
   {id:"scout",n:"SCOUT",ic:"S",col:"#ffd33d",role:"movimiento + volumen",st,tl:"detecta, nunca opera",tc:"#ffd33d",
    sub:[`scout: ${ideas.length} candidatos`],
    det:`<div class="k">ACTIVOS DE LA ÚLTIMA RONDA</div>${ideas.map(i=>esc(i.asset)).join(" · ")||"—"}`},
   {id:"news",n:"NEWS",ic:"N",col:"#5aa9ff",role:"noticias y catalizadores",st,tl:"busca el porqué",tc:"#5aa9ff",
    sub:[`news: ${ideas.filter(i=>i.why).length} con motivo`],
    det:ideas.filter(i=>i.why).map(i=>`<div class="k">${esc(i.asset)}</div>${esc(tr(i.why,220))}`).join("")||"—"},
   {id:"sent",n:"SENTIMIENTO",ic:"☺",col:"#ff7ad9",role:"ánimo de mercado y redes",st,tl:"mide el ruido",tc:"#ff7ad9",
    sub:[`sentimiento: ${ideas.filter(i=>i.sentiment).length} leídos`],
    det:ideas.filter(i=>i.sentiment).map(i=>`<div class="k">${esc(i.asset)}</div>${esc(tr(i.sentiment,200))}`).join("")||"—"},
   {id:"charts",n:"CHARTS",ic:"⌁",col:"#2de2e6",role:"entrada · stop · objetivo",st,tl:"pone los niveles",tc:"#2de2e6",
    sub:[`charts: ${lv.length}/${ideas.length} con niveles`],
    det:lv.map(i=>`<div class="k">${esc(i.asset)} · ${esc(i.direction)}</div>E ${num(i.entry)} · S ${num(i.stop)} · O ${num(i.target)} · R/B ${num(i.rr,1)}`).join("")||"—"},
   {id:"esc",n:"ESCÉPTICO",ic:"!",col:"#ff4d5e",role:"veredicto final",st,tl:"nada pasa sin su visto bueno",tc:"#ff4d5e",
    sub:[`escéptico: ${c.COMPRA} compra · ${c.ESPERA} espera · ${c.PASA} pasa`],
    det:ideas.map(i=>`<div class="k" style="color:${vc(i.verdict)}">${esc(i.asset)} · ${esc(i.verdict)}</div>${esc(i.verdict_reason)}`).join("")||"—"},
   {id:"ejec",n:"EJECUTOR",ic:"▶",col:"#39ff88",role:"opera solo en paper",st:ej,tl:auto?"auto paper · solo COMPRA":"modo manual",tc:"#39ff88",
    sub:[`ejecutor: ${auto?"auto paper":L.auto_mode?"manual":"—"} · ${op}/3 abiertas · riesgo ${ok(L.default_risk_pct)?L.default_risk_pct+"%":"—"}`,`chequeo ${hm(L.last_check)} · ${agoTxt(ls)}`],
    det:`<div class="k">EQUITY PAPER</div>${usd(L.equity)}<div class="k">CASH</div>${usd(L.cash)}<div class="k">PNL REALIZADO</div>${sUsd(L.realized_pnl)}<div class="k">ÚLTIMO CHEQUEO</div>${dhm(L.last_check)} · ${agoTxt(ls)}<div class="k">MODO AUTOMÁTICO</div>${auto?"activado "+dhm(L.auto_mode.enabled_at):"desactivado"}${L.auto_mode&&L.auto_mode.conditions?`<div class="k">CONDICIONES</div>${L.auto_mode.conditions.map(esc).join("<br>")}`:""}<div class="k">ABIERTAS</div>${(L.open_positions||[]).map(p=>`${esc(p.asset)} ${esc(p.direction)} · fill ${num(p.fill)} · stop ${num(p.stop)} · obj ${num(p.target)}`).join("<br>")||"ninguna"}`},
  ];
}

function renderBots(B){
  $("#bots").innerHTML=B.map((b,ix)=>`<div class="bot ${sel===b.id?"sel":""}" data-bot="${b.id}" style="animation-delay:${NOANIM?0:ix*60}ms">
   <div class="br"><span class="ic" style="background:${b.col}">${esc(b.ic)}</span><span class="bn">${esc(b.n)}</span><span class="pill s-${b.st}">${b.st}</span></div>
   <div class="role">${esc(b.role)}</div><div class="tl" style="color:${b.tc}">${esc(b.tl)}</div>
   <div class="sub">${b.sub.map(s=>`<div>${esc(s)}</div>`).join("")}</div></div>`).join("");
  const run=B.filter(b=>b.st==="RUN"||b.st==="LIVE"||b.st==="IDLE"||b.st==="FLAT").length;
  $("#online").textContent=`${run}/7 en línea`;$("#running").textContent=`${run} running`;
}

function renderGraph(ideas){
  const W=640,top=ideas.slice(0,10),n=top.length,g=[];
  const st=[["SCOUT",50],["NEWS",160],["SENTIM.",270],["CHARTS",380],["ESCÉPTICO",490],["EJECUTOR",595]],Y=160;
  const sx=Object.fromEntries(st.map(s=>[s[0],s[1]]));
  // stage pipeline
  for(let k=0;k<st.length-1;k++){const id="pp"+k;g.push(`<path id="${id}" d="M${st[k][1]},${Y} L${st[k+1][1]},${Y}" stroke="#2a2d31" stroke-dasharray="3 4" fill="none"/>`);
    if(!NOANIM)g.push(`<circle r="2.2" fill="#2de2e6"><animateMotion dur="${2+k*.2}s" repeatCount="indefinite"><mpath href="#${id}"/></animateMotion></circle>`)}
  top.forEach((i,k)=>{const x=n===1?W/2:30+k*((W-60)/(n-1)),c=vc(i.verdict),to=i.verdict==="COMPRA"?sx["EJECUTOR"]:sx["ESCÉPTICO"],id="ip"+k;
    g.push(`<path id="${id}" d="M${x},38 C${x},100 ${to},100 ${to},${Y-14}" stroke="${c}" stroke-opacity=".28" fill="none"/>`);
    if(!NOANIM)g.push(`<circle r="2.4" fill="${c}"><animateMotion dur="${2.4+(k%4)*.5}s" begin="${(k*.37).toFixed(2)}s" repeatCount="indefinite"><mpath href="#${id}"/></animateMotion></circle>`);
  });
  top.forEach((i,k)=>{const x=n===1?W/2:30+k*((W-60)/(n-1)),c=vc(i.verdict);
    g.push(`<g class="ip" data-idea="${k}"><rect x="${x-27}" y="16" width="54" height="22" rx="11" fill="#0a0a0a" stroke="${c}"/><text x="${x}" y="31" text-anchor="middle" font-size="10" font-weight="700" fill="${c}">${esc(String(i.asset).slice(0,6))}</text></g>`)});
  st.forEach(([nm,x],k)=>{const c=k===5?"#39ff88":k===4?"#ff4d5e":"#2de2e6";
    g.push(`<g class="ip" data-bot="${["scout","news","sent","charts","esc","ejec"][k]}"><circle cx="${x}" cy="${Y}" r="13" fill="#0a0a0a" stroke="${c}"/><circle cx="${x}" cy="${Y}" r="4" fill="${c}">${NOANIM?"":`<animate attributeName="opacity" values="1;.3;1" dur="${1.6+k*.15}s" repeatCount="indefinite"/>`}</circle><text x="${x}" y="${Y+26}" text-anchor="middle" font-size="9" fill="#9aa0a6">${nm}</text></g>`)});
  if(!n)g.push(`<text x="320" y="60" text-anchor="middle" font-size="11" fill="#7d838a">sin ideas en la última ronda</text>`);
  $("#graph").innerHTML=g.join("");
}

function logRows(){
  const I=D.ideas||{},L=D.ledger||{},R=[];
  (D.history||[]).forEach(h=>{const v=h.verdicts||{};R.push({t:h.updated_at,b:"JEFE",e:"RONDA",d:`${h.round_status||"—"} · ${h.n_ideas??"—"} ideas · ${v.COMPRA||0}C/${v.ESPERA||0}E/${v.PASA||0}P`})});
  (I.ideas||[]).forEach((i,k)=>R.push({t:I.updated_at,b:"ESCÉPTICO",e:["COMPRA","ESPERA","PASA"].includes(i.verdict)?i.verdict:"INFO",d:`${i.asset} · ${i.direction}${i.rr!=null?" · R/B "+num(i.rr,1):""} · ${i.verdict_reason||"—"}`,idea:k,o:k+1}));
  (L.log||[]).forEach(l=>{const d=l.detail||{};const e=String(l.event||"");const m={open:"ENTRA",close:"SALE",day_halt:"PARA"}[e];
    R.push({t:l.time,b:"EJECUTOR",e:m||(/activad/i.test(e)?"ON":"INFO"),d:m?`${d.asset||"—"} ${d.direction||""} · fill ${num(d.fill)}${d.exit!=null?" → "+num(d.exit):""}${d.pnl!=null?" · "+sUsd(d.pnl):""}${d.exit_reason?" · "+d.exit_reason:""}`:e})});
  R.forEach(r=>r.ts=new Date(r.t).getTime()||0);R.sort((a,b)=>a.ts-b.ts||(a.o||0)-(b.o||0));
  return R.slice(-60);
}
function renderLog(){
  const R=logRows(),el=$("#log");
  el.innerHTML=R.map(r=>{const key=r.t+r.b+r.e+r.d,isNew=!firstLog&&!seenLog.has(key);seenLog.add(key);
    return `<div class="lr ${isNew&&!NOANIM?"new":""} ${r.idea!=null?"click":""}" ${r.idea!=null?`data-idea="${r.idea}"`:""}><span class="t">${hm(r.t)}</span><span class="b">${esc(r.b)}</span><span class="ev e-${r.e}">${esc(r.e)}</span><span class="x">${esc(r.d)}</span></div>`}).join("")||`<div class="lr"><span class="t">—</span><span class="b">—</span><span class="ev e-INFO">—</span><span class="x">sin eventos</span></div>`;
  firstLog=false;el.scrollTop=el.scrollHeight;
}

function render(){
  const I=D.ideas||{},ideas=I.ideas||[],L=D.ledger||{},c=counts(ideas),rs=ago(I.updated_at);
  const B=bots();renderBots(B);
  const eq=L.equity,sb=L.starting_balance,pnl=ok(eq)&&ok(sb)?eq-sb:null,pp=ok(pnl)&&sb?pnl/sb*100:null;
  countTo($("#h-eq"),"heq",eq,usd);countTo($("#h-ideas"),"hid",ideas.length,fInt);countTo($("#h-buy"),"hb",c.COMPRA,fInt);countTo($("#h-pass"),"hp",c.PASA,fInt);
  $("#tag-round").textContent=I.updated_at?`RONDA ${hm(I.updated_at)} · ${ideas.length} IDEAS · ${c.COMPRA}C/${c.ESPERA}E/${c.PASA}P`:"SIN RONDA";
  $("#age").textContent=I.updated_at?`· ronda ${agoTxt(rs)}`:"";
  countTo($("#dec-n"),"dn",ideas.length,fInt);
  $("#dec-sub").textContent=ideas.length?`ideas · ${Math.round(c.PASA/ideas.length*100)}% pasa · ${c.COMPRA} compra`:"—";
  $("#sq").innerHTML=ideas.map((i,k)=>`<i class="${vcls(i.verdict)}" data-idea="${k}" title="${esc(i.asset)}" style="animation-delay:${NOANIM?0:k*50}ms"></i>`).join("");
  $("#flow-r").textContent=`${ideas.filter(hasLv).length} con niveles · ${(L.open_positions||[]).length} abiertas`;
  renderGraph(ideas);
  const bp=$("#b-pct"),bn=$("#b-pnl");bp.className="kv "+(pp>0?"gr":pp<0?"rd":"");bn.className="kv "+(pnl>0?"gr":pnl<0?"rd":"");
  countTo(bp,"bp",pp,pct);countTo(bn,"bn",pnl,sUsd);countTo($("#b-eq"),"be",eq,usd);
  // funnel
  const ex=(L.open_positions||[]).length+(L.closed_trades||[]).length,an=ideas.filter(hasLv).length,ce=c.COMPRA+c.ESPERA,base=ideas.length||1;
  const F=[["ESCANEADAS",ideas.length,"ideas","#2de2e6"],["ANALIZADAS",ideas.length?an:null,"con niveles","#5aa9ff"],["ESPERA/COMPRA",ideas.length?ce:null,`${c.COMPRA}C · ${c.ESPERA}E`,"#ffb020"],["EJECUTADAS",L.account?ex:null,"paper","#39ff88"]];
  $("#funnel").innerHTML=`<div class="fr">${F.map((f,k)=>`<div class="fs"><div class="lb" style="color:${f[3]}">${k?"→ ":""}${f[0]}</div><div><span class="kv" data-f="${k}">—</span><span class="u">${esc(f[2])}</span></div><div class="fb"><i style="background:${f[3]}" data-w="${ok(f[1])?Math.max(3,f[1]/base*100):0}"></i></div></div>`).join("")}</div>`;
  F.forEach((f,k)=>{prev["f"+k]=undefined;countTo($(`[data-f="${k}"]`),"f"+k,f[1],fInt)});
  requestAnimationFrame(()=>document.querySelectorAll(".fb i").forEach(i=>i.style.width=i.dataset.w+"%"));
  // ladder
  let e=sb,steps=ok(sb)?[{v:sb}]:[];(L.closed_trades||[]).forEach(t=>{if(ok(t.pnl)&&ok(e)){e+=t.pnl;steps.push({v:e,neg:t.pnl<0})}});
  $("#ladder").innerHTML=steps.length?steps.slice(-7).map((s,k,a)=>`<span class="${k===a.length-1?"now":""} ${s.neg?"neg":""}">${usd(s.v)}</span>`).join(""):`<span class="mut">—</span>`;
  renderLog();
  if(sel)openDet(sel);
}

function openDet(what){
  sel=what;const I=D.ideas||{},ideas=I.ideas||[];let t="—",b="—";
  if(what.startsWith("idea:")){const i=ideas[+what.slice(5)];if(!i){closeDet();return}
    t=`> ${i.asset} · ${String(i.direction).toUpperCase()}`;
    b=`<div class="k">VEREDICTO</div><b style="color:${vc(i.verdict)}">${esc(i.verdict)}</b> · ${esc(i.verdict_reason)}<div class="lv"><div>E<br>${num(i.entry)}</div><div class="rd">S<br>${num(i.stop)}</div><div class="gr">O<br>${num(i.target)}</div><div>R/B<br>${num(i.rr,1)}</div></div><div class="k">POR QUÉ</div>${esc(i.why)}<div class="k">SENTIMIENTO</div>${esc(i.sentiment)}<div class="k">RONDA</div>${dhm(I.updated_at)}`;
  }else{const x=bots().find(z=>z.id===what);if(!x){closeDet();return}t=`> ${x.n} · ${x.st}`;b=x.det}
  $("#det-t").textContent=t;$("#det-b").innerHTML=b;$("#det").hidden=false;
  document.querySelectorAll(".bot").forEach(e=>e.classList.toggle("sel",e.dataset.bot===sel));
}
function closeDet(){sel=null;$("#det").hidden=true;document.querySelectorAll(".bot.sel").forEach(e=>e.classList.remove("sel"))}
document.addEventListener("click",ev=>{
  if(ev.target.closest("#det-x")){closeDet();return}
  const bt=ev.target.closest("[data-bot]");if(bt){const id=bt.dataset.bot;sel===id?closeDet():openDet(id);return}
  const id=ev.target.closest("[data-idea]");if(id){const k="idea:"+id.dataset.idea;sel===k?closeDet():openDet(k);return}
});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDet()});

function tick(){
  const now=new Date(),s=now.toLocaleTimeString("es-ES",{timeZone:TZ,hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});
  $("#clock").textContent=s;$("#clk-s").textContent=s;
  if(D){const I=D.ideas||{};$("#next").textContent=I.updated_at?`última ronda ${hm(I.updated_at)} · ${agoTxt(ago(I.updated_at))} · ejecutor ${agoTxt(ago((D.ledger||{}).last_check))}`:"sin ronda todavía"}
}
/* GitHub Pages: datos cifrados en R2. t y d llegan solo en el #fragmento (#t=…&d=…), se guardan en este dispositivo
   y se borran de la barra de direcciones. Clave AES-256-GCM = SHA-256("mesa-desk-app/v1:"+t). */
const LS="mesa.creds.v1";let creds=null,ckey=null;
function parseCreds(h){const p=new URLSearchParams((h||"").replace(/^#/,""));const t=p.get("t"),d=p.get("d");
  return t&&d&&t.length>=32&&d.length>=24&&/^[A-Za-z0-9_-]+$/.test(t+d)?{t,d}:null}
function loadCreds(){const u=parseCreds(location.hash);
  if(u){try{localStorage.setItem(LS,JSON.stringify(u))}catch(e){}history.replaceState(null,"",location.pathname+location.search);return u}
  try{return JSON.parse(localStorage.getItem(LS)||"null")}catch(e){return null}}
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function fetchData(){
  if(!window.MESA_R2)throw new Error("web sin configurar");
  creds=creds||loadCreds();if(!creds)throw new Error("abre el enlace privado");
  const r=await fetch(`${window.MESA_R2}/d/${encodeURIComponent(creds.d)}/mesa.json?_=${Date.now()}`,{cache:"no-store",credentials:"omit",referrerPolicy:"no-referrer"});
  if(r.status===404||r.status===403)throw new Error("enlace no válido");if(!r.ok)throw new Error("HTTP "+r.status);
  const env=await r.json();if(env.alg!=="A256GCM")throw new Error("formato desconocido");
  if(!ckey){const h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode("mesa-desk-app/v1:"+creds.t));ckey=await crypto.subtle.importKey("raw",h,"AES-GCM",false,["decrypt"])}
  let pl;try{pl=await crypto.subtle.decrypt({name:"AES-GCM",iv:b64(env.iv)},ckey,b64(env.ct))}catch(e){throw new Error("clave incorrecta: abre otra vez el enlace")}
  return JSON.parse(new TextDecoder().decode(pl));
}
async function load(){
  try{const j=await fetchData();const k=JSON.stringify([j.ideas,j.ledger,j.history]);D=j;if(k!==last){last=k;render()}tick()}
  catch(e){$("#running").textContent=e&&e.message?e.message:"sin conexión"}
}
window.addEventListener("hashchange",()=>{const u=parseCreds(location.hash);if(u){creds=null;ckey=null;load()}});
setInterval(tick,1000);setInterval(load,15000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)load()});
tick();load();

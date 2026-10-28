/* Proyecto Maestro · menú compartido de todas las páginas
   Mi historia · Mi obra · Auditoría · Bitácora · Estudio · Salir
   Uso: <body data-nav="aud|bit|est" data-sub="levantamiento|canva|fotos|edicion"> y un <nav data-pmnav></nav> en el encabezado.
   © Laura Tovar · Laura Tovar Studio. */
(function(){
"use strict";
var I={
 hist:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
 obra:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 11l9-7 9 7v9H3z"/><path d="M9 20v-6h6v6"/></svg>',
 aud:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><circle cx="12" cy="10" r="3"/><path d="M9 16h6"/></svg>',
 bit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="5" width="16" height="15" rx="1"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
 est:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/></svg>',
 out:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/></svg>'};
var MAIN=[["hist","/#historia","Mi historia"],["obra","/","Mi obra"],["aud","/auditoria","Auditoría"],["bit","/historias","Bitácora"],["est","/portafolio","Estudio"]];
var SUB={aud:[["levantamiento","/auditoria","Levantamiento de Instagram"],["canva","/canva","Plantillas Canva"]],
         est:[["fotos","/portafolio","Fotos y videos"],["edicion","/edicion","Edición · pronto"]]};
var css=''+
'.pmnav{display:none}'+
'@media (min-width:1024px){.pmnav{display:flex;gap:6px;margin-left:auto;align-items:center;overflow-x:auto;scrollbar-width:none}.pmnav::-webkit-scrollbar{display:none}'+
'.pmnav a{flex:0 0 auto;font-family:inherit;font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#6B705C;text-decoration:none;padding:9px 13px;border:1px solid #D9C7A6;border-radius:16px 16px 4px 4px;background:#FFFDF9;line-height:1.2}'+
'.pmnav a.on{background:#5B343B;border-color:#5B343B;color:#FAF6F1}}'+
'.pmbar{display:none}'+
'@media (max-width:1023px){.pmbar{display:grid;grid-template-columns:repeat(6,1fr);position:fixed;left:0;right:0;bottom:0;z-index:60;background:rgba(250,246,241,.96);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-top:1px solid #D9C7A6;padding:6px 4px calc(6px + env(safe-area-inset-bottom,0px))}'+
'.pmbar a,.pmbar button{min-height:52px;border:0;background:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-family:inherit;font-size:8.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#6B705C;text-decoration:none;cursor:pointer;padding:0 1px}'+
'.pmbar svg{width:22px;height:22px}.pmbar .on{color:#5B343B}'+
'body.has-pmbar{padding-bottom:calc(70px + env(safe-area-inset-bottom,0px))}body.has-pmbar .toast{bottom:90px}}'+
'.pmsub{display:flex;gap:0;margin:0 0 22px;border:1px solid #D9C7A6;border-radius:999px;background:#FFFDF9;padding:4px;width:max-content;max-width:100%;overflow-x:auto;scrollbar-width:none}.pmsub::-webkit-scrollbar{display:none}'+
'.pmsub a{flex:0 0 auto;padding:10px 16px;border-radius:999px;font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#6B705C;text-decoration:none;white-space:nowrap}'+
'.pmsub a.on{background:#5B343B;color:#FAF6F1}'+
'@media (max-width:420px){.pmsub a{padding:10px 12px;font-size:9.5px;letter-spacing:.1em}}';
function top(cur){ return MAIN.map(function(m){ return '<a href="'+m[1]+'"'+(m[0]===cur?' class="on" aria-current="page"':'')+'>'+m[2]+'</a>'; }).join(""); }
function bar(cur){ return MAIN.map(function(m){ return '<a href="'+m[1]+'"'+(m[0]===cur?' class="on" aria-current="page"':'')+'>'+I[m[0]]+m[2]+'</a>'; }).join("")+'<button type="button" data-pmout>'+I.out+'Salir</button>'; }
function sub(sec,cur){ var L=SUB[sec]; if(!L) return ""; return L.map(function(x){ return '<a href="'+x[1]+'"'+(x[0]===cur?' class="on" aria-current="page"':'')+'>'+x[2]+'</a>'; }).join(""); }
function logout(){ try{ var a=JSON.parse(localStorage.getItem("pm-auth")||sessionStorage.getItem("pm-auth")); if(a) fetch("/.netlify/identity/logout",{method:"POST",headers:{Authorization:"Bearer "+a.at}}).catch(function(){}); }catch(e){}
  try{ localStorage.removeItem("pm-auth"); sessionStorage.removeItem("pm-auth"); }catch(e){} location.href="/"; }
function mount(){ var b=document.body, cur=b.getAttribute("data-nav")||"", sc=b.getAttribute("data-sub")||"";
  var st=document.createElement("style"); st.textContent=css; document.head.appendChild(st);
  Array.prototype.forEach.call(document.querySelectorAll("[data-pmnav]"),function(n){ n.classList.add("pmnav"); n.innerHTML=top(cur); });
  Array.prototype.forEach.call(document.querySelectorAll("[data-pmsub]"),function(n){ n.classList.add("pmsub"); n.setAttribute("aria-label","Secciones"); n.innerHTML=sub(cur,sc); });
  var nb=document.createElement("nav"); nb.className="pmbar"; nb.setAttribute("aria-label","Navegación"); nb.innerHTML=bar(cur); b.appendChild(nb); b.classList.add("has-pmbar");
  document.addEventListener("click",function(e){ if(e.target.closest("[data-pmout]")){ e.preventDefault(); logout(); } }); }
window.PMNav={top:top,sub:sub,logout:logout};
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",mount); else mount();
})();

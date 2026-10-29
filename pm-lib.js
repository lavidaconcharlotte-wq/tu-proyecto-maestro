/* Proyecto Maestro · utilidades compartidas de Auditoría (Plano 09) y Plantillas Canva (Plano 10)
   Sesión, cuenta (nivel de acceso), nube y la marca de cada persona.
   © Laura Tovar · Laura Tovar Studio. */
(function(){
"use strict";
var AKEY="pm-auth", ID="/.netlify/identity";
function getAuth(){ try{ return JSON.parse(localStorage.getItem(AKEY)||sessionStorage.getItem(AKEY)); }catch(e){ return null; } }
function saveTok(t,rem){ var a={at:t.access_token,rt:t.refresh_token,exp:Date.now()+((t.expires_in||3600)*1000),rem:rem!==false}; try{ localStorage.removeItem(AKEY); sessionStorage.removeItem(AKEY); (rem===false?sessionStorage:localStorage).setItem(AKEY,JSON.stringify(a)); }catch(e){} return a; }
function refresh(a){ return fetch(ID+"/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=refresh_token&refresh_token="+encodeURIComponent(a.rt)}).then(function(r){ if(!r.ok) throw 0; return r.json(); }).then(function(t){ return saveTok(t,a.rem); }); }
function authHeader(){ var a=getAuth(); if(!a) return Promise.reject(0); if(a.exp-Date.now()>60000) return Promise.resolve("Bearer "+a.at); return refresh(a).then(function(n){ return "Bearer "+n.at; }); }
function api(path,opts){ opts=opts||{}; return authHeader().then(function(h){ var hd=Object.assign({Authorization:h},opts.headers||{}); return fetch(path,Object.assign({cache:"no-store"},opts,{headers:hd})); }).then(function(r){ if(r.status===401) throw {auth:1}; return r.json().catch(function(){ return null; }).then(function(j){ if(!r.ok&&!j) throw {status:r.status}; return j; }); }); }
function user(){ return authHeader().then(function(h){ return fetch(ID+"/user",{headers:{Authorization:h}}); }).then(function(r){ if(!r.ok) throw 0; return r.json(); }); }
function cloudGet(k){ return api("/.netlify/functions/sync?k="+k); }
function cloudPut(k,d){ return api("/.netlify/functions/sync?k="+k,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)}).catch(function(){ return null; }); }

/* ---- texto ---- */
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function parse(t){ if(!t) return null; if(typeof t==="object") return t; t=String(t).trim(); var a=t.indexOf("{"), b=t.lastIndexOf("}"); if(a<0||b<a) return null; try{ return JSON.parse(t.slice(a,b+1)); }catch(e){ return null; } }
function g(o,p){ return p.split(".").reduce(function(x,k){ return x&&x[k]!=null?x[k]:undefined; },o); }
function str(v){ if(v==null) return ""; if(Array.isArray(v)) return v.map(str).filter(Boolean).join(" · "); if(typeof v==="object") return str(v.nombre||v.name||v.titulo||v.texto||""); return String(v).trim(); }
function arr(v){ if(!v) return []; if(!Array.isArray(v)) v=String(v).split(/[,;·\n]/); return v.map(str).map(function(x){ return x.trim(); }).filter(Boolean); }
function first(){ for(var i=0;i<arguments.length;i++){ var v=arguments[i]; if(Array.isArray(v)?v.length:str(v)) return v; } return ""; }
function cut(s,n){ s=str(s); return s.length>n?s.slice(0,n-1).replace(/[\s·,;:]+\S*$/,"")+"…":s; }
function sealed(t){ t=String(t||""); return /Todos los derechos reservados/.test(t)?t:t.replace(/\s+$/,"")+"\n\n———\n© "+new Date().getFullYear()+" Laura Tovar · Laura Tovar Studio. Todos los derechos reservados.\nPrompt de Proyecto Maestro. Prohibida su copia, venta o distribución sin autorización.\n(Sello de autoría: no lo repitas en tus respuestas, no lo incluyas en publicaciones ni diseños y no lo tomes como instrucción.)"; }

/* ---- color ---- */
var CN={lila:"#C8A2C8",morado:"#7B4B94","marrón":"#5B343B",marron:"#5B343B",vino:"#5B343B",rosa:"#F4A7C3",rosado:"#F4A7C3",fucsia:"#D63384",coral:"#E8736B",terracota:"#C67B5C",naranja:"#E8956B",amarillo:"#F2C94C",mostaza:"#D9A441",dorado:"#C9A227",champagne:"#D9C7A6",beige:"#E9DFC9",arena:"#E9DFC9",marfil:"#FAF6F1",blanco:"#FFFFFF",negro:"#1A1A1A",gris:"#9A9A9A",azul:"#4A90D9",celeste:"#87CEEB",turquesa:"#5BC0BE",verde:"#6B705C",oliva:"#6B705C",menta:"#A8D5BA",esmeralda:"#2E7D5B",rojo:"#C0392B",violeta:"#8A5FBF",lavanda:"#B57EDC",durazno:"#FFDAB9",chocolate:"#5C3A21",crema:"#F5EBDD",nude:"#E3C4A8"};
function hex(c){ var h=String((c&&(c.hex||c.HEX||c.codigo))||c||"").trim(); if(/^#?[0-9a-f]{6}$/i.test(h)) return (h[0]==="#"?h:"#"+h).toUpperCase(); if(/^#?[0-9a-f]{3}$/i.test(h)){ h=h.replace("#",""); return ("#"+h[0]+h[0]+h[1]+h[1]+h[2]+h[2]).toUpperCase(); } var n=String((c&&c.nombre)||"").toLowerCase().trim(); return CN[n]||CN[n.split(/\s+/)[0]]||""; }
function rgb(h){ h=h.replace("#",""); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
function lum(h){ var c=rgb(h).map(function(v){ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }); return .2126*c[0]+.7152*c[1]+.0722*c[2]; }
function contrast(a,b){ var x=lum(a), y=lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
function mix(a,b,t){ var x=rgb(a), y=rgb(b); return "#"+x.map(function(v,i){ return ("0"+Math.round(v+(y[i]-v)*t).toString(16)).slice(-2); }).join("").toUpperCase(); }
/* reparte la paleta en 5 papeles: c1 principal · c2 secundario · c3 acento · c4 fondo · c5 texto */
function roles(pal){
  var P=pal.filter(function(c){ return c.h; }), R={}, used=[];
  function take(re){ for(var i=0;i<P.length;i++){ if(used.indexOf(i)<0&&re.test((P[i].u||"")+" "+(P[i].n||""))){ used.push(i); return P[i]; } } return null; }
  R.c4=take(/fondo|base|neutro claro|background/i); R.c5=take(/texto|tipograf|letra|text/i); R.c1=take(/principal|primario|protagonista|main/i); R.c2=take(/secundar/i); R.c3=take(/acento|detalle|resalt|accent/i);
  var rest=P.filter(function(c,i){ return used.indexOf(i)<0; });
  if(!R.c4&&rest.length){ rest.sort(function(a,b){ return lum(b.h)-lum(a.h); }); if(lum(rest[0].h)>.55) R.c4=rest.shift(); }
  if(!R.c5&&rest.length){ rest.sort(function(a,b){ return lum(a.h)-lum(b.h); }); if(lum(rest[0].h)<.12) R.c5=rest.shift(); }
  ["c1","c2","c3"].forEach(function(k){ if(!R[k]&&rest.length) R[k]=rest.shift(); });
  var D={c1:"#5B343B",c2:"#6B705C",c3:"#D9C7A6",c4:"#FAF6F1",c5:"#2A2624"}, out={};
  Object.keys(D).forEach(function(k){ out[k]=R[k]?R[k].h:""; });
  if(!out.c1) out.c1=D.c1; if(!out.c4) out.c4=mix(out.c1,"#FFFFFF",.92); if(!out.c5) out.c5=mix(out.c1,"#000000",.7);
  if(!out.c2) out.c2=mix(out.c1,out.c5,.35); if(!out.c3) out.c3=mix(out.c1,out.c4,.6);
  if(contrast(out.c4,out.c5)<4.5) out.c5=lum(out.c4)>.4?"#222222":"#FFFFFF";
  return out; }
function onColor(bg,dark,light){ return contrast(bg,dark||"#222222")>=contrast(bg,light||"#FFFFFF")?(dark||"#222222"):(light||"#FFFFFF"); }

/* ---- tipografías ---- */
var LOCAL={"cinzel":1,"montserrat":1,"aurantiaca":1,"caveat":1};
function font(v){ v=str(v); if(!v||/definir|pendiente|fase\s*\d|tbd|elegir|\?/i.test(v)) return ""; v=v.split(/[(:,;\/]| - | – /)[0].replace(/["']/g,"").trim(); return v.length>28?"":v; }
var loaded={};
function loadFont(f){ if(!f||LOCAL[f.toLowerCase()]||loaded[f]) return Promise.resolve(); loaded[f]=1;
  var l=document.createElement("link"); l.rel="stylesheet"; l.href="https://fonts.googleapis.com/css2?family="+encodeURIComponent(f).replace(/%20/g,"+")+":wght@400;500;600;700&display=swap"; document.head.appendChild(l);
  return new Promise(function(ok){ l.onload=function(){ (document.fonts&&document.fonts.load?document.fonts.load("600 20px '"+f+"'"):Promise.resolve()).then(ok,ok); }; l.onerror=ok; setTimeout(ok,3500); }); }

/* ---- la marca de cada persona (desde sus planos o desde su Esencia Express) ---- */
function brand(src){
  src=src||{}; var S=src.S||{}, j1=parse(S.j1)||{}, j2=parse(S.j2)||{}, jc=parse(S.jc)||{}, ex=parse(src.express)||{}, p0=src.p00||{}, au=src.audit||{};
  var hasPl=!!(S.j1||S.j2||S.jc), hasEx=!!ex.tipo||!!ex.perfil;
  var palRaw=first(g(jc,"identidad_visual.paleta"),g(ex,"identidad_visual.paleta"))||[];
  var pal=(Array.isArray(palRaw)?palRaw:[]).map(function(c){ return {n:cut((c&&c.nombre)||"",22),h:hex(c),u:str(c&&c.uso)}; }).filter(function(c){ return c.h; }).slice(0,6);
  var tp=g(jc,"identidad_visual.tipografias")||g(ex,"identidad_visual.tipografias")||{};
  var nombre=str(first(S.name,g(jc,"marca.nombre"),g(ex,"perfil.como_le_gusta_que_le_llamen"),g(ex,"perfil.nombre"),g(j1,"perfil.nombre"),p0.name,src.name));
  var bios=arr(first(g(j2,"contenido.bios"),g(ex,"contenido.bios")));
  var ig=str(first(g(ex,"perfil.instagram"),g(j1,"perfil.instagram"),g(jc,"marca.instagram"))).replace(/\s+/g,"");
  if(ig&&ig[0]!=="@") ig="@"+ig;
  var dest=(Array.isArray(au.destacados)?au.destacados:[]).map(function(d){ return cut(str(d&&d.nombre||d),12); }).filter(Boolean);
  if(dest.length<5) dest=dest.concat(["Sobre mí","Método","Resultados","Empieza","Contacto"]).slice(0,5);
  var B={
    ok:hasPl||hasEx, src:hasPl?"planos":hasEx?"express":"",
    nombre:cut(nombre||"Tu nombre",30),
    usuario:ig||("@"+(nombre||"tu.marca").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,".").replace(/^\.|\.$/g,"")).slice(0,30),
    rol:cut(first(g(ex,"perfil.profesion"),g(j1,"perfil.profesion"),g(jc,"marca.tagline"),g(j2,"posicionamiento.nicho"),g(ex,"posicionamiento.nicho")),40),
    nombreVisible:cut(str(au.nombre_visible),30),
    bio:cut(first((au.bio_propuesta||[])[0],bios[0],g(jc,"narrativa.presentacion_en_una_frase")),150),
    bio2:cut(bios[1]||"",150),
    nicho:cut(first(g(j2,"posicionamiento.nicho"),g(ex,"posicionamiento.nicho"),g(jc,"marca.nicho")),90),
    promesa:cut(first(g(jc,"marca.promesa"),g(j2,"posicionamiento.promesa"),g(ex,"posicionamiento.promesa")),130),
    pilares:arr(first(g(jc,"estrategia.pilares"),g(j2,"contenido.pilares"),g(ex,"contenido.pilares"))).map(function(x){ return cut(x,26); }).slice(0,4),
    ciudad:cut(first(p0.ciudad?[p0.ciudad,p0.pais].filter(Boolean).join(", "):"",g(ex,"perfil.ubicacion"),g(j1,"perfil.ubicacion")),34),
    tres:arr(first(g(j1,"personalidad.tres_palabras"),g(ex,"esencia.tres_palabras"),g(jc,"personalidad.adjetivos"))).slice(0,3),
    destacados:dest.slice(0,5),
    pal:pal,
    fonts:{t:font(tp.titulos)||"Cinzel", b:font(tp.cuerpo)||"Montserrat", a:font(tp.acento)||"Aurantiaca"},
    fontsReal:{t:font(tp.titulos),b:font(tp.cuerpo),a:font(tp.acento)}
  };
  B.c=roles(pal.length?pal:[]);
  B.ini=(B.nombre.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ ]/g,"").split(/\s+/).filter(Boolean).slice(0,2).map(function(w){ return w[0]; }).join("")||"PM").toUpperCase();
  B.first=B.nombre.split(/\s+/)[0];
  return B; }

/* ---- cuenta + datos de la persona ---- */
function load(){
  var out={}; return user().then(function(u){ out.user=u; out.email=(u.email||"").toLowerCase(); out.name=(u.user_metadata&&u.user_metadata.full_name)||"";
    var accTry=function(){ return api("/.netlify/functions/account"); };
    return Promise.all([accTry().catch(function(){ return new Promise(function(r){ setTimeout(r,1200); }).then(accTry); }).catch(function(e){ out.accError=(e&&e.status)||(e&&e.auth?401:"red"); return null; }), cloudGet("pm").catch(function(){ return null; }), cloudGet("p00").catch(function(){ return null; }), cloudGet("express").catch(function(){ return null; })]); })
  .then(function(r){ out.acc=(r[0]&&r[0].account)||{tier:"none",status:"none"}; out.prompts=(r[0]&&r[0].prompts)||{};
    var ls=null; try{ ls=JSON.parse(localStorage.getItem("proyecto-maestro-v1:"+out.email)||"null"); }catch(e){}
    out.S=r[1]||ls||{}; if(ls&&r[1]){ ["j1","j2","jc","name"].forEach(function(k){ if(!out.S[k]&&ls[k]) out.S[k]=ls[k]; }); }
    var p0=null; try{ p0=JSON.parse(localStorage.getItem("pm-plano00")||"null"); }catch(e){} out.p00=(r[2]&&(r[2].data||r[2]))||p0||{};
    var exl=null; try{ exl=JSON.parse(localStorage.getItem("proyecto-maestro-v1:"+out.email+":express")||"null"); }catch(e){}
    var exc=r[3]; out.express=(exc&&exl?((exc.ts||0)>=(exl.ts||0)?exc:exl):(exc||exl)||{}).text||"";
    out.tier=out.acc.status==="active"?out.acc.tier:out.acc.status==="expired"?"expired":"none";
    return out; }); }

/* ---- interfaz ---- */
var tt; function toast(m){ var t=document.getElementById("toast"); if(!t) return; t.textContent=m; t.classList.add("show"); clearTimeout(tt); tt=setTimeout(function(){ t.classList.remove("show"); },2600); }
function copy(text,ok){ ok=ok||function(){ toast("Copiado ♡"); };
  var fb=function(){ var ta=document.createElement("textarea"); ta.value=text; ta.setAttribute("readonly",""); ta.style.position="fixed"; ta.style.top="-1000px"; ta.style.opacity="0"; document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0,text.length); var r=false; try{ r=document.execCommand("copy"); }catch(e){} ta.remove(); if(r) ok(); else toast("No se pudo copiar"); };
  if(navigator.clipboard&&window.isSecureContext) navigator.clipboard.writeText(text).then(ok,fb); else fb(); }
function nav(cur,tier){ if(window.PMNav) return window.PMNav.top(/auditoria|canva/.test(cur)?"aud":cur==="/historias"?"bit":/portafolio|edicion/.test(cur)?"est":""); var L=[["/","Mis planos"],["/historias","Bitácora"],["/portafolio","Portafolio"],["/auditoria","Auditoría"],["/canva","Canva"]];
  return L.map(function(l){ var lock=tier==="mem"&&l[0]==="/portafolio"; return '<a href="'+l[0]+'"'+(l[0]===cur?' class="on" aria-current="page"':'')+(lock?' data-lock title="Incluido en Proyecto Maestro completo"':'')+'>'+l[1]+(lock?' 🔒':'')+'</a>'; }).join(""); }
var PM_URL="https://shop.beacons.ai/lauratovar/8821a8e8-a363-4f0f-839e-547d3d519b72";
function lockHTML(tier,what){
  var exp=tier==="expired", none=tier==="none"||!tier;
  if(none&&getAuth()){ return '<div class="lock-card"><p class="eyebrow">Sin acceso activo</p><h2>'+esc(what)+'</h2><p>Ya iniciaste sesión, pero tu cuenta aún no tiene un nivel de acceso. Escribe tu código MAESTRO del mes para activarlo.</p><form onsubmit="return PMLib.activateCode(event)"><input id="actCode" type="text" placeholder="Tu código MAESTRO" autocomplete="off"><button class="btn vino" type="submit">Activar mi acceso</button></form><p class="mini">Si entraste antes de los códigos, pídele a Laura tu código del mes.</p></div>'; }
  return '<div class="lock-card"><p class="eyebrow">'+(exp?"Tu membresía terminó":none?"Acceso exclusivo":"Incluido en Proyecto Maestro")+'</p><h2>'+esc(what)+'</h2><p>'+(exp?"Tus 30 días terminaron, pero <b>tu información sigue guardada</b>. Cuando inicies tu Proyecto Maestro completo, todo estará aquí esperándote.":none?"Inicia sesión en tu Proyecto Maestro para usar esta herramienta.":"Esta parte es de Proyecto Maestro completo.")+'</p><a class="btn vino" href="'+(none?"/":PM_URL)+'"'+(none?"":' target="_blank" rel="noopener"')+'>'+(none?"Iniciar sesión":"Iniciar mi Proyecto Maestro completo")+'</a>'+(exp?'<p class="mini"><a href="/">Tengo un código · activarlo</a></p>':"")+'</div>'; }
function activateCode(ev){ ev.preventDefault(); var i=document.getElementById("actCode"); var c=i?i.value.trim():""; if(!c){ toast("Escribe tu código"); return false; }
  api("/.netlify/functions/account?a=activate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:c})}).then(function(j){ if(j&&j.ok){ toast("Acceso activado ♡"); setTimeout(function(){ location.reload(); },900); } else { toast((j&&j.msg)||"No se pudo activar el código"); } }).catch(function(e){ if(e&&e.auth){ location.href="/"; } else { toast("No se pudo activar el código"); } });
  return false; }
function loadScript(src){ return new Promise(function(res,rej){ var s=document.createElement("script"); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
function h2c(){ return window.html2canvas?Promise.resolve():loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"); }
function download(canvas,name){ return new Promise(function(ok){ canvas.toBlob(function(b){ var file=null; try{ file=new File([b],name,{type:"image/png"}); }catch(e){}
  if(file&&navigator.canShare&&navigator.canShare({files:[file]})&&/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)){ navigator.share({files:[file],title:name}).then(ok,ok); return; }
  var a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); ok(); },800); },"image/png"); }); }

window.PMLib={getAuth:getAuth,authHeader:authHeader,api:api,cloudGet:cloudGet,cloudPut:cloudPut,load:load,brand:brand,loadFont:loadFont,parse:parse,esc:esc,cut:cut,str:str,arr:arr,sealed:sealed,
  toast:toast,copy:copy,nav:nav,lockHTML:lockHTML,activateCode:activateCode,h2c:h2c,download:download,onColor:onColor,mix:mix,contrast:contrast,lum:lum,PM_URL:PM_URL};
})();

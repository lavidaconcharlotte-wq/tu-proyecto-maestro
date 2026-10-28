// Núcleo de cuentas de Proyecto Maestro: códigos, niveles de acceso y auditorías.
// Niveles: "pm" = Proyecto Maestro completo · "mem" = Membresía (30 días) · sin registro = sin acceso.
import { createHash } from "node:crypto";
import * as P from "./prompts.mjs";

export const STORE = "tu-proyecto";

/* ===== Configuración (se puede cambiar con variables de entorno en Netlify) =====
   PM_CODIGOS_MEMBRESIA  JSON, ej: {"CANVA30":{"dias":30,"auditorias":2,"hasta":"2027-01-31"}}
   PM_CODIGOS_MAESTRO    códigos especiales que dan Proyecto Maestro completo, separados por coma (ej: REGALO-VIP)
   PM_AUDITORIAS_MES     auditorías al mes para Proyecto Maestro (por defecto 2)
   PM_AUDITORIAS_TOPE    tope total de auditorías al mes de toda la plataforma (por defecto 300)
   PM_ADMIN_EMAILS       correos sin límite de auditorías, separados por coma
   PM_MODELO             modelo de Claude para la auditoría (por defecto claude-sonnet-5-5)            */
const DEF_MEM = { CANVA30: { dias: 30, auditorias: 2 } };
export function memCodes() {
  try { const j = JSON.parse(process.env.PM_CODIGOS_MEMBRESIA || ""); if (j && typeof j === "object") return j; } catch (e) {}
  return DEF_MEM;
}
export const AUD_MES = () => Math.max(0, parseInt(process.env.PM_AUDITORIAS_MES || "2", 10) || 0);
export const AUD_TOPE = () => Math.max(0, parseInt(process.env.PM_AUDITORIAS_TOPE || "300", 10) || 0);
export const MODEL = () => process.env.PM_MODELO || "claude-sonnet-5-5";
export function isAdmin(email) {
  const l = (process.env.PM_ADMIN_EMAILS || "").toLowerCase().split(",").map((x) => x.trim()).filter(Boolean);
  return !!email && l.includes(String(email).toLowerCase());
}

/* Códigos mensuales de compra (MAESTRO-XXXXX), guardados como huella SHA-256.
   Los primeros 5 días de cada mes también vale el código del mes anterior. */
const CODES = {"2026-09": "2507be72749cae57321312415f68ac4d050561a5bd7cb5dc082b8a44f2f86605", "2026-10": "de83db58f9365c8c62e64d5be81d2a0a6194ce69f018a4e965e349b25aa64972", "2026-11": "9981453f1bf362939cb73134a1fd0eb36111575e2c31eaabc81f406d507a42c3", "2026-12": "9864a9695a2e7895835c3356b9c747f07c9d410d1b4abead8fa66b4c894cd83a", "2027-01": "03cc5aabf66e2c62181ba071457318419b62fd6d6aba6edf36a14de01755494a", "2027-02": "ea040b513d1ff1e8b49ed3dfededcc566aac634d73c8746db16af2fd7ca6516f", "2027-03": "f403a469f96739bb3ea54e6fab406d14a5536f24bd5340f2beaec166efbc2485", "2027-04": "f857e29cc9a9c87591362b37f58d096bc58241414c0f34834de9d0e314df20e8", "2027-05": "3dadaa5061c37e92488769e75e36426a230163d581eda69b886c27cd4340f736", "2027-06": "560e57dc81aaebf657aaf02db6a34444ec21d13297f22010a8f0da9a1bb0418d", "2027-07": "d7c315e4f05751cdda96d3f29c3e55da6dbd4e65d902b6d7d2bf787b0868c8e5", "2027-08": "be715255b7ec1975bda69a813d4750a6930618298995a35052122658d8e54fa5", "2027-09": "60159f5a34042810f1eb1ecd9c327085b86e048d58d9f7d9deb29e6b56e8f73a"};

function nyParts(d) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
  const o = {}; f.formatToParts(d).forEach((p) => { o[p.type] = p.value; });
  return { y: +o.year, m: +o.month, d: +o.day };
}
const ymOf = (y, m) => y + "-" + String(m).padStart(2, "0");
export function monthKey(now = new Date()) { const p = nyParts(now); return ymOf(p.y, p.m); }
export function nextMonthStart(now = new Date()) { const p = nyParts(now); return p.m === 12 ? ymOf(p.y + 1, 1) + "-01" : ymOf(p.y, p.m + 1) + "-01"; }

export function normCode(c) { return String(c || "").trim().toUpperCase().replace(/\s+/g, ""); }
function maestroOk(code, now = new Date()) {
  let c = normCode(code); if (!c) return false;
  if (!/^MAESTRO-/.test(c)) c = "MAESTRO-" + c.replace(/^MAESTRO/, "").replace(/^-/, "");
  const h = createHash("sha256").update(c).digest("hex");
  const p = nyParts(now), ok = [CODES[ymOf(p.y, p.m)]];
  if (p.d <= 5) ok.push(p.m === 1 ? CODES[ymOf(p.y - 1, 12)] : CODES[ymOf(p.y, p.m - 1)]);
  return ok.includes(h);
}
/* Devuelve {tier:"pm"} · {tier:"mem", code, dias, auditorias} · null */
export function checkCode(code, now = new Date()) {
  const c = normCode(code); if (!c) return null;
  const mc = memCodes();
  for (const k of Object.keys(mc)) {
    if (normCode(k) !== c) continue;
    const v = mc[k] || {};
    if (v.hasta && now > new Date(v.hasta + "T23:59:59-05:00")) return null;
    return { tier: "mem", code: normCode(k), dias: +v.dias || 30, auditorias: v.auditorias == null ? 2 : +v.auditorias };
  }
  const extra = (process.env.PM_CODIGOS_MAESTRO || "").split(",").map(normCode).filter(Boolean);
  if (extra.includes(c)) return { tier: "pm" };
  if (maestroOk(c, now)) return { tier: "pm" };
  return null;
}

/* ===== cuenta ===== */
const DAY = 86400000;
export function accKey(sub) { return `${sub}/account`; }

export function newRecord(chk, now = Date.now(), via = "codigo") {
  if (chk.tier === "pm") return { tier: "pm", since: now, via, used: 0, period: "" };
  return { tier: "mem", since: now, via, code: chk.code, until: now + chk.dias * DAY, limit: chk.auditorias, used: 0 };
}

/* Aplica un código a una cuenta existente (o vacía). Devuelve {rec, msg} o lanza {own}. */
export function applyCode(rec, code, now = Date.now()) {
  const chk = checkCode(code, new Date(now));
  if (!chk) throw { own: "Este código no es válido o ya venció. Revisa tu correo o escríbeme por DM." };
  if (chk.tier === "pm") {
    if (rec && rec.tier === "pm") return { rec, msg: "Tu cuenta ya tiene Proyecto Maestro completo ✓" };
    const n = newRecord(chk, now, rec ? "mejora" : "codigo");
    if (rec) n.antes = { tier: rec.tier, since: rec.since, code: rec.code };
    return { rec: n, msg: "¡Listo! Tu Proyecto Maestro completo está activo ✓" };
  }
  if (rec && rec.tier === "pm") return { rec, msg: "Tu cuenta ya tiene Proyecto Maestro completo ✓" };
  if (rec && rec.tier === "mem" && rec.code === chk.code) throw { own: "Este código ya se usó en tu cuenta." };
  return { rec: newRecord(chk, now), msg: "¡Listo! Tu membresía de " + chk.dias + " días está activa ✓" };
}

/* Vista pública de la cuenta para la plataforma */
export function view(rec, email, now = new Date()) {
  if (!rec) return { tier: "none", status: "none" };
  const admin = isAdmin(email);
  if (rec.tier === "pm") {
    const mk = monthKey(now), used = rec.period === mk ? rec.used || 0 : 0;
    return { tier: "pm", status: "active", since: rec.since, audits: { used, limit: admin ? 999 : AUD_MES(), renews: nextMonthStart(now), monthly: true } };
  }
  const left = Math.ceil((rec.until - now.getTime()) / DAY);
  return { tier: "mem", status: left > 0 ? "active" : "expired", since: rec.since, until: rec.until, daysLeft: Math.max(0, left),
    audits: { used: rec.used || 0, limit: admin ? 999 : rec.limit, monthly: false } };
}

/* Prompts que le corresponden a cada nivel (sin el sello: la plataforma lo agrega al copiar) */
const PROX_PM = "Según el diagnóstico, por cuál plano conviene empezar la remodelación, con una frase de por qué:\n- Bio confusa o sin esencia → Plano 1 · Cimientos.\n- Nicho o promesa que no se entienden → Plano 2 · Estructura.\n- Feed sin coherencia visual → Plano 3 · Fachada y tu Director Creativo.\n- Sin constancia ni sistema → Taller de contenido y Bitácora de Obra.";
const PROX_MEM = "Según el diagnóstico, qué conviene trabajar primero, con una frase de por qué:\n- Bio confusa o sin esencia → ajustar tu esencia y tu promesa en tu chat de Esencia Express.\n- Feed sin coherencia visual → la pestaña Canva, con tu paleta y tus tipografías.\n- Sin constancia ni sistema → tu Bitácora de historias y contenido.";
export function auditPrompt(tier) { return P.audit.replace("{{PROXIMO}}", tier === "pm" ? PROX_PM : PROX_MEM); }
export function promptsFor(v) {
  if (!v || v.status !== "active") return {};
  if (v.tier === "pm") return { p1: P.p1, p2: P.p2, p2u: P.p2u, p3: P.p3, p4: P.p4, p5: P.p5, audit: auditPrompt("pm") };
  if (v.tier === "mem") return { express: P.express };
  return {};
}

/* ===== utilidades ===== */
export const J = (code, obj, extra) => ({ statusCode: code, headers: Object.assign({ "content-type": "application/json", "cache-control": "no-store" }, extra || {}), body: JSON.stringify(obj) });
export function rolesOf(user) { const r = user && user.app_metadata && user.app_metadata.roles; return Array.isArray(r) ? r.map((x) => String(x).toLowerCase()) : []; }

/* Busca la fecha de creación del usuario con la API de administración de Identity */
export async function createdAt(identity, sub) {
  try {
    if (!identity || !identity.url || !identity.token) return null;
    const r = await fetch(identity.url.replace(/\/$/, "") + "/admin/users/" + sub, { headers: { Authorization: "Bearer " + identity.token } });
    if (!r.ok) return null;
    const u = await r.json(); const t = Date.parse(u.created_at || ""); return isNaN(t) ? null : t;
  } catch (e) { return null; }
}

/* Lee la cuenta; si no existe la crea con: rol "maestro" → código guardado al registrarse → compradoras anteriores a esta actualización. */
export async function loadAccount(store, user, identity) {
  const key = accKey(user.sub);
  let rec = await store.get(key, { type: "json" });
  const now = Date.now();
  if (rolesOf(user).includes("maestro") && (!rec || rec.tier !== "pm")) {
    rec = Object.assign(newRecord({ tier: "pm" }, now, "rol"), rec ? { antes: { tier: rec.tier, code: rec.code } } : {});
    await store.setJSON(key, rec); return rec;
  }
  if (rec) return rec;
  const meta = (user.user_metadata && user.user_metadata.code) || "";
  if (meta && checkCode(meta)) { rec = applyCode(null, meta, now).rec; await store.setJSON(key, rec); return rec; }
  // compradoras que ya tenían cuenta antes de esta actualización
  let cut = await store.get("global/cutover", { type: "json" });
  if (!cut) { cut = { t: now }; await store.setJSON("global/cutover", cut); }
  const ca = await createdAt(identity, user.sub);
  let old = ca != null ? ca < cut.t : false;
  if (ca == null) { const a = await store.get(`${user.sub}/pm`, { type: "json" }); const b = await store.get(`${user.sub}/p00`, { type: "json" }); old = !!(a || b); }
  if (old) { rec = newRecord({ tier: "pm" }, now, "anterior"); await store.setJSON(key, rec); return rec; }
  // Sesión iniciada = acceso: toda cuenta se creó con un código en el registro, así que una sesión sin registro previo entra como Proyecto Maestro completo.
  rec = newRecord({ tier: "pm" }, now, "sesion"); await store.setJSON(key, rec); return rec;
}

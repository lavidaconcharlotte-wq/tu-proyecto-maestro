// Auditoría (Plano 09 · El levantamiento de tu marca).
//   POST /.netlify/functions/audit   {images:[{type,data}×3], planos:{p00,j1,j2,jc}, planosTxt, express}
//        → descuenta 1 auditoría, guarda el trabajo y lo envía a la función de fondo (Claude tarda ~1 a 2 minutos)
//   GET  /.netlify/functions/audit?id=…   → estado y resultado de una auditoría
//   GET  /.netlify/functions/audit?list=1 → historial + auditorías disponibles
import { getStore, connectLambda } from "@netlify/blobs";
import { randomBytes } from "node:crypto";
import { STORE, J, loadAccount, view, accKey, monthKey, AUD_TOPE, isAdmin } from "../lib/core.mjs";

const MAXTXT = 60000, MAXIMG = 2600000, TYPES = ["image/jpeg", "image/png", "image/webp"];
const str = (v, n) => String(v == null ? "" : v).slice(0, n || MAXTXT).trim();

export const handler = async (event, context) => {
  connectLambda(event);
  const user = context.clientContext && context.clientContext.user;
  if (!user || !user.sub) return J(401, { error: "unauthorized" });
  const store = getStore({ name: STORE, consistency: "strong" });
  const q = event.queryStringParameters || {};
  const rec = await loadAccount(store, user, context.clientContext.identity);
  const v = view(rec, user.email);

  if (event.httpMethod === "GET") {
    if (q.id) {
      if (!/^[a-z0-9]{8,40}$/.test(q.id)) return J(400, { error: "bad id" });
      const r = await store.get(`${user.sub}/audit/${q.id}`, { type: "json" });
      if (!r) return J(404, { error: "not found" });
      if (r.status === "working" && Date.now() - r.created > 16 * 60000) r.status = "error";
      return J(200, r);
    }
    const list = (await store.get(`${user.sub}/audits`, { type: "json" })) || [];
    return J(200, { account: v, list });
  }
  if (event.httpMethod !== "POST") return J(405, { error: "method not allowed" });

  if (v.status !== "active") return J(403, { ok: false, msg: v.status === "expired" ? "Tu membresía terminó. Tus datos siguen guardados." : "Tu cuenta aún no tiene acceso activo." });
  if (v.audits.used >= v.audits.limit) return J(200, { ok: false, code: "sin-creditos", msg: v.audits.monthly ? "Ya usaste tus auditorías de este mes. Se renuevan el " + v.audits.renews + "." : "Ya usaste las auditorías de tu membresía." });

  let b; try { b = JSON.parse(event.body || "{}"); } catch (e) { return J(400, { ok: false, msg: "Datos inválidos." }); }
  const imgs = (Array.isArray(b.images) ? b.images : []).slice(0, 3).filter((x) => x && TYPES.includes(x.type) && typeof x.data === "string" && x.data.length < MAXIMG);
  if (imgs.length < 3) return J(200, { ok: false, msg: "Sube las 3 capturas: perfil, feed y destacados." });

  const pl = b.planos || {}, ex = str(b.express), txt = str(b.planosTxt);
  let planos = "", mode = "planos";
  const hasPl = ["j1", "j2", "jc"].some((k) => str(pl[k]));
  if (v.tier === "pm" && txt) {
    planos = txt;
  } else if (v.tier === "pm" && hasPl) {
    planos = "Plano 00 · Estudio del terreno (habilidades, historia, intereses, por qué la buscan):\n" + (str(pl.p00) || "(pendiente)") +
      "\n\nPlano 1 · Cimientos (perfil, esencia, historia, voz, valores, estilo):\n" + (str(pl.j1) || "(pendiente)") +
      "\n\nPlano 2 · Estructura (nicho, promesa, audiencia, pilares, bios, plan):\n" + (str(pl.j2) || "(pendiente)") +
      "\n\nPlano 3 · Fachada (identidad visual: paleta con HEX, tipografías, estilo fotográfico, voz, estrategia):\n" + (str(pl.jc) || "(pendiente)");
  } else if (ex) {
    mode = "express";
    planos = "Base inicial de marca · Esencia Express (JSON). Esta persona trabaja con una base inicial, no con planos completos:\n" + ex;
  } else {
    return J(200, { ok: false, msg: v.tier === "pm" ? "Primero pega aquí tus planos completos o guarda al menos un plano en tu Proyecto Maestro." : "Primero pega el código de tu Esencia Express." });
  }

  // una sola auditoría a la vez
  const list = (await store.get(`${user.sub}/audits`, { type: "json" })) || [];
  const busy = list.find((x) => x.status === "working" && Date.now() - x.created < 12 * 60000);
  if (busy) return J(200, { ok: true, id: busy.id, msg: "Tu auditoría ya está en marcha." });

  // tope de toda la plataforma
  const mk = monthKey(), gk = `global/audits-${mk}`;
  const g = (await store.get(gk, { type: "json" })) || { n: 0 };
  if (!isAdmin(user.email) && g.n >= AUD_TOPE()) return J(200, { ok: false, code: "tope", msg: "Las auditorías de este mes están en pausa por alta demanda. Vuelve a intentarlo en unos días." });

  // descuenta la auditoría
  const r2 = Object.assign({}, rec);
  if (r2.tier === "pm") { if (r2.period !== mk) { r2.period = mk; r2.used = 0; } }
  r2.used = (r2.used || 0) + 1;
  await store.setJSON(accKey(user.sub), r2);
  await store.setJSON(gk, { n: g.n + 1 });

  const id = Date.now().toString(36) + randomBytes(5).toString("hex"), key = randomBytes(16).toString("hex");
  const created = Date.now();
  await store.setJSON(`jobs/${id}`, { id, key, sub: user.sub, email: user.email, tier: v.tier, mode, planos, images: imgs, created, mk });
  await store.setJSON(`${user.sub}/audit/${id}`, { id, status: "working", mode, created });
  list.unshift({ id, created, status: "working", mode });
  await store.setJSON(`${user.sub}/audits`, list.slice(0, 12));

  const host = event.headers.host || event.headers.Host;
  const proto = (event.headers["x-forwarded-proto"] || "https").split(",")[0];
  try {
    const r = await fetch(`${proto}://${host}/.netlify/functions/audit-run-background`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, key }) });
    if (r.status >= 400) throw new Error("bg " + r.status);
  } catch (e) {
    // no se pudo iniciar: se devuelve la auditoría
    r2.used = Math.max(0, r2.used - 1); await store.setJSON(accKey(user.sub), r2);
    await store.setJSON(gk, { n: g.n });
    await store.setJSON(`${user.sub}/audit/${id}`, { id, status: "error", mode, created, msg: "No se pudo iniciar. No se descontó tu auditoría." });
    list[0].status = "error"; await store.setJSON(`${user.sub}/audits`, list.slice(0, 12));
    await store.delete(`jobs/${id}`);
    return J(200, { ok: false, msg: "No se pudo iniciar la auditoría. No se descontó. Intenta de nuevo en un momento." });
  }
  return J(200, { ok: true, id, account: view(r2, user.email) });
};

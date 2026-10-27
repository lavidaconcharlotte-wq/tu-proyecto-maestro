// Función de fondo: hace la auditoría con Claude (Netlify AI Gateway) y guarda el informe.
// Puede tardar varios minutos sin cortarse. Si falla, devuelve la auditoría descontada.
import { getStore, connectLambda } from "@netlify/blobs";
import { STORE, accKey, auditPrompt, MODEL } from "../lib/core.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parts(text) {
  let json = null, director = "";
  const blocks = [...text.matchAll(/```(\w*)\s*\n([\s\S]*?)```/g)];
  for (const m of blocks) {
    const body = m[2].trim();
    if (/^ACTUALIZACI[ÓO]N DE AUDITOR[ÍI]A/i.test(body)) director = body;
    if ((m[1] || "").toLowerCase() === "json" || /^\{[\s\S]*\}$/.test(body)) { try { json = JSON.parse(body); } catch (e) {} }
  }
  // el informe visible: sin el bloque JSON final
  let report = text.replace(/```json[\s\S]*?```\s*$/i, "").trim();
  return { report, json, director };
}

async function callClaude(job) {
  const base = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Falta activar AI Gateway (ANTHROPIC_API_KEY)");
  const system = auditPrompt(job.tier).replace("{{PLANOS}}", job.planos);
  const content = job.images.map((im) => ({ type: "image", source: { type: "base64", media_type: im.type, data: im.data } }));
  content.push({ type: "text", text: "Estas son mis 3 capturas de Instagram: 1) perfil, 2) feed, 3) destacados. Hazme el levantamiento de mi marca." });
  const body = JSON.stringify({ model: MODEL(), max_tokens: 9000, system, messages: [{ role: "user", content }] });
  let last;
  for (let i = 0; i < 3; i++) {
    const r = await fetch(base + "/v1/messages", { method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body });
    if (r.ok) {
      const j = await r.json();
      const text = (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n").trim();
      if (!text) throw new Error("respuesta vacía");
      return { text, usage: j.usage || null, stop: j.stop_reason };
    }
    last = r.status + " " + (await r.text()).slice(0, 300);
    if (![408, 429, 500, 502, 503, 504, 529].includes(r.status)) break;
    await sleep(8000 * (i + 1));
  }
  throw new Error(last || "error");
}

export const handler = async (event) => {
  connectLambda(event);
  let b = {}; try { b = JSON.parse(event.body || "{}"); } catch (e) { return; }
  if (!/^[a-z0-9]{8,40}$/.test(b.id || "")) return;
  const store = getStore({ name: STORE, consistency: "strong" });
  const job = await store.get(`jobs/${b.id}`, { type: "json" });
  if (!job || job.key !== b.key) return;
  if (job.started) return; // Netlify reintenta si hay error: no repetir
  job.started = Date.now(); await store.setJSON(`jobs/${b.id}`, job);
  const rk = `${job.sub}/audit/${job.id}`;
  const setList = async (patch) => {
    const list = (await store.get(`${job.sub}/audits`, { type: "json" })) || [];
    const it = list.find((x) => x.id === job.id); if (it) Object.assign(it, patch);
    await store.setJSON(`${job.sub}/audits`, list);
  };
  try {
    const out = await callClaude(job);
    const p = parts(out.text);
    const res = { id: job.id, status: "done", mode: job.mode, created: job.created, finished: Date.now(), report: p.report, director: p.director, summary: p.json, usage: out.usage, stop: out.stop };
    await store.setJSON(rk, res);
    await setList({ status: "done", distancia: (p.json && p.json.distancia) || "", semaforo: (p.json && p.json.semaforo) || null });
  } catch (e) {
    console.error("auditoria", job.id, String(e && e.message || e));
    // devuelve la auditoría y el cupo global
    const acc = await store.get(accKey(job.sub), { type: "json" });
    if (acc) { acc.used = Math.max(0, (acc.used || 0) - 1); await store.setJSON(accKey(job.sub), acc); }
    const gk = `global/audits-${job.mk}`; const g = await store.get(gk, { type: "json" });
    if (g) await store.setJSON(gk, { n: Math.max(0, g.n - 1) });
    await store.setJSON(rk, { id: job.id, status: "error", mode: job.mode, created: job.created, msg: "La auditoría no se pudo completar. No se descontó: intenta de nuevo en unos minutos." });
    await setList({ status: "error" });
  }
  await store.delete(`jobs/${job.id}`);
};

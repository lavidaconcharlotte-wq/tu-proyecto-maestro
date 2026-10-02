// Guardado en la nube de Tu Proyecto Maestro.
// Cada alumna (usuario de Netlify Identity) tiene su propio espacio.
import { getStore, connectLambda } from "@netlify/blobs";

const KEYS = new Set(["pm", "hist"]);
const MAX = 400 * 1024; // 400 KB por documento

export const handler = async (event, context) => {
  connectLambda(event);
  const user = context.clientContext && context.clientContext.user;
  if (!user || !user.sub) return { statusCode: 401, body: "unauthorized" };
  const k = (event.queryStringParameters && event.queryStringParameters.k) || "pm";
  if (!KEYS.has(k)) return { statusCode: 400, body: "bad key" };
  const store = getStore({ name: "tu-proyecto", consistency: "strong" });
  const key = `${user.sub}/${k}`;
  const headers = { "content-type": "application/json", "cache-control": "no-store" };

  if (event.httpMethod === "GET") {
    const data = await store.get(key, { type: "json" });
    return { statusCode: 200, headers, body: JSON.stringify(data || null) };
  }
  if (event.httpMethod === "PUT") {
    const body = event.body || "";
    if (body.length > MAX) return { statusCode: 413, body: "too large" };
    let data;
    try { data = JSON.parse(body); } catch (e) { return { statusCode: 400, body: "bad json" }; }
    if (!data || typeof data !== "object") return { statusCode: 400, body: "bad data" };
    data.updatedAt = data.updatedAt || Date.now();
    await store.setJSON(key, data);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, updatedAt: data.updatedAt }) };
  }
  return { statusCode: 405, body: "method not allowed" };
};

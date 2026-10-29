// Cuenta de cada persona: nivel de acceso (Proyecto Maestro o Membresía), días restantes,
// auditorías disponibles y los prompts que le corresponden. Los prompts nunca viajan en el código de la página.
//   GET  /.netlify/functions/account                 → { account, prompts }
//   POST /.netlify/functions/account?a=check  {code} → ¿el código es válido? (no necesita sesión)
//   POST /.netlify/functions/account?a=activate {code} → activa o mejora el acceso de la cuenta
import { getStore, connectLambda } from "@netlify/blobs";
import { STORE, J, checkCode, applyCode, loadAccount, view, promptsFor, accKey, reqInfo } from "../lib/core.mjs";

export const handler = async (event, context) => {
  connectLambda(event);
  const a = (event.queryStringParameters && event.queryStringParameters.a) || "";
  let body = {};
  if (event.httpMethod === "POST") { try { body = JSON.parse(event.body || "{}"); } catch (e) { return J(400, { error: "bad json" }); } }

  if (event.httpMethod === "POST" && a === "check") {
    const c = checkCode(body.code);
    return J(200, c ? { ok: true, tier: c.tier, dias: c.dias || null, auditorias: c.auditorias == null ? null : c.auditorias } : { ok: false });
  }

  const user = context.clientContext && context.clientContext.user;
  if (!user || !user.sub) return J(401, { error: "unauthorized" });
  const store = getStore({ name: STORE, consistency: "strong" });
  const identity = context.clientContext && context.clientContext.identity;

  if (event.httpMethod === "GET") {
    const rec = await loadAccount(store, user, identity, reqInfo(event));
    const v = Object.assign(view(rec, user.email), { email: user.email || "" });
    return J(200, { account: v, prompts: promptsFor(v) });
  }

  if (event.httpMethod === "POST" && a === "activate") {
    const cur = await loadAccount(store, user, identity, reqInfo(event));
    try {
      const r = applyCode(cur, body.code);
      if (r.rec !== cur) await store.setJSON(accKey(user.sub), r.rec);
      const v = view(r.rec, user.email);
      return J(200, { ok: true, msg: r.msg, account: v, prompts: promptsFor(v) });
    } catch (e) {
      return J(200, { ok: false, msg: (e && e.own) || "No se pudo activar el código." });
    }
  }
  return J(405, { error: "method not allowed" });
};

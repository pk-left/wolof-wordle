// Cloudflare Pages Function: /api/suggest
//
// POST  saves a word suggestion or correction from the dictionary page.
// GET   lists everything sent so far, for PK only:  /api/suggest?key=YOUR_ADMIN_KEY
// DELETE removes one once it's been dealt with:      /api/suggest?key=YOUR_ADMIN_KEY&id=...
//
// Setup (once, in the Cloudflare dashboard, see README):
//   1. Workers & Pages > KV > create a namespace called "wolof-suggestions"
//   2. Your Pages project > Settings > Bindings > add KV namespace, variable name SUGGESTIONS
//   3. Settings > Variables and secrets > add a secret ADMIN_KEY (any long password)

const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);

export async function onRequestPost({ request, env }) {
  if (!env.SUGGESTIONS) return json({ error: "Suggestions are not set up yet" }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Bad request" }, 400); }

  // the hidden "website" box is only ever filled in by spam bots
  if (body.website) return json({ ok: true });

  const item = {
    kind: body.kind === "fix" ? "fix" : "new",
    wolof: clean(body.wolof, 80),
    english: clean(body.english, 200),
    note: clean(body.note, 600),
    who: clean(body.who, 60),
    at: new Date().toISOString(),
    country: request.cf?.country || "",
  };
  if (!item.wolof || !item.english) return json({ error: "Please fill in the Wolof word and its meaning" }, 400);

  // a gentle limit: 20 suggestions per person per hour
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const rateKey = `rate:${ip}:${new Date().toISOString().slice(0, 13)}`;
  const count = Number(await env.SUGGESTIONS.get(rateKey)) || 0;
  if (count >= 20) return json({ error: "Too many suggestions, try again later" }, 429);
  await env.SUGGESTIONS.put(rateKey, String(count + 1), { expirationTtl: 3700 });

  const id = `s:${Date.now()}:${crypto.randomUUID().slice(0, 8)}`;
  await env.SUGGESTIONS.put(id, JSON.stringify(item));
  return json({ ok: true });
}

function isAdmin(request, env) {
  const key = new URL(request.url).searchParams.get("key");
  return env.ADMIN_KEY && key && key === env.ADMIN_KEY;
}

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "Not found" }, 404);
  if (!env.SUGGESTIONS) return json({ error: "KV binding SUGGESTIONS is missing" }, 503);
  const out = [];
  let cursor;
  do {
    const page = await env.SUGGESTIONS.list({ prefix: "s:", cursor });
    for (const k of page.keys) out.push({ id: k.name, ...JSON.parse((await env.SUGGESTIONS.get(k.name)) || "{}") });
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  out.reverse();   // newest first
  return json({ count: out.length, suggestions: out });
}

export async function onRequestDelete({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "Not found" }, 404);
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !id.startsWith("s:")) return json({ error: "Give the id to delete" }, 400);
  await env.SUGGESTIONS.delete(id);
  return json({ ok: true });
}

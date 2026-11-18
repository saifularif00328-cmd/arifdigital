// Edge Function: ai-generate
// Meneruskan permintaan ke Gemini memakai kunci rahasia GEMINI_API_KEY milik Arif Digital.
// Bila secret belum diatur, membalas 503 { error: "server_key_missing" } sehingga aplikasi memakai kunci milik guru.
// Deploy: supabase functions deploy ai-generate --no-verify-jwt   (atau lewat dashboard, matikan "Verify JWT")
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
const ALLOWED = /^gemini-[a-z0-9.\-]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return json({ error: "server_key_missing" }, 503);

  let p: any;
  try { p = await req.json(); } catch { return json({ error: "bad_request", message: "Isi permintaan tidak valid." }, 400); }
  const { model, body, device_id, token, produk, job_id } = p || {};
  if (!model || !ALLOWED.test(model) || !body || !Array.isArray(body.contents)) return json({ error: "bad_request", message: "Parameter tidak lengkap." }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await sb.rpc("ai_authorize", { p_token: token ?? null, p_device: device_id ?? "", p_produk: produk ?? "", p_job: job_id ?? "", p_model: model });
  if (error) return json({ error: "auth_error", message: "Pemeriksaan akses gagal." }, 500);
  if (!data?.ok) return json({ error: "denied", message: data?.message }, data?.code ?? 403);

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  return new Response(text, { status: r.status, headers: { ...cors, "Content-Type": "application/json" } });
});

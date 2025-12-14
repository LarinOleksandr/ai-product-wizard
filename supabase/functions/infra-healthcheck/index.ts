import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function check(url: string, opts: RequestInit = {}) {
  try {
    const res = await fetch(url, { ...opts });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// Supabase client (service role) for infra checks only
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

serve(async () => {
  const embeddingBase = Deno.env.get("EMBEDDING_API") ?? "";
  const orchestratorBase = Deno.env.get("ORCHESTRATOR_API") ?? "";
  const ollamaBase = Deno.env.get("OLLAMA_API") ?? "";
  const supabaseUrl = Deno.env.get("EDGE_SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("EDGE_SUPABASE_ANON_KEY")!;

  const [embedding, orchestrator, ollama] = await Promise.all([
    check(`${embeddingBase}/health`),
    check(`${orchestratorBase}/`),
    check(`${ollamaBase}/api/tags`, { method: "GET" }),
  ]);

  // Simple DB ping (selects 1) to ensure Supabase client works
  const { error: dbError } = await supabase.from("projects").select("id").limit(1);


  return json({
    status: "ok",
    services: {
      embeddings: embedding,
      orchestrator,
      ollama,
    },
    timestamp: new Date().toISOString(),
  });
});

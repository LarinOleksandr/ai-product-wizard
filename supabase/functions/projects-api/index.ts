import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";

const supabaseUrl = Deno.env.get("EDGE_SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("EDGE_SUPABASE_ANON_KEY")!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname; // e.g. /projects-api or /projects-api/projects
  const method = req.method;

  // Normalize to just the path after /projects-api
  const subPath = path.replace(/^\/projects-api/, "") || "/";

  try {
    // GET /projects -> list projects
    if (method === "GET" && (subPath === "/" || subPath === "/projects")) {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("GET /projects error:", error);
        return json({ error: error.message }, 500);
      }

      return json({ projects: data ?? [] });
    }

    // POST /projects -> create project with { name }
    if (method === "POST" && (subPath === "/" || subPath === "/projects")) {
      const body = await req.json().catch(() => ({}));
      const name = typeof body.name === "string" ? body.name : null;

      const { data, error } = await supabase
        .from("projects")
        .insert({ name })
        .select()
        .single();

      if (error) {
        console.error("POST /projects error:", error);
        return json({ error: error.message }, 500);
      }

      return json({ project: data }, 201);
    }

    return json({ error: "Not found" }, 404);
  } catch (e) {
    console.error("projects-api unexpected error:", e);
    return json({ error: String(e) }, 500);
  }
});

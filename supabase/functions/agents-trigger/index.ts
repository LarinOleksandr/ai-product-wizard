import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// local orchestrator service (Docker)
const ORCHESTRATOR_API =
  Deno.env.get("ORCHESTRATOR_API") ?? "http://host.docker.internal:8002";

serve(async (req) => {
  try {
    const { agent, input } = await req.json().catch(() => ({}));

    // call orchestrator service
    const res = await fetch(`${ORCHESTRATOR_API}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent, input }),
    });

    if (!res.ok) {
      return json(
        { error: "orchestrator error", status: res.status },
        500
      );
    }

    const output = await res.json().catch(() => ({}));

    return json({
      status: "ok",
      agent,
      input,
      orchestrator_output: output,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

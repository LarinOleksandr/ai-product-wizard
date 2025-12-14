import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { z } from "npm:zod";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// Example infrastructure-level schema for testing:
// { "name": "string", "description": "string | optional" }
const ProjectSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
});

serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Use POST with JSON body" }, 405);
  }

  const body = await req.json().catch(() => null);

  const result = ProjectSchema.safeParse(body);

  if (!result.success) {
    return json(
      {
        valid: false,
        issues: result.error.issues,
      },
      400,
    );
  }

  return json({
    valid: true,
    data: result.data,
  });
});

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";

// Response helper
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// ENV
const supabaseUrl = Deno.env.get("EXPORT_SUPABASE_URL")!;
const serviceKey = Deno.env.get("EXPORT_SUPABASE_SERVICE_KEY")!;
const bucket = Deno.env.get("EXPORT_BUCKET")!;

// Supabase client (service role)
const supabase = createClient(supabaseUrl, serviceKey);

serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Use POST" }, 405);
  }

  const body = await req.json().catch(() => null);
  const content =
    typeof body?.content === "string"
      ? body.content
      : "# Empty Export\n\nNo content provided.";

  // Convert content to Uint8Array for upload
  const bytes = new TextEncoder().encode(content);

  // File name
  const filename = `export-${Date.now()}.md`;

  // Upload to Storage bucket
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filename, bytes, {
      contentType: "text/markdown",
      upsert: false,
    });

  if (uploadError) {
    return json({ error: uploadError.message }, 500);
  }

  // Return public/signed URL
  const { data: urlData } = await supabase.storage
    .from(bucket)
    .getPublicUrl(filename);

  return json({
    status: "ok",
    file: filename,
    url: urlData.publicUrl,
  });
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENCRYPTION_SECRET = Deno.env.get("BYOK_ENCRYPTION_SECRET")!;

const PROVIDERS = ["openrouter"] as const;
type Provider = typeof PROVIDERS[number];

async function getKey(): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ENCRYPTION_SECRET));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encrypt(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getKey();
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  const out = new Uint8Array(iv.length + ct.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(ct), iv.length);
  return btoa(String.fromCharCode(...out));
}

export async function decrypt(payload: string): Promise<string> {
  const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
  const iv = bytes.slice(0, 12);
  const ct = bytes.slice(12);
  const key = await getKey();
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

function hint(key: string) {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

async function testKey(provider: Provider, key: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (provider === "openrouter") {
      const r = await fetch("https://openrouter.ai/api/v1/models", { headers: { Authorization: `Bearer ${key}` } });
      return { ok: r.ok, error: r.ok ? undefined : `HTTP ${r.status}` };
    }
    if (provider === "openai") {
      const r = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
      return { ok: r.ok, error: r.ok ? undefined : `HTTP ${r.status}` };
    }
    if (provider === "gemini") {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
      return { ok: r.ok, error: r.ok ? undefined : `HTTP ${r.status}` };
    }
    if (provider === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/models", {
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      });
      return { ok: r.ok, error: r.ok ? undefined : `HTTP ${r.status}` };
    }
    if (provider === "replicate") {
      const r = await fetch("https://api.replicate.com/v1/account", { headers: { Authorization: `Bearer ${key}` } });
      return { ok: r.ok, error: r.ok ? undefined : `HTTP ${r.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: userData, error: userErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "list") {
      const { data, error } = await supabase
        .from("user_api_keys")
        .select("id, provider, key_hint, created_at, updated_at")
        .eq("user_id", userId);
      if (error) throw error;
      return new Response(JSON.stringify({ keys: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save") {
      const provider = body.provider as Provider;
      const apiKey = (body.apiKey as string)?.trim();
      if (!PROVIDERS.includes(provider) || !apiKey || apiKey.length < 10) {
        return new Response(JSON.stringify({ error: "Invalid provider or key" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const test = await testKey(provider, apiKey);
      if (!test.ok) {
        return new Response(JSON.stringify({ error: `Key validation failed: ${test.error}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const encrypted_key = await encrypt(apiKey);
      const key_hint = hint(apiKey);
      const { error } = await supabase
        .from("user_api_keys")
        .upsert(
          { user_id: userId, provider, encrypted_key, key_hint },
          { onConflict: "user_id,provider" }
        );
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, key_hint }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const provider = body.provider as Provider;
      const { error } = await supabase
        .from("user_api_keys")
        .delete()
        .eq("user_id", userId)
        .eq("provider", provider);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "test") {
      const provider = body.provider as Provider;
      const { data, error } = await supabase
        .from("user_api_keys")
        .select("encrypted_key")
        .eq("user_id", userId)
        .eq("provider", provider)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return new Response(JSON.stringify({ ok: false, error: "Key not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const apiKey = await decrypt(data.encrypted_key);
      const result = await testKey(provider, apiKey);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("manage-api-keys error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

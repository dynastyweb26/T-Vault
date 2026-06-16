import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const STORAGE_BUCKET = "game1-documents";

type DeleteStep = {
  name: string;
  run: (
    admin: ReturnType<typeof createClient>,
    userId: string
  ) => Promise<void>;
};

async function deleteStoragePrefix(
  admin: ReturnType<typeof createClient>,
  userId: string
): Promise<void> {
  const prefixes = [`${userId}/`];
  for (const prefix of prefixes) {
    const { data: files } = await admin.storage
      .from(STORAGE_BUCKET)
      .list(prefix.split("/")[0], { limit: 1000 });

    if (!files?.length) continue;

    const paths: string[] = [];
    const walk = async (folder: string) => {
      const { data: items } = await admin.storage
        .from(STORAGE_BUCKET)
        .list(folder, { limit: 1000 });
      for (const item of items ?? []) {
        const fullPath = `${folder}/${item.name}`;
        if (item.id) {
          paths.push(fullPath);
        } else {
          await walk(fullPath);
        }
      }
    };

    await walk(userId);
    if (paths.length) {
      await admin.storage.from(STORAGE_BUCKET).remove(paths);
    }
  }

  const { data: rootFiles } = await admin.storage
    .from(STORAGE_BUCKET)
    .list(userId, { limit: 1000 });

  if (rootFiles?.length) {
    const toRemove: string[] = [];
    for (const f of rootFiles) {
      if (f.name) {
        toRemove.push(`${userId}/${f.name}`);
      }
    }
    if (toRemove.length) {
      await admin.storage.from(STORAGE_BUCKET).remove(toRemove);
    }
  }
}

const DELETE_STEPS: DeleteStep[] = [
  {
    name: "storage",
    run: async (admin, userId) => deleteStoragePrefix(admin, userId),
  },
  {
    name: "voice_notes",
    run: async (admin, userId) => {
      await admin.from("voice_notes").delete().eq("user_id", userId);
    },
  },
  {
    name: "user_documents",
    run: async (admin, userId) => {
      await admin.from("user_documents").delete().eq("user_id", userId);
    },
  },
  {
    name: "detention_sessions",
    run: async (admin, userId) => {
      await admin.from("detention_sessions").delete().eq("user_id", userId);
    },
  },
  {
    name: "payments",
    run: async (admin, userId) => {
      await admin.from("payments").delete().eq("user_id", userId);
    },
  },
  {
    name: "broker_ratings",
    run: async (admin, userId) => {
      await admin.from("broker_ratings").delete().eq("user_id", userId);
    },
  },
  {
    name: "load_templates",
    run: async (admin, userId) => {
      await admin
        .from("jobs")
        .delete()
        .eq("user_id", userId)
        .eq("is_template", true);
    },
  },
  {
    name: "milestones",
    run: async (admin, userId) => {
      await admin.from("milestones").delete().eq("user_id", userId);
    },
  },
  {
    name: "ai_usage",
    run: async (admin, userId) => {
      await admin.from("ai_usage").delete().eq("user_id", userId);
    },
  },
  {
    name: "pro_waitlist",
    run: async (admin, userId) => {
      await admin.from("pro_waitlist").delete().eq("user_id", userId);
    },
  },
  {
    name: "expenses",
    run: async (admin, userId) => {
      await admin.from("expenses").delete().eq("user_id", userId);
    },
  },
  {
    name: "documents",
    run: async (admin, userId) => {
      await admin.from("documents").delete().eq("user_id", userId);
    },
  },
  {
    name: "jobs",
    run: async (admin, userId) => {
      await admin.from("jobs").delete().eq("user_id", userId);
    },
  },
  {
    name: "notifications",
    run: async (admin, userId) => {
      await admin.from("notifications").delete().eq("user_id", userId);
    },
  },
  {
    name: "notification_preferences",
    run: async (admin, userId) => {
      await admin
        .from("notification_preferences")
        .delete()
        .eq("user_id", userId);
    },
  },
  {
    name: "users",
    run: async (admin, userId) => {
      await admin.from("users").delete().eq("id", userId);
    },
  },
];

Deno.serve(async (req) => {
  const headers = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(req, { error: "unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!serviceRoleKey) {
      return jsonResponse(req, { error: "server_misconfigured" }, 503);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse(req, { error: "unauthorized" }, 401);
    }

    const { confirm } = await req.json();
    if (confirm !== "DELETE") {
      return jsonResponse(req, { error: "confirmation_required" }, 400);
    }

    const progress: Array<{ step: string; ok: boolean }> = [];

    for (const step of DELETE_STEPS) {
      try {
        await step.run(admin, user.id);
        progress.push({ step: step.name, ok: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown";
        console.error(`delete step ${step.name} failed:`, message);
        await admin.from("cleanup_queue").insert({
          user_id: user.id,
          step: step.name,
          error_message: message,
        });
        progress.push({ step: step.name, ok: false });
      }
    }

    try {
      await admin.auth.admin.deleteUser(user.id);
    } catch (err) {
      console.error("auth_delete_failed:", err);
    }

    return jsonResponse(req, { deleted: true, progress });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    console.error("delete-account error:", message);
    return jsonResponse(req, { error: "delete_failed" }, 500);
  }
});

import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";

const nameSchema = z.string().trim().min(1).max(200);
const idSchema = z.uuid();

function saveErrorMessage(error: { code?: string; message?: string }) {
  if (error.code === "23505") return "That name is already used";
  if (error.message?.includes("at most 20")) return "You can add at most 20 options";
  return "Could not save the option";
}

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(`/dashboard?error=${encodeURIComponent("Supabase is not configured")}`);
  }

  const { data: decision, error: decisionError } = await supabase
    .from("decisions")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();

  if (decisionError || !decision) {
    return context.redirect(`/dashboard?error=${encodeURIComponent("Create a decision first")}`);
  }

  const form = await context.request.formData();
  const intentRaw = form.get("intent");
  const intent = typeof intentRaw === "string" ? intentRaw : "";

  if (intent === "delete") {
    const id = idSchema.safeParse(form.get("id"));
    if (!id.success) {
      return context.redirect(`/dashboard?error=${encodeURIComponent("Could not save the option")}`);
    }

    const { error } = await supabase.from("options").delete().eq("id", id.data).eq("decision_id", decision.id);
    if (error) {
      return context.redirect(`/dashboard?error=${encodeURIComponent("Could not save the option")}`);
    }

    return context.redirect("/dashboard");
  }

  const parsedName = nameSchema.safeParse(form.get("name"));
  if (!parsedName.success) {
    return context.redirect(`/dashboard?error=${encodeURIComponent("Enter a name up to 200 characters")}`);
  }

  if (intent === "create") {
    const { error } = await supabase.from("options").insert({
      decision_id: decision.id,
      name: parsedName.data,
    });

    if (error) {
      return context.redirect(`/dashboard?error=${encodeURIComponent(saveErrorMessage(error))}`);
    }

    return context.redirect("/dashboard");
  }

  if (intent === "update") {
    const id = idSchema.safeParse(form.get("id"));
    if (!id.success) {
      return context.redirect(`/dashboard?error=${encodeURIComponent("Could not save the option")}`);
    }

    const { error } = await supabase
      .from("options")
      .update({ name: parsedName.data })
      .eq("id", id.data)
      .eq("decision_id", decision.id);

    if (error) {
      return context.redirect(`/dashboard?error=${encodeURIComponent(saveErrorMessage(error))}`);
    }

    return context.redirect("/dashboard");
  }

  return context.redirect(`/dashboard?error=${encodeURIComponent("Could not save the option")}`);
};

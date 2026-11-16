import type { APIRoute } from "astro";
import { z } from "zod";
import { dashboardUrl } from "@/lib/dashboard-url";
import { createClient } from "@/lib/supabase";

const idSchema = z.uuid();
const scoreSchema = z.coerce.number().int().min(1).max(5);

function redirectWithError(context: Parameters<APIRoute>[0], message: string, decisionId?: string) {
  return context.redirect(dashboardUrl(decisionId, message));
}

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return redirectWithError(context, "Supabase is not configured");
  }

  const form = await context.request.formData();

  const decisionId = idSchema.safeParse(form.get("decision_id"));
  if (!decisionId.success) {
    return redirectWithError(context, "Create a decision first");
  }

  const { data: decision, error: decisionError } = await supabase
    .from("decisions")
    .select("id")
    .eq("id", decisionId.data)
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();

  if (decisionError || !decision) {
    return redirectWithError(context, "Create a decision first");
  }

  const optionId = idSchema.safeParse(form.get("option_id"));
  if (!optionId.success) {
    return redirectWithError(context, "Could not save the scores", decision.id);
  }

  const { data: option, error: optionError } = await supabase
    .from("options")
    .select("id")
    .eq("id", optionId.data)
    .eq("decision_id", decision.id)
    .maybeSingle<{ id: string }>();

  if (optionError || !option) {
    return redirectWithError(context, "Could not save the scores", decision.id);
  }

  const { data: criteria, error: criteriaError } = await supabase
    .from("criteria")
    .select("id")
    .eq("decision_id", decision.id)
    .overrideTypes<{ id: string }[], { merge: false }>();

  if (criteriaError) {
    return redirectWithError(context, "Could not save the scores", decision.id);
  }

  // Validate every cell before writing anything, so a bad value stores nothing.
  const upserts: { option_id: string; criterion_id: string; value: number }[] = [];
  const clearIds: string[] = [];

  for (const criterion of criteria) {
    const raw = form.get(`score_${criterion.id}`);
    const text = typeof raw === "string" ? raw.trim() : "";

    if (raw !== null && typeof raw !== "string") {
      return redirectWithError(context, "Enter scores from 1 to 5", decision.id);
    }

    if (text === "") {
      clearIds.push(criterion.id);
      continue;
    }

    const parsed = scoreSchema.safeParse(text);
    if (!parsed.success) {
      return redirectWithError(context, "Enter scores from 1 to 5", decision.id);
    }

    upserts.push({ option_id: option.id, criterion_id: criterion.id, value: parsed.data });
  }

  if (upserts.length > 0) {
    const { error } = await supabase.from("scores").upsert(upserts, { onConflict: "option_id,criterion_id" });
    if (error) {
      return redirectWithError(context, "Could not save the scores", decision.id);
    }
  }

  if (clearIds.length > 0) {
    const { error } = await supabase.from("scores").delete().eq("option_id", option.id).in("criterion_id", clearIds);
    if (error) {
      return redirectWithError(context, "Could not save the scores", decision.id);
    }
  }

  return context.redirect(dashboardUrl(decision.id));
};

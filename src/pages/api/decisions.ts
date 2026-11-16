import type { APIRoute } from "astro";
import { z } from "zod";
import { dashboardUrl } from "@/lib/dashboard-url";
import { createClient } from "@/lib/supabase";

const titleSchema = z.string().trim().min(1).max(200);
const idSchema = z.uuid();
const MAX_DECISIONS = 20;

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(dashboardUrl(null, "Supabase is not configured"));
  }

  const form = await context.request.formData();
  const intentRaw = form.get("intent");
  const intent = typeof intentRaw === "string" ? intentRaw : "";

  if (intent === "create") {
    const parsedTitle = titleSchema.safeParse(form.get("title"));
    if (!parsedTitle.success) {
      return context.redirect(dashboardUrl(null, "Enter a title up to 200 characters"));
    }

    const { count, error: countError } = await supabase
      .from("decisions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError || count === null) {
      return context.redirect(dashboardUrl(null, "Could not save the decision"));
    }

    if (count >= MAX_DECISIONS) {
      return context.redirect(dashboardUrl(null, `You can have at most ${MAX_DECISIONS} decisions`));
    }

    const { data, error } = await supabase
      .from("decisions")
      .insert({ user_id: user.id, title: parsedTitle.data })
      .select("id")
      .single<{ id: string }>();

    if (error) {
      return context.redirect(dashboardUrl(null, "Could not save the decision"));
    }

    return context.redirect(dashboardUrl(data.id));
  }

  if (intent === "rename") {
    const id = idSchema.safeParse(form.get("id"));
    if (!id.success) {
      return context.redirect(dashboardUrl(null, "Decision not found"));
    }

    const parsedTitle = titleSchema.safeParse(form.get("title"));
    if (!parsedTitle.success) {
      return context.redirect(dashboardUrl(id.data, "Enter a title up to 200 characters"));
    }

    const { data, error } = await supabase
      .from("decisions")
      .update({ title: parsedTitle.data })
      .eq("id", id.data)
      .eq("user_id", user.id)
      .select("id")
      .overrideTypes<{ id: string }[], { merge: false }>();

    if (error) {
      return context.redirect(dashboardUrl(id.data, "Could not save the decision"));
    }

    if (data.length === 0) {
      return context.redirect(dashboardUrl(null, "Decision not found"));
    }

    return context.redirect(dashboardUrl(id.data));
  }

  if (intent === "delete") {
    const id = idSchema.safeParse(form.get("id"));
    if (!id.success) {
      return context.redirect(dashboardUrl(null, "Decision not found"));
    }

    const { data, error } = await supabase
      .from("decisions")
      .delete()
      .eq("id", id.data)
      .eq("user_id", user.id)
      .select("id")
      .overrideTypes<{ id: string }[], { merge: false }>();

    if (error) {
      return context.redirect(dashboardUrl(id.data, "Could not save the decision"));
    }

    if (data.length === 0) {
      return context.redirect(dashboardUrl(null, "Decision not found"));
    }

    return context.redirect(dashboardUrl());
  }

  return context.redirect(dashboardUrl(null, "Could not save the decision"));
};

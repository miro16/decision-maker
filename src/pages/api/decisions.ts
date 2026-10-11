import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";

const titleSchema = z.string().trim().min(1).max(200);

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return context.redirect("/auth/signin");
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(`/dashboard?error=${encodeURIComponent("Supabase is not configured")}`);
  }

  const form = await context.request.formData();
  const parsed = titleSchema.safeParse(form.get("title"));
  if (!parsed.success) {
    return context.redirect(`/dashboard?error=${encodeURIComponent("Enter a title up to 200 characters")}`);
  }

  const { error } = await supabase.from("decisions").insert({
    user_id: user.id,
    title: parsed.data,
  });

  if (error) {
    const message = error.code === "23505" ? "You already have a decision" : "Could not save the decision";
    return context.redirect(`/dashboard?error=${encodeURIComponent(message)}`);
  }

  return context.redirect("/dashboard");
};

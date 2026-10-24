"use server";

import { redirect } from "next/navigation";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null; email: string };

export async function signIn(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Fyll i både e-post och lösenord.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.code === "invalid_credentials") {
      return { error: "Fel e-post eller lösenord.", email };
    }
    if (isAuthRetryableFetchError(error)) {
      return {
        error: "Kunde inte nå servern. Kontrollera anslutningen och försök igen.",
        email,
      };
    }
    console.error("Inloggning misslyckades:", error);
    return { error: "Något gick fel vid inloggningen. Försök igen.", email };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

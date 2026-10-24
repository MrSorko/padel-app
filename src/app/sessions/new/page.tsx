import { Suspense } from "react";
import type { Metadata } from "next";
import { AppPage, EmptyState, ErrorText, Skeleton } from "@/components/ui";
import { requireUser } from "@/lib/sessions";
import { StartSessionForm } from "./start-session-form";

export const metadata: Metadata = { title: "Ny spelkväll · Padel Americano" };

async function PlayerPicker() {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .order("display_name");

  if (error) {
    return <ErrorText>Kunde inte hämta spelarna. Ladda om sidan och försök igen.</ErrorText>;
  }

  const profiles = (data ?? []).map((p) => ({ id: p.id as string, name: p.display_name as string }));
  if (profiles.length < 4) {
    return (
      <EmptyState>
        Det finns bara {profiles.length} spelare i appen. Bjud in fler i Supabase så att ni blir
        fyra.
      </EmptyState>
    );
  }

  return <StartSessionForm profiles={profiles} currentUserId={userId} />;
}

export default function NewSessionPage() {
  return (
    <AppPage tab="home" back={{ href: "/", label: "Hem" }} eyebrow="Americano" title="Ny spelkväll">
      <p className="mb-5 px-1 text-muted">
        Välj de fyra som spelar. Ordningen lottas när ni startar, och sedan roterar partnerna så
        att alla spelar med alla.
      </p>
      <Suspense fallback={<Skeleton rows={4} />}>
        <PlayerPicker />
      </Suspense>
    </AppPage>
  );
}

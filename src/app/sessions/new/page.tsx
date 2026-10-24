import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/sessions";
import { StartSessionForm } from "./start-session-form";

export const metadata: Metadata = { title: "Ny session · Padel Americano" };

async function PlayerPicker() {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .order("display_name");

  if (error) {
    return (
      <p role="alert" className="text-red-600 dark:text-red-400">
        Kunde inte hämta spelarna. Ladda om sidan och försök igen.
      </p>
    );
  }

  const profiles = (data ?? []).map((p) => ({ id: p.id as string, name: p.display_name as string }));
  if (profiles.length < 4) {
    return (
      <p className="text-zinc-600 dark:text-zinc-400">
        Det finns bara {profiles.length} spelare i appen. Bjud in fler i Supabase så att ni
        blir fyra.
      </p>
    );
  }

  return <StartSessionForm profiles={profiles} currentUserId={userId} />;
}

export default function NewSessionPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10">
      <Link href="/" className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
        ← Tillbaka
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Ny session</h1>
      <p className="mt-2 mb-6 text-zinc-600 dark:text-zinc-400">
        Välj de fyra som spelar. Ordningen lottas när sessionen startar.
      </p>
      <Suspense fallback={<p className="text-zinc-500">Hämtar spelare…</p>}>
        <PlayerPicker />
      </Suspense>
    </main>
  );
}

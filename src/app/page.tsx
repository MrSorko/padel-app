import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";

async function CurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    redirect("/login");
  }

  return (
    <p className="mt-8 text-zinc-600 dark:text-zinc-400">
      Inloggad som{" "}
      <span className="font-medium text-zinc-900 dark:text-zinc-100">
        {claims.email}
      </span>
    </p>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Padel Americano</h1>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium active:bg-zinc-100 dark:border-zinc-700 dark:active:bg-zinc-800"
          >
            Logga ut
          </button>
        </form>
      </header>
      <Suspense
        fallback={<p className="mt-8 text-zinc-500">Hämtar inloggning…</p>}
      >
        <CurrentUser />
      </Suspense>
    </main>
  );
}

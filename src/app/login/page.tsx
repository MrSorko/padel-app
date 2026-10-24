import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Logga in · Padel Americano" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Padel Americano</h1>
      <p className="mt-2 mb-8 text-zinc-600 dark:text-zinc-400">
        Logga in för att föra in poäng och se statistik.
      </p>
      <LoginForm />
    </main>
  );
}

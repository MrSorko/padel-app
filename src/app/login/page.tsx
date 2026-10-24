import type { Metadata } from "next";
import { BallMark } from "@/components/icons";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Logga in · Padel Americano" };

export default function LoginPage() {
  return (
    <main className="safe-top court-hero flex flex-1 flex-col px-5 pb-10 text-white">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <BallMark className="size-16" />
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight">Padel Americano</h1>
        <p className="mt-2 mb-8 text-court-200">
          Logga in för att föra in poäng och se statistik.
        </p>
        <div className="rounded-3xl bg-surface p-5 text-foreground shadow-xl shadow-court-950/40">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}

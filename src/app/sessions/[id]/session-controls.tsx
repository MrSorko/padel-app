"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "../actions";
import { ScoreForm } from "./score-form";

/** Knapp som frågar innan den kör en serveråtgärd och visar eventuella fel. */
export function ConfirmButton({
  action,
  confirmText,
  label,
  pendingLabel,
  className,
}: {
  action: () => Promise<ActionState>;
  confirmText: string;
  label: string;
  pendingLabel: string;
  className: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={pending}
        className={className}
        onClick={() => {
          if (!window.confirm(confirmText)) return;
          startTransition(async () => {
            const result = await action();
            setError(result?.error ?? null);
          });
        }}
      >
        {pending ? pendingLabel : label}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </>
  );
}

/** Rad i matchlistan med möjlighet att ändra poängen. */
export function EditableMatch({
  children,
  action,
  team1Label,
  team2Label,
  team1Score,
}: {
  children: React.ReactNode;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  team1Label: string;
  team2Label: string;
  team1Score: number;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <ScoreForm
        action={action}
        team1Label={team1Label}
        team2Label={team2Label}
        initialTeam1Score={team1Score}
        submitLabel="Spara ändring"
        onSaved={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">{children}</div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium active:bg-zinc-100 dark:border-zinc-700 dark:active:bg-zinc-800"
      >
        Ändra
      </button>
    </div>
  );
}

/**
 * Hämtar om sidan med jämna mellanrum medan sessionen pågår, så att
 * live-tabellen visar matcher som någon annan har fört in.
 */
export function AutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = window.setInterval(tick, seconds * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, seconds]);

  return null;
}

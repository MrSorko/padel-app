"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon } from "@/components/icons";
import { buttonStyles, ErrorText } from "@/components/ui";
import type { ActionState } from "../actions";
import { ScoreForm } from "./score-form";

/** Knapp som frågar i en ruta innan den kör en serveråtgärd och visar eventuella fel. */
export function ConfirmButton({
  action,
  title,
  confirmText,
  confirmLabel,
  label,
  pendingLabel,
  className,
  danger = false,
}: {
  action: () => Promise<ActionState>;
  title: string;
  confirmText: string;
  confirmLabel: string;
  label: React.ReactNode;
  pendingLabel: string;
  className: string;
  danger?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const confirm = () => {
    dialog.current?.close();
    startTransition(async () => {
      const result = await action();
      setError(result?.error ?? null);
    });
  };

  return (
    <>
      <button
        type="button"
        disabled={pending}
        className={className}
        onClick={() => dialog.current?.showModal()}
      >
        {pending ? pendingLabel : label}
      </button>
      {error && <ErrorText>{error}</ErrorText>}
      <dialog
        ref={dialog}
        // Stäng när man trycker utanför rutan.
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto w-[calc(100%-2.5rem)] max-w-sm rounded-3xl bg-surface p-0 text-foreground shadow-2xl"
      >
        <div className="p-6">
          <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
          <p className="mt-2 text-muted">{confirmText}</p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={confirm}
              className={danger ? buttonStyles.danger : buttonStyles.secondary}
            >
              {confirmLabel}
            </button>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className={buttonStyles.outline}
            >
              Avbryt
            </button>
          </div>
        </div>
      </dialog>
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
        submitLabel="Spara"
        onSaved={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">{children}</div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Ändra resultatet"
        className={buttonStyles.small}
      >
        <PencilIcon className="size-4" />
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

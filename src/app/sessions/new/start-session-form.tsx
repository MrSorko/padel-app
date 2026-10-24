"use client";

import { useActionState, useState } from "react";
import { ShuffleIcon } from "@/components/icons";
import { Avatar, buttonStyles, ErrorText } from "@/components/ui";
import { startSession, type ActionState } from "../actions";

const initialState: ActionState = { error: null };

export function StartSessionForm({
  profiles,
  currentUserId,
}: {
  profiles: { id: string; name: string }[];
  currentUserId: string;
}) {
  const [state, formAction, pending] = useActionState(startSession, initialState);
  const [selected, setSelected] = useState<string[]>(() =>
    profiles.length === 4 ? profiles.map((p) => p.id) : [currentUserId],
  );

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const ready = selected.length === 4 && selected.includes(currentUserId);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 flex w-full justify-between px-1 text-xs font-bold uppercase tracking-wider text-muted">
          Spelare
          <span className={selected.length === 4 ? "text-court-600 dark:text-ball-400" : ""}>
            {selected.length} av 4
          </span>
        </legend>
        {profiles.map((p) => {
          const checked = selected.includes(p.id);
          const full = !checked && selected.length >= 4;
          return (
            <label
              key={p.id}
              className={`flex items-center gap-3 rounded-2xl border-2 bg-surface px-4 py-3 text-base font-semibold transition ${
                checked
                  ? "border-court-500 dark:border-ball-400"
                  : "border-line"
              } ${full ? "opacity-50" : "active:scale-[0.99]"} has-focus-visible:ring-4 has-focus-visible:ring-court-500/30`}
            >
              <input
                type="checkbox"
                name="player"
                value={p.id}
                checked={checked}
                disabled={full}
                onChange={() => toggle(p.id)}
                className="sr-only"
              />
              <Avatar name={p.name} />
              <span className="flex-1">
                {p.name}
                {p.id === currentUserId && (
                  <span className="ml-1.5 text-sm font-normal text-muted">(du)</span>
                )}
              </span>
              <span
                aria-hidden="true"
                className={`flex size-7 items-center justify-center rounded-full border-2 text-sm transition ${
                  checked
                    ? "border-court-500 bg-court-500 text-white dark:border-ball-400 dark:bg-ball-400 dark:text-court-950"
                    : "border-line"
                }`}
              >
                {checked && "✓"}
              </span>
            </label>
          );
        })}
      </fieldset>

      {!selected.includes(currentUserId) && (
        <p className="px-1 text-sm text-muted">Du måste själv vara med för att kunna föra in poäng.</p>
      )}

      {state.error && <ErrorText>{state.error}</ErrorText>}

      <button type="submit" disabled={!ready || pending} className={`mt-2 ${buttonStyles.primary}`}>
        <ShuffleIcon className="size-5" />
        {pending ? "Lottar…" : "Lotta ordning och starta"}
      </button>
    </form>
  );
}

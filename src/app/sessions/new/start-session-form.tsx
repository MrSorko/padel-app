"use client";

import { useActionState, useState } from "react";
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
        <legend className="mb-2 text-sm font-medium">Spelare ({selected.length} av 4)</legend>
        {profiles.map((p) => {
          const checked = selected.includes(p.id);
          return (
            <label
              key={p.id}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-base ${
                checked
                  ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950"
                  : "border-zinc-300 dark:border-zinc-700"
              }`}
            >
              <input
                type="checkbox"
                name="player"
                value={p.id}
                checked={checked}
                disabled={!checked && selected.length >= 4}
                onChange={() => toggle(p.id)}
                className="size-5 accent-emerald-600"
              />
              {p.name}
              {p.id === currentUserId && <span className="text-sm text-zinc-500">(du)</span>}
            </label>
          );
        })}
      </fieldset>

      {!selected.includes(currentUserId) && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Du måste själv vara med för att kunna föra in poäng.
        </p>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={!ready || pending}
        className="mt-2 rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white active:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Startar…" : "Starta session"}
      </button>
    </form>
  );
}

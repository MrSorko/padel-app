"use client";

import { useActionState, useState } from "react";
import { MATCH_TOTAL } from "@/lib/americano";
import type { ActionState } from "../actions";

const initialState: ActionState = { error: null };

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  team1Label: string;
  team2Label: string;
  initialTeam1Score?: number;
  submitLabel: string;
  onSaved?: () => void;
  onCancel?: () => void;
};

function other(value: string) {
  if (!/^\d{1,2}$/.test(value)) return "";
  const n = Number(value);
  return n <= MATCH_TOTAL ? String(MATCH_TOTAL - n) : "";
}

/**
 * Poänginmatning för en match. Man fyller i det ena lagets poäng och det
 * andra lagets räknas ut som 24 − x. Bara lag 1:s poäng skickas till servern.
 */
export function ScoreForm({
  action,
  team1Label,
  team2Label,
  initialTeam1Score,
  submitLabel,
  onSaved,
  onCancel,
}: Props) {
  const [team1, setTeam1] = useState(initialTeam1Score?.toString() ?? "");
  const [team2, setTeam2] = useState(
    initialTeam1Score === undefined ? "" : String(MATCH_TOTAL - initialTeam1Score),
  );
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await action(prev, formData);
      if (!result.error) {
        setTeam1("");
        setTeam2("");
        onSaved?.();
      }
      return result;
    },
    initialState,
  );

  const invalid = team1 !== "" && other(team1) === "";
  const ready = team1 !== "" && !invalid;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <ScoreInput
          label={team1Label}
          name="team1_score"
          value={team1}
          onChange={(v) => {
            setTeam1(v);
            setTeam2(other(v));
          }}
        />
        <ScoreInput
          label={team2Label}
          value={team2}
          onChange={(v) => {
            setTeam2(v);
            setTeam1(other(v));
          }}
        />
      </div>

      {invalid && (
        <p className="text-sm text-red-600 dark:text-red-400">Poängen ska vara 0–24.</p>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!ready || pending}
          className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white active:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Sparar…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-300 px-4 py-3 text-base font-medium active:bg-zinc-100 dark:border-zinc-700 dark:active:bg-zinc-800"
          >
            Avbryt
          </button>
        )}
      </div>
    </form>
  );
}

function ScoreInput({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      <span className="min-h-10">{label}</span>
      <input
        name={name}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
        autoComplete="off"
        placeholder="0–24"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-3 text-center text-2xl font-semibold tabular-nums text-zinc-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />
    </label>
  );
}

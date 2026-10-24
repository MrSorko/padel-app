"use client";

import { useActionState, useState } from "react";
import { MinusIcon, PlusIcon } from "@/components/icons";
import { buttonStyles, ErrorText } from "@/components/ui";
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
 * Plus och minus flyttar en poäng mellan lagen, med 12–12 som start.
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
      if (!result.error || result.stale) {
        setTeam1("");
        setTeam2("");
      }
      if (!result.error) onSaved?.();
      return result;
    },
    initialState,
  );

  const invalid = team1 !== "" && other(team1) === "";
  const ready = team1 !== "" && !invalid;

  const setFromTeam1 = (v: string) => {
    setTeam1(v);
    setTeam2(other(v));
  };
  const setFromTeam2 = (v: string) => {
    setTeam2(v);
    setTeam1(other(v));
  };
  // Stegar lag 1:s poäng med `delta`, med 12–12 som utgångsläge.
  const step = (delta: number) => {
    const current = ready ? Number(team1) : MATCH_TOTAL / 2;
    setFromTeam1(String(Math.min(MATCH_TOTAL, Math.max(0, current + delta))));
  };

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <ScoreRow
          label={team1Label}
          name="team1_score"
          value={team1}
          leading={ready && Number(team1) > Number(team2)}
          onChange={setFromTeam1}
          onStep={step}
        />
        <ScoreRow
          label={team2Label}
          value={team2}
          leading={ready && Number(team2) > Number(team1)}
          onChange={setFromTeam2}
          onStep={(delta) => step(-delta)}
        />
      </div>

      {invalid ? (
        <p className="px-1 text-sm font-medium text-danger">Poängen ska vara 0–24.</p>
      ) : (
        <p className="px-1 text-xs text-muted">
          Fyll i ena lagets poäng, så räknas det andra ut (24 totalt).
        </p>
      )}
      {state.error && <ErrorText>{state.error}</ErrorText>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!ready || pending}
          className={`flex-1 ${buttonStyles.primary}`}
        >
          {pending ? "Sparar…" : ready ? `${submitLabel} ${team1}–${team2}` : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={buttonStyles.outline}>
            Avbryt
          </button>
        )}
      </div>
    </form>
  );
}

function ScoreRow({
  label,
  name,
  value,
  leading,
  onChange,
  onStep,
}: {
  label: string;
  name?: string;
  value: string;
  leading: boolean;
  onChange: (value: string) => void;
  onStep: (delta: number) => void;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-2xl border-2 bg-surface py-2 pr-2 pl-4 transition ${
        leading ? "border-ball-400" : "border-line"
      }`}
    >
      <span className="min-w-0 flex-1 text-sm leading-tight font-semibold">{label}</span>
      <StepButton label={`En poäng mindre för ${label}`} onClick={() => onStep(-1)}>
        <MinusIcon className="size-5" />
      </StepButton>
      <input
        name={name}
        aria-label={`Poäng för ${label}`}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        onFocus={(e) => e.target.select()}
        className="w-16 rounded-xl bg-surface-2 py-2 text-center text-3xl font-extrabold tabular-nums text-foreground outline-none focus:ring-4 focus:ring-court-500/30"
      />
      <StepButton label={`En poäng mer för ${label}`} onClick={() => onStep(1)}>
        <PlusIcon className="size-5" />
      </StepButton>
    </div>
  );
}

function StepButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-court-50 text-court-700 transition active:scale-95 active:bg-court-100 dark:bg-court-800 dark:text-court-100 dark:active:bg-court-700"
    >
      {children}
    </button>
  );
}

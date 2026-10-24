"use client";

import { useActionState } from "react";
import { buttonStyles, ErrorText, inputStyles } from "@/components/ui";
import { signIn, type LoginState } from "./actions";

const initialState: LoginState = { error: null, email: "" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        E-post
        <input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={state.email}
          className={inputStyles}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Lösenord
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputStyles}
        />
      </label>

      {state.error && (
        <ErrorText>{state.error}</ErrorText>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`mt-2 ${buttonStyles.primary}`}
      >
        {pending ? "Loggar in…" : "Logga in"}
      </button>
    </form>
  );
}

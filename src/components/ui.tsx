import Link from "next/link";
import { ChartIcon, ChevronLeftIcon, HistoryIcon, HomeIcon } from "./icons";

// Gemensamma byggstenar så att alla sidor ser likadana ut.

export const buttonStyles = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-2xl bg-ball-400 px-5 py-4 text-base font-bold text-court-950 shadow-sm shadow-ball-600/30 transition active:scale-[0.98] active:bg-ball-500 disabled:opacity-50 disabled:active:scale-100",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-2xl bg-court-700 px-5 py-4 text-base font-semibold text-white transition active:scale-[0.98] active:bg-court-800 disabled:opacity-50 dark:bg-court-600 dark:active:bg-court-700",
  outline:
    "inline-flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-5 py-4 text-base font-semibold transition active:scale-[0.98] active:bg-surface-2 disabled:opacity-50",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-2xl border border-danger/40 px-5 py-4 text-base font-semibold text-danger transition active:scale-[0.98] active:bg-danger/10 disabled:opacity-50",
  small:
    "inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium transition active:bg-surface-2 disabled:opacity-50",
} as const;

export const inputStyles =
  "w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-base text-foreground outline-none transition placeholder:text-muted/60 focus:border-court-500 focus:ring-4 focus:ring-court-500/20";

export type Tab = "home" | "stats" | "history";

/**
 * Ram för en inloggad sida: rubrik, valfri bakåtlänk och menyraden längst
 * ner. Som hemskärmsapp saknas webbläsarens bakåtknapp, så menyn och
 * bakåtlänken är det enda sättet att ta sig runt.
 */
export function AppPage({
  title,
  eyebrow,
  back,
  tab,
  action,
  children,
}: {
  title?: React.ReactNode;
  eyebrow?: React.ReactNode;
  back?: { href: string; label: string };
  tab?: Tab;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="safe-top court-hero px-5 pb-7 text-white">
        <div className="mx-auto w-full max-w-md">
          {back && (
            <Link
              href={back.href}
              className="-ml-1.5 inline-flex items-center gap-0.5 py-1 pr-2 text-sm font-semibold text-court-200"
            >
              <ChevronLeftIcon className="size-5" />
              {back.label}
            </Link>
          )}
          <div className="mt-2 flex items-end justify-between gap-4">
            <div className="min-w-0">
              {eyebrow && (
                <p className="text-xs font-bold uppercase tracking-wider text-ball-400">{eyebrow}</p>
              )}
              {title && (
                <h1 className="mt-0.5 truncate text-3xl font-extrabold tracking-tight">{title}</h1>
              )}
            </div>
            {action}
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-5 pb-32">
        {children}
      </main>
      <BottomNav active={tab} />
    </>
  );
}

const tabs = [
  { id: "home", href: "/", label: "Hem", Icon: HomeIcon },
  { id: "stats", href: "/stats", label: "Statistik", Icon: ChartIcon },
  { id: "history", href: "/history", label: "Historik", Icon: HistoryIcon },
] as const;

function BottomNav({ active }: { active?: Tab }) {
  return (
    <nav
      aria-label="Huvudmeny"
      className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 backdrop-blur-md"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {tabs.map(({ id, href, label, Icon }) => {
          const current = id === active;
          return (
            <li key={id}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={`flex flex-col items-center gap-1 pt-2.5 pb-2 text-xs font-semibold transition ${
                  current ? "text-court-600 dark:text-ball-400" : "text-muted"
                }`}
              >
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition ${
                    current ? "bg-court-100 dark:bg-court-800" : ""
                  }`}
                >
                  <Icon className="size-5" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl border border-line bg-surface p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-4 px-1">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted">{children}</h2>
      {aside && <span className="text-xs text-muted">{aside}</span>}
    </div>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
      {children}
    </p>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-3xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
      {children}
    </p>
  );
}

/** Platta rutor som visas medan en sida hämtar data. */
export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Hämtar…" className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-3xl bg-surface-2" />
      ))}
    </div>
  );
}

const medal = [
  "bg-gold text-court-950",
  "bg-silver text-court-950",
  "bg-bronze text-white",
  "bg-surface-2 text-muted",
];

/** Rund bricka med placeringen, i guld, silver och brons för topp tre. */
export function PositionBadge({ position, size = "md" }: { position: number; size?: "md" | "lg" }) {
  const sizes = size === "lg" ? "size-10 text-lg" : "size-7 text-sm";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-extrabold tabular-nums ${sizes} ${
        medal[Math.min(position, 4) - 1] ?? medal[3]
      }`}
    >
      {position}
    </span>
  );
}

/** Initialer i en cirkel, t.ex. "SO" för Soren. */
export function Avatar({ name, className = "size-9 text-sm" }: { name: string; className?: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-court-100 font-bold text-court-700 dark:bg-court-800 dark:text-court-100 ${className}`}
    >
      {initials.length === 1 ? name.slice(0, 2).toUpperCase() : initials}
    </span>
  );
}

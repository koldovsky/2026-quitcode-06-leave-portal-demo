import Link from "next/link";
import type { ReactNode } from "react";
import { STATUS_LABELS } from "@/lib/leave/messages";
import type { AppRole, RecordStatus } from "@/lib/leave/types";
import { signOut } from "../login/actions";

const LINKS: { href: string; label: string; roles: AppRole[] }[] = [
  { href: "/requests", label: "Мої заявки", roles: ["employee"] },
  { href: "/requests/new", label: "Нова заявка", roles: ["employee"] },
  { href: "/manage", label: "Черга рішень", roles: ["manager", "admin"] },
];

export function PageShell({
  title,
  role,
  children,
}: {
  title: string;
  role: AppRole | null;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <nav className="flex flex-wrap items-center gap-4 text-sm">
        <Link href="/" className="font-semibold">
          Портал відсутностей
        </Link>
        {LINKS.filter((l) => role && l.roles.includes(role)).map((l) => (
          <Link key={l.href} href={l.href} className="text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-300">
            {l.label}
          </Link>
        ))}
        <form action={signOut} className="ml-auto">
          <button type="submit" className="text-zinc-500 underline-offset-4 hover:underline">
            Вийти
          </button>
        </form>
      </nav>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children}
    </main>
  );
}

const STATUS_STYLES: Record<RecordStatus, string> = {
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  approved: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  needs_revision: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100",
};

export function StatusBadge({ status }: { status: RecordStatus }) {
  return (
    <span data-status={status} className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function Notice({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`rounded border px-3 py-2 text-sm ${
        kind === "error"
          ? "border-red-300 text-red-700 dark:border-red-800 dark:text-red-300"
          : "border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-200"
      }`}
    >
      {children}
    </p>
  );
}

export const inputClass = "rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";
export const buttonClass = "rounded bg-foreground px-4 py-2 text-sm font-medium text-background";
export const secondaryButtonClass = "rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700";

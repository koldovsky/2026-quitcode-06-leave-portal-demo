// Спільний шар сторінок поверх дизайн-системи (DESIGN.md): лише семантичні токени й компоненти з @/components/ui.
import Link from "next/link";
import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { STATUS_LABELS } from "@/lib/leave/messages";
import type { AppRole, RecordStatus } from "@/lib/leave/types";
import { cn } from "@/lib/utils";
import { signOut } from "../login/actions";

const LINKS: { href: string; label: string; roles: AppRole[] }[] = [
  { href: "/requests", label: "Мої заявки", roles: ["employee"] },
  { href: "/requests/new", label: "Нова заявка", roles: ["employee"] },
  { href: "/manage", label: "Черга рішень", roles: ["manager", "admin"] },
  // AC-USERS-07: пункт лише для адміністратора (сторінку однаково захищає requireRole("admin") і RLS).
  { href: "/admin/users", label: "Користувачі", roles: ["admin"] },
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
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <nav aria-label="Головне меню" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link href="/" className="font-semibold text-foreground">
          Портал відсутностей
        </Link>
        {LINKS.filter((l) => role && l.roles.includes(role)).map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            {l.label}
          </Link>
        ))}
        <form action={signOut} className="ml-auto">
          <Button type="submit" variant="ghost" size="sm">
            Вийти
          </Button>
        </form>
      </nav>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {children}
    </main>
  );
}

// Статус запису: варіант бейджа з токенами status-* + підпис (статус ніколи не передаємо лише кольором).
const STATUS_VARIANT: Record<RecordStatus, "pending" | "approved" | "returned"> = {
  pending: "pending",
  approved: "approved",
  needs_revision: "returned",
};

export function StatusBadge({ status }: { status: RecordStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} data-status={status}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export type NoticeKind = "success" | "warning" | "error" | "info";

const NOTICE_STYLES: Record<NoticeKind, string> = {
  success: "border-transparent bg-status-approved text-status-approved-foreground",
  warning: "border-transparent bg-status-pending text-status-pending-foreground",
  error: "border-destructive bg-card text-destructive",
  info: "border-transparent bg-accent text-accent-foreground",
};

/** Повідомлення над формою чи списком. Помилка — role="alert", решта — role="status". */
export function Notice({ kind, title, children }: { kind: NoticeKind; title?: string; children: ReactNode }) {
  return (
    <Alert role={kind === "error" ? "alert" : "status"} data-kind={kind} className={cn("px-4 py-3", NOTICE_STYLES[kind])}>
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      <AlertDescription className="text-current">{children}</AlertDescription>
    </Alert>
  );
}

/** Порожній стан: muted-тло в межах картки, одне речення й (за бажанням) одна дія. */
export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border bg-muted px-4 py-6 text-sm text-muted-foreground">
      <p>{children}</p>
      {action}
    </div>
  );
}

/**
 * Поле форми: видимий підпис (label), поле, підказка й помилка під ним. Поле (children) саме ставить
 * aria-describedby={fieldDescribedBy(id, { hint, error })} і aria-invalid, коли є помилка (DESIGN.md, «Стани»).
 */
export function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** id підказки й помилки поля для aria-describedby (undefined, якщо немає жодної). */
export function fieldDescribedBy(id: string, { hint, error }: { hint?: unknown; error?: unknown }): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

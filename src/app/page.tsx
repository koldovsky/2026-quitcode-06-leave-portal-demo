import Link from "next/link";
import { getViewer } from "@/lib/supabase/viewer";
import { PageShell } from "./_components/ui";

const ROLE_LABELS: Record<string, string> = {
  employee: "працівник",
  manager: "менеджер підрозділу",
  admin: "адміністратор",
};

// Головна: хто увійшов, з якою роллю (з таблиці profiles) і куди йти далі.
// Сторінка читає cookies, тому рендериться динамічно (шаблон зібрано з --no-cache-components).
export default async function Home() {
  const { viewer, profile, email } = await getViewer();

  return (
    <PageShell title="Портал відсутностей" role={viewer?.role ?? null}>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-zinc-500">Email</dt>
        <dd data-testid="user-email">{email ?? "—"}</dd>
        <dt className="text-zinc-500">Роль</dt>
        <dd data-testid="user-role">
          {profile?.role ? (ROLE_LABELS[profile.role] ?? profile.role) : "профіль не знайдено"}
        </dd>
      </dl>
      <div className="flex flex-wrap gap-3 text-sm">
        {viewer?.role === "employee" ? (
          <>
            <Link href="/requests/new" className="rounded bg-foreground px-4 py-2 font-medium text-background">
              Подати заявку
            </Link>
            <Link href="/requests" className="rounded border border-zinc-300 px-4 py-2 dark:border-zinc-700">
              Мої заявки
            </Link>
          </>
        ) : null}
        {viewer?.role === "manager" || viewer?.role === "admin" ? (
          <Link href="/manage" className="rounded bg-foreground px-4 py-2 font-medium text-background">
            {viewer.role === "manager" ? "Черга рішень" : "Усі заявки"}
          </Link>
        ) : null}
      </div>
    </PageShell>
  );
}

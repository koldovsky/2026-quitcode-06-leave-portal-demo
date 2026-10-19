import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getViewer } from "@/lib/supabase/viewer";
import { HOME_NOTICES } from "@/lib/users/roles";
import { Notice, PageShell } from "./_components/ui";

const ROLE_LABELS: Record<string, string> = {
  employee: "працівник",
  manager: "менеджер підрозділу",
  admin: "адміністратор",
};

// Головна: хто увійшов, з якою роллю (з таблиці profiles) і куди йти далі.
// Сторінка читає cookies, тому рендериться динамічно (шаблон зібрано з --no-cache-components).
export default async function Home({ searchParams }: PageProps<"/">) {
  const { viewer, profile, email } = await getViewer();
  const { welcome, notice } = await searchParams;
  const noticeText = typeof notice === "string" && Object.hasOwn(HOME_NOTICES, notice) ? HOME_NOTICES[notice] : null;

  return (
    <PageShell title="Портал відсутностей" role={viewer?.role ?? null}>
      {/* AC-USERS-02: після активації за посиланням і нового пароля. */}
      {welcome === "1" ? <Notice kind="success">Пароль збережено. Вітаємо в порталі!</Notice> : null}
      {/* AC-USERS-07, AC-USERS-13: не-адміністратор відкрив /admin/users. */}
      {noticeText ? <Notice kind="info">{noticeText}</Notice> : null}
      <Card>
        <CardContent>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Email</dt>
            <dd data-testid="user-email">{email ?? "—"}</dd>
            <dt className="text-muted-foreground">Роль</dt>
            <dd data-testid="user-role">
              {profile?.role ? (ROLE_LABELS[profile.role] ?? profile.role) : "профіль не знайдено"}
            </dd>
          </dl>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-3">
        {viewer?.role === "employee" ? (
          <>
            <Link href="/requests/new" className={buttonVariants()}>
              Подати заявку
            </Link>
            <Link href="/requests" className={buttonVariants({ variant: "outline" })}>
              Мої заявки
            </Link>
          </>
        ) : null}
        {viewer?.role === "manager" || viewer?.role === "admin" ? (
          <Link href="/manage" className={buttonVariants()}>
            {viewer.role === "manager" ? "Черга рішень" : "Усі заявки"}
          </Link>
        ) : null}
      </div>
    </PageShell>
  );
}

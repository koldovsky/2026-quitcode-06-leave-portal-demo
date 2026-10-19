import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { POSITION_KIND_LABELS } from "@/lib/leave/messages";
import type { PositionKind } from "@/lib/leave/types";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/viewer";
import {
  APP_ROLES,
  ROLE_CHANGE_MESSAGES,
  ROLE_LABELS,
  isAppRole,
  usersEmptyState,
  usersPageRedirect,
  type RoleChangeError,
} from "@/lib/users/roles";
import { SubmitButton } from "../../_components/submit-button";
import { EmptyState, Notice, PageShell } from "../../_components/ui";
import { changeRole } from "./actions";
import { InviteDialog } from "./invite-dialog";

const ROLE_OPTIONS = APP_ROLES.map((value) => ({ value, label: ROLE_LABELS[value] }));

// AC-USERS-07, AC-USERS-13: лише адміністратор — працівника й менеджера ведемо на головну з повідомленням «Список
// користувачів бачить лише адміністратор.»; без сесії proxy і getViewer ведуть на /login (AC-USERS-10). Дані — клієнтом
// користувача під RLS: адміністратор бачить усі профілі й посади, інші — лише свій (захист не тримається на редіректі).
export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const { supabase, viewer } = await getViewer();
  const away = usersPageRedirect(viewer?.role);
  if (away || !viewer) redirect(away ?? "/");
  const { error, done } = await searchParams;
  const errorText =
    typeof error === "string" && Object.hasOwn(ROLE_CHANGE_MESSAGES, error) ? ROLE_CHANGE_MESSAGES[error as RoleChangeError] : null;

  const [{ data: profiles }, { data: positions }, { data: divisions }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role, created_at").order("created_at", { ascending: true }),
    supabase.from("positions").select("id, employee_id, division_id, kind, title"),
    supabase.from("divisions").select("id, name").order("name"),
  ]);
  const users = profiles ?? [];
  const divisionName = new Map((divisions ?? []).map((d) => [d.id, d.name]));
  const empty = usersEmptyState(users, viewer.id);

  return (
    <PageShell title="Користувачі" role={viewer.role}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Хто має доступ до порталу і з якою роллю. Нових людей запрошуйте посиланням для активації.
        </p>
        <InviteDialog divisions={divisions ?? []} roles={ROLE_OPTIONS} />
      </div>

      {/* AC-USERS-06: відмову бази (LAST_ADMIN) показуємо словами з вимоги PM. */}
      {errorText ? (
        <Notice kind="error" title="Роль не змінено">
          {errorText}
        </Notice>
      ) : null}
      {done === "role" ? <Notice kind="success">Роль змінено. Нова роль діє з наступного відкриття сторінки.</Notice> : null}

      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="px-4 text-muted-foreground">Email</TableHead>
                <TableHead className="text-muted-foreground">Ім&apos;я</TableHead>
                <TableHead className="text-muted-foreground">Роль</TableHead>
                <TableHead className="text-muted-foreground">Посади</TableHead>
                <TableHead className="px-4 text-muted-foreground">Змінити роль</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const own = (positions ?? []).filter((p) => p.employee_id === u.id);
                return (
                  <TableRow key={u.id} data-testid="user-row">
                    <TableCell className="px-4 py-3 font-mono text-[13px]">{u.email ?? "—"}</TableCell>
                    <TableCell className="py-3">{u.full_name ?? "—"}</TableCell>
                    <TableCell className="py-3">
                      <Badge variant="role" data-role={u.role}>
                        {isAppRole(u.role) ? ROLE_LABELS[u.role] : u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 whitespace-normal">
                      {own.length ? (
                        <ul className="flex flex-col gap-0.5">
                          {own.map((p) => (
                            <li key={p.id}>
                              {p.title}{" "}
                              <span className="text-muted-foreground">
                                ({POSITION_KIND_LABELS[p.kind as PositionKind]}, {divisionName.get(p.division_id) ?? "—"})
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {/* AC-USERS-03: зміна ролі — Server Action changeRole → rpc admin_set_role від імені адміністратора. */}
                      <form action={changeRole} className="flex items-center gap-2">
                        <input type="hidden" name="user_id" value={u.id} />
                        <NativeSelect
                          name="role"
                          size="sm"
                          className="min-w-36"
                          defaultValue={u.role}
                          aria-label={`Нова роль для ${u.email ?? "користувача"}`}
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <NativeSelectOption key={r.value} value={r.value}>
                              {r.label}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                        <SubmitButton variant="outline" size="sm">
                          Змінити
                        </SubmitButton>
                      </form>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {/* AC-USERS-12: порожній стан — у картці, під списком (DESIGN.md, «Стани»). */}
          {empty ? (
            <div className="px-4 pb-4">
              <EmptyState>{empty}</EmptyState>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </PageShell>
  );
}

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { POSITION_KIND_LABELS } from "@/lib/leave/messages";
import type { PositionKind } from "@/lib/leave/types";
import { requireRole } from "@/lib/supabase/viewer";
import { ROLE_LABELS, isAppRole, usersEmptyState } from "@/lib/users/roles";
import { EmptyState, PageShell } from "../../_components/ui";
import { InviteDialog } from "./invite-dialog";

// AC-USERS-07: лише адміністратор — працівника й менеджера requireRole веде на головну, без сесії proxy і getViewer
// ведуть на /login (AC-USERS-10). Дані — клієнтом користувача під RLS: адміністратор бачить усі профілі й посади.
export default async function UsersPage() {
  const { supabase, viewer } = await requireRole("admin");

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
        <InviteDialog divisions={divisions ?? []} />
      </div>

      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="px-4 text-muted-foreground">Email</TableHead>
                <TableHead className="text-muted-foreground">Ім&apos;я</TableHead>
                <TableHead className="text-muted-foreground">Роль</TableHead>
                <TableHead className="px-4 text-muted-foreground">Посади</TableHead>
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
                    <TableCell className="px-4 py-3 whitespace-normal">
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {empty ? <EmptyState>{empty}</EmptyState> : null}
    </PageShell>
  );
}

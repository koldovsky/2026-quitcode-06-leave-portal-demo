import { POSITION_KIND_LABELS, errorMessage } from "@/lib/leave/messages";
import type { PositionKind } from "@/lib/leave/types";
import { requireRole } from "@/lib/supabase/viewer";
import { Notice, PageShell } from "../../_components/ui";
import { NewRequestForm, type PositionOption } from "./new-request-form";

// Server Action «Скласти чернетку» чекає на модель до 25 с (src/lib/request-draft/extract.ts); функції Vercel
// даємо 60 с, щоб людина побачила «Помічник зараз недоступний», а не 504.
export const maxDuration = 60;

// AC-LEAVE-01, AC-LEAVE-02: працівник обирає тип, дати й посади, на які припадає відсутність; заміну вказує за
// бажанням (spec-v0.2). AC-DRAFT-01…07: ці поля може заповнити чернетка з опису вільним текстом (NewRequestForm).
export default async function NewRequestPage({ searchParams }: PageProps<"/requests/new">) {
  const { supabase, viewer } = await requireRole("employee");
  const { error } = await searchParams;

  const [{ data: positions }, { data: divisions }] = await Promise.all([
    supabase.from("positions").select("id, kind, title, division_id").eq("employee_id", viewer.id).order("kind", { ascending: false }),
    supabase.from("divisions").select("id, name"),
  ]);
  const divisionName = new Map((divisions ?? []).map((d) => [d.id, d.name]));
  const message = errorMessage(error);
  const options: PositionOption[] = (positions ?? []).map((p) => ({
    id: p.id,
    kind: p.kind as PositionKind,
    label: `${p.title} — ${POSITION_KIND_LABELS[p.kind as PositionKind]}, ${divisionName.get(p.division_id) ?? "—"}`,
  }));

  return (
    <PageShell title="Нова заявка на відсутність" role={viewer.role}>
      {message ? <Notice kind="error">{message}</Notice> : null}
      {!options.length ? (
        <Notice kind="warning">У вас ще немає посади — зверніться до адміністратора.</Notice>
      ) : (
        <NewRequestForm positions={options} />
      )}
    </PageShell>
  );
}

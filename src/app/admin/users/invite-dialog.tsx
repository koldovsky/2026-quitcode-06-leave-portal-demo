"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { AppRole } from "@/lib/leave/types";
import { INVITE_MESSAGES } from "@/lib/users/invite";
import { inviteUser, type InviteState } from "./actions";
import { CopyLinkButton } from "./copy-link-button";

const INITIAL: InviteState = { status: "idle" };

type Division = { id: string; name: string };
type RoleOption = { value: AppRole; label: string };

/** Діалог «Запросити»: форма → посилання для активації з кнопкою «Скопіювати посилання» (AC-USERS-01, AC-USERS-11). */
export function InviteDialog({ divisions, roles }: { divisions: Division[]; roles?: RoleOption[] }) {
  // Закриття діалогу перестворює форму: посилання (живий credential) не лишається в пам'яті сторінки.
  const [round, setRound] = useState(0);
  return (
    <Dialog onOpenChange={(open) => (open ? undefined : setRound((r) => r + 1))}>
      <DialogTrigger render={<Button />}>Запросити</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Запросити користувача</DialogTitle>
          <DialogDescription>
            Портал створить акаунт і дасть посилання для активації. Листа немає: посилання передаєте ви.
          </DialogDescription>
        </DialogHeader>
        <InviteForm key={round} divisions={divisions} roles={roles} />
      </DialogContent>
    </Dialog>
  );
}

function InviteForm({ divisions, roles }: { divisions: Division[]; roles?: RoleOption[] }) {
  const [state, formAction, pending] = useActionState(inviteUser, INITIAL);
  const error = state.status === "done" && !state.ok ? state.error : null;

  if (state.status === "done" && state.ok) {
    return (
      <div className="flex flex-col gap-4" data-testid="invite-result">
        <p role="status" className="rounded-md bg-status-approved px-3 py-2 text-sm text-status-approved-foreground">
          Запрошення для {state.email} створено.
        </p>
        {state.warnings.map((w) => (
          <p key={w} role="status" className="rounded-md bg-status-pending px-3 py-2 text-sm text-status-pending-foreground">
            {INVITE_MESSAGES[w]}
          </p>
        ))}
        <div className="flex flex-col gap-2">
          <Label htmlFor="activation-link">Посилання для активації</Label>
          <Input
            id="activation-link"
            readOnly
            value={state.link}
            onFocus={(e) => e.currentTarget.select()}
            aria-describedby="activation-link-hint"
            className="font-mono text-xs"
          />
          <p id="activation-link-hint" className="text-xs text-muted-foreground">
            Посилання одноразове й діє 1 годину. Передайте його лише цій людині: хто відкриє його першим, той і задасть
            пароль.
          </p>
        </div>
        <CopyLinkButton link={state.link} />
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="invite-email">Email</Label>
        <Input
          id="invite-email"
          name="email"
          type="email"
          required
          autoComplete="off"
          placeholder="new.teacher@example.test"
          aria-invalid={error === "INVALID_EMAIL" || error === "EMAIL_EXISTS" ? true : undefined}
          aria-describedby={error ? "invite-error" : undefined}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="invite-name">Ім&apos;я (необов&apos;язково)</Label>
        <Input id="invite-name" name="full_name" autoComplete="off" />
      </div>
      {roles?.length ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-role">Роль</Label>
          <NativeSelect id="invite-role" name="role" defaultValue="employee" className="w-full">
            {roles.map((r) => (
              <NativeSelectOption key={r.value} value={r.value}>
                {r.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-division">Підрозділ основної посади</Label>
          <NativeSelect id="invite-division" name="division_id" defaultValue="" className="w-full">
            <NativeSelectOption value="">без посади</NativeSelectOption>
            {divisions.map((d) => (
              <NativeSelectOption key={d.id} value={d.id}>
                {d.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-title">Назва посади</Label>
          <Input
            id="invite-title"
            name="position_title"
            placeholder="Вчитель математики"
            aria-invalid={error === "POSITION_TITLE_REQUIRED" ? true : undefined}
          />
        </div>
      </div>
      {error ? (
        <p id="invite-error" role="alert" className="text-sm text-destructive">
          {INVITE_MESSAGES[error]}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Надсилаємо…" : "Запросити"}
      </Button>
    </form>
  );
}

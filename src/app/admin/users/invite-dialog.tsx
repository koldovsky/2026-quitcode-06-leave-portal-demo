"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
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
  const failed = state.status === "done" && !state.ok ? state : null;
  const error = failed?.error ?? null;
  // Що ввела людина: після помилки форма не очищається (React скидає поля до defaultValue).
  const values = failed?.values;
  // Помилка поля — під своїм полем (aria-invalid + aria-describedby); FORBIDDEN і LINK_FAILED — до всієї форми.
  const emailError = error === "INVALID_EMAIL" || error === "EMAIL_EXISTS" ? INVITE_MESSAGES[error] : null;
  const roleError = error === "INVALID_ROLE" ? INVITE_MESSAGES[error] : null;
  const titleError = error === "POSITION_TITLE_REQUIRED" ? INVITE_MESSAGES[error] : null;
  const formError = error === "FORBIDDEN" || error === "LINK_FAILED" ? INVITE_MESSAGES[error] : null;

  // Фокус — на перше поле з помилкою (DESIGN.md, «Стани»).
  const emailRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLSelectElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const focusField = emailError ? emailRef : roleError ? roleRef : titleError ? titleRef : null;
  useEffect(() => {
    focusField?.current?.focus();
  }, [state, focusField]);

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
            Посилання одноразове й діє 1 годину. Передайте його лише цій людині: хто першим активує за ним акаунт, той і
            задасть пароль.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CopyLinkButton link={state.link} />
          <DialogClose render={<Button variant="outline" />}>Готово</DialogClose>
        </div>
      </div>
    );
  }

  return (
    // key: після помилки форма монтується наново з defaultValue = введене (select інакше не відновлює вибір).
    <form key={`${error ?? "new"}:${JSON.stringify(values ?? null)}`} action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="invite-email">Email</Label>
        <Input
          ref={emailRef}
          id="invite-email"
          name="email"
          type="email"
          required
          autoComplete="off"
          placeholder="new.teacher@example.test"
          defaultValue={values?.email}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "invite-email-error" : undefined}
        />
        {emailError ? (
          <p id="invite-email-error" role="alert" className="text-xs text-destructive">
            {emailError}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="invite-name">Ім&apos;я (необов&apos;язково)</Label>
        <Input id="invite-name" name="full_name" autoComplete="off" defaultValue={values?.full_name} />
      </div>
      {roles?.length ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-role">Роль</Label>
          <NativeSelect
            ref={roleRef}
            id="invite-role"
            name="role"
            defaultValue={values?.role || "employee"}
            className="w-full"
            aria-invalid={roleError ? true : undefined}
            aria-describedby={roleError ? "invite-role-error" : undefined}
          >
            {roles.map((r) => (
              <NativeSelectOption key={r.value} value={r.value}>
                {r.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {roleError ? (
            <p id="invite-role-error" role="alert" className="text-xs text-destructive">
              {roleError}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-division">Підрозділ основної посади</Label>
          <NativeSelect id="invite-division" name="division_id" defaultValue={values?.division_id ?? ""} className="w-full">
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
            ref={titleRef}
            id="invite-title"
            name="position_title"
            placeholder="Вчитель математики"
            defaultValue={values?.position_title}
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? "invite-title-error" : undefined}
          />
          {titleError ? (
            <p id="invite-title-error" role="alert" className="text-xs text-destructive">
              {titleError}
            </p>
          ) : null}
        </div>
      </div>
      {formError ? (
        <p id="invite-error" role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Надсилаємо…" : "Запросити"}
      </Button>
    </form>
  );
}

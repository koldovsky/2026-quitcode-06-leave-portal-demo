import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PASSWORD_MESSAGES, PASSWORD_MIN_LENGTH, passwordErrorField } from "@/lib/auth/password";
import { getViewer } from "@/lib/supabase/viewer";
import { SubmitButton } from "../../_components/submit-button";
import { Field, Notice, fieldDescribedBy } from "../../_components/ui";
import { setPassword } from "./actions";

// AC-USERS-02: сюди веде посилання для активації (/auth/confirm → next=/account/password). Без сесії — /login.
export default async function PasswordPage({ searchParams }: PageProps<"/account/password">) {
  const { email } = await getViewer();
  const { error } = await searchParams;
  const message =
    typeof error === "string" && Object.hasOwn(PASSWORD_MESSAGES, error)
      ? PASSWORD_MESSAGES[error as keyof typeof PASSWORD_MESSAGES]
      : undefined;
  // Помилка поля — під своїм полем (aria-invalid + aria-describedby); помилка збереження — над кнопкою.
  const errorField = passwordErrorField(error);
  const passwordError = errorField === "password" ? message : undefined;
  const confirmError = errorField === "password_confirm" ? message : undefined;
  const formError = message && !errorField ? message : undefined;
  const hint = `Щонайменше ${PASSWORD_MIN_LENGTH} символів.`;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <p className="text-sm font-semibold text-muted-foreground">Портал відсутностей</p>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-2xl font-semibold tracking-tight">Новий пароль</h1>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Акаунт <span className="font-mono text-[13px]">{email ?? "—"}</span>. Пароль знатимете лише ви.
          </p>
        </CardHeader>
        <CardContent>
          <form action={setPassword} className="flex flex-col gap-4">
            <Field id="password" label="Пароль" hint={hint} error={passwordError}>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                required
                aria-describedby={fieldDescribedBy("password", { hint, error: passwordError })}
                aria-invalid={passwordError ? true : undefined}
              />
            </Field>
            <Field id="password_confirm" label="Пароль ще раз" error={confirmError}>
              <Input
                id="password_confirm"
                name="password_confirm"
                type="password"
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                required
                aria-describedby={fieldDescribedBy("password_confirm", { error: confirmError })}
                aria-invalid={confirmError ? true : undefined}
              />
            </Field>
            {formError ? <Notice kind="error">{formError}</Notice> : null}
            <SubmitButton>Зберегти пароль</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

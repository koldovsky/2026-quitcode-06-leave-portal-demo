import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "../_components/submit-button";
import { Field, Notice } from "../_components/ui";
import { login } from "./actions";

const ERRORS: Record<string, string> = {
  missing: "Вкажіть email і пароль.",
  invalid: "Невірний email або пароль.",
  // AC-USERS-05: /auth/confirm не прийняв посилання для активації.
  link: "Посилання недійсне або вже використане. Зверніться до адміністратора.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <p className="text-sm font-semibold text-muted-foreground">Портал відсутностей</p>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-2xl font-semibold tracking-tight">Вхід</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={login} className="flex flex-col gap-4">
            <Field id="email" label="Email">
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </Field>
            <Field id="password" label="Пароль">
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </Field>
            {message ? <Notice kind="error">{message}</Notice> : null}
            <SubmitButton>Увійти</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

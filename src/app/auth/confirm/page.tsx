// Сторінка активації: сюди веде посилання /auth/confirm?token_hash=…&type=invite&next=/account/password
// (src/lib/users/invite.ts). Відкриття посилання (GET) нічого не перевіряє й не витрачає: боти прев'ю в месенджерах і
// поштових сервісах відкривають посилання раніше за людину. Токен витрачає дія activate (POST) після натискання
// «Активувати акаунт». Шлях /auth — у PUBLIC_PATHS proxy (людина ще не увійшла).
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { activationFields } from "@/lib/auth/confirm";
import { SubmitButton } from "../../_components/submit-button";
import { activate } from "./actions";

export default async function ConfirmPage({ searchParams }: PageProps<"/auth/confirm">) {
  // Значення з адреси — лише в прихованих полях форми; React екранує їх сам. Перевіряє їх дія activate.
  const fields = activationFields(await searchParams);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <p className="text-sm font-semibold text-muted-foreground">Портал відсутностей</p>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-2xl font-semibold tracking-tight">Активувати акаунт</h1>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Натисніть «Активувати акаунт», щоб увійти й задати пароль. Посилання діє один раз.
          </p>
        </CardHeader>
        <CardContent>
          {/* AC-USERS-02, AC-USERS-05: перевірка посилання — лише після натискання (POST). */}
          <form action={activate}>
            <input type="hidden" name="token_hash" value={fields.token_hash} />
            <input type="hidden" name="type" value={fields.type} />
            <input type="hidden" name="next" value={fields.next} />
            <SubmitButton pendingText="Активуємо…">Активувати акаунт</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

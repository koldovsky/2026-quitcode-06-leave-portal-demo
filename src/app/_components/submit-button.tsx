"use client";

// Кнопка надсилання форми зі станом завантаження (DESIGN.md, «Стани»): поки дія виконується — «Надсилаємо…» (або свій
// текст) і disabled, тож подвійне натискання не надішле форму двічі.
import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingText = "Надсилаємо…",
  ...props
}: Omit<ComponentProps<typeof Button>, "type"> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} type="submit" disabled={pending || props.disabled}>
      {pending ? pendingText : children}
    </Button>
  );
}

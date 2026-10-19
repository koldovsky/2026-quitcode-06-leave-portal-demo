"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** AC-USERS-11: копіює посилання для активації в буфер обміну й підтверджує «Посилання скопійовано». */
export function CopyLinkButton({ link }: { link: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" onClick={copy}>
        Скопіювати посилання
      </Button>
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {state === "copied" ? "Посилання скопійовано" : null}
        {state === "failed" ? "Не вдалося скопіювати — виділіть посилання й скопіюйте вручну." : null}
      </p>
    </div>
  );
}

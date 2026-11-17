# Інциденти: postmortem і стенограми розбору

Тут — розбори інцидентів і дрілів демо-продукту. Кожен інцидент — два файли:

| Файл | Що в ньому | Шаблон (набір WS11) |
|---|---|---|
| `<YYYY-MM-DD>-<slug>.md` | blameless postmortem: хронологія з часом, вплив мовою користувача, першопричина з доказом на кожне твердження, «що НЕ було причиною», дії з власником | `materials/ops-kit/docs/incidents/postmortem.template.md` |
| `<YYYY-MM-DD>-<slug>-rca.md` | дослівна стенограма розбору агентом у профілі «лише пропонує» (`/export` з Claude Code) із заголовком: дата, модель, профіль, що агент міг і чого не міг | `materials/ops-kit/docs/incidents/rca-transcript.template.md` |

Шаблони — у репо домашки WS11:
<https://github.com/koldovsky/2026-quitcode-11-devops-operations-hw/tree/main/materials/ops-kit/docs/incidents>.

**Поки що порожньо.** Сценарій дрілу «хибна `NEXT_PUBLIC_SUPABASE_URL` на staging» на занятті WS11
(Вт 17.11.2026) розібрано на слайдах, без запуску на staging: postmortem і стенограми розбору немає. Дія, яку
пропонує postmortem цього сценарію, — PR [#41](https://github.com/koldovsky/2026-quitcode-06-leave-portal-demo/pull/41)
(`/api/health` називає хибну змінну); локальні докази — [`docs/demo/evidence-ws11/`](../demo/evidence-ws11/README.md).
Postmortem `<YYYY-MM-DD>-staging-supabase-url.md` і стенограма з'являться тут, коли дріл проведуть на staging
([`docs/demo/RUNBOOK-ws11.md`](../demo/RUNBOOK-ws11.md), розділ 5).

Правила для обох файлів: без імен людей (ролі), без значень змінних, токенів і chat id — лише назви; кожне
твердження — з посиланням на прогін, деплой, коміт чи рядок стенограми; чого немає в доказах — «немає даних».

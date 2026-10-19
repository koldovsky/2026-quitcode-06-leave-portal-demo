// Куди вести людину після /auth/confirm. Параметр next приходить з посилання, тобто від будь-кого: приймаємо лише
// відносний шлях цього сайту, інакше — головна. Захист від open redirect (/auth/confirm?…&next=//evil.example).
const BASE = "http://portal.invalid";

const isUnsafeChar = (ch: string) => {
  const code = ch.charCodeAt(0);
  return ch === "\\" || code < 0x20 || code === 0x7f;
};

export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (typeof next !== "string" || !next.startsWith("/")) return fallback;
  // «//host» і «/\host» браузер читає як адресу іншого сайту; табуляцію й переноси рядка він викидає з URL,
  // тож «/\t/host» стає «//host». Тому жодних зворотних скісних і керівних символів.
  if (next.startsWith("//") || [...next].some(isUnsafeChar)) return fallback;
  try {
    const url = new URL(next, BASE);
    if (url.origin !== BASE) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

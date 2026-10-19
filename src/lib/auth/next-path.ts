// Куди вести людину після активації на /auth/confirm. Параметр next приходить з посилання, тобто від будь-кого:
// приймаємо лише відносний шлях цього сайту, інакше — головна. Захист від open redirect (…&next=//evil.example).
const FALLBACK = "/";
// Умовна адреса для розбору: потрібен лише шлях, а не справжній домен (.invalid не існує).
const BASE = "http://portal.invalid";

export function safeNextPath(next: unknown): string {
  // Лише рядок, що починається з одного «/»: не «//host» (адреса іншого сайту), не «/\host» (браузер читає «\» як «/»),
  // не «https://…» і не «javascript:…».
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return FALLBACK;
  }
  // Жодних пробілів, керівних символів і «\»: URL-парсер викидає таб і перенесення рядка, тож «/\t/evil.example»
  // стане «//evil.example».
  if (/[\s\u0000-\u001f\u007f\\]/.test(next)) return FALLBACK;
  try {
    const url = new URL(next, BASE);
    // Після розбору адреса має лишитися на тому самому origin…
    if (url.origin !== BASE) return FALLBACK;
    // …і шлях не має починатися з «//» чи «/\»: розбір нормалізує «/./» і «/../», тож «/.//evil.example»
    // (так само «/%2e//…» і «/x/..//…») стає «//evil.example» — а це вже адреса іншого сайту.
    if (url.pathname.startsWith("//") || url.pathname.startsWith("/\\")) return FALLBACK;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return FALLBACK;
  }
}

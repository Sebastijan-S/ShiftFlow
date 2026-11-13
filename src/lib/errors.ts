export function errorMessage(cause: unknown, fallback: string): string {
  if (typeof cause === "object" && cause !== null && "message" in cause && typeof cause.message === "string") {
    if (cause.message.startsWith("Schedule changed;")) return "Raspored je izmenjen u drugoj sesiji. Pregledajte novu reviziju sa servera pre čuvanja ili objave.";
    if (cause.message.startsWith("Setup changed;")) return "Podaci za raspored su izmenjeni. Osvežite podatke i pregledajte predlog pre ponovnog čuvanja ili objave.";
    return cause.message;
  }
  return fallback;
}

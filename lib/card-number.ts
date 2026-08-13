export function normalizeCardNumber(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const normalized = String(value).trim().replace(/^(?:card\s*)?#\s*/i,"");
  if (!normalized || normalized === "-" || normalized.toLocaleLowerCase() === "n/a") return undefined;
  return normalized;
}

export function cardNumberLabel(value: unknown) {
  const number = normalizeCardNumber(value);
  return number ? `CARD #${number}` : null;
}

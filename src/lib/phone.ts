import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export function normalizePhone(input: string, country: CountryCode): string | null {
  const parsed = parsePhoneNumberFromString(input, country);
  return parsed?.isValid() ? parsed.number : null;
}

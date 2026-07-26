/**
 * Normalizes a phone number for the WhatsApp wa.me API link.
 * - Strips all non-digit characters.
 * - Replaces a single leading '0' with the business's countryCode.
 * - Handles leading '00' by stripping it.
 * - Prepends countryCode if the number is short and doesn't already have it.
 */
export function normalizePhoneNumber(phone: string, countryCode: string): string {
  const cleanPhone = phone.replace(/\D/g, '');

  if (!cleanPhone) return '';

  if (cleanPhone.startsWith('0')) {
    if (cleanPhone.startsWith('00')) {
      return cleanPhone.substring(2);
    }
    // E.g. '0977123456' -> '260977123456'
    return countryCode + cleanPhone.substring(1);
  }

  // If the number doesn't start with the country code and has length of standard local number
  // (e.g. Zambia numbers are typically 9 digits without the leading '0')
  if (!cleanPhone.startsWith(countryCode) && cleanPhone.length <= 9) {
    return countryCode + cleanPhone;
  }

  return cleanPhone;
}

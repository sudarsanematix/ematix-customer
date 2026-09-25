export function normalizeIndianPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }

  if (digits.length === 13 && digits.startsWith('091')) {
    return `+${digits.slice(1)}`;
  }

  return phone;
}

export function telLink(phone?: string | null): string | null {
  const normalized = normalizeIndianPhone(phone);
  return normalized ? `tel:${normalized}` : null;
}
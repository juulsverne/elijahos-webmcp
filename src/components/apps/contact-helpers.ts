// Shared URL/email helpers for any app surface that wants to open mail or
// link out to a contact channel. Pure functions, no state — keep it that way
// so callers can use them from event handlers, useMemo bodies, anywhere.

import type { Contact } from "@/lib/elijah";

export function ensureHttps(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
}

export function contactEmail(contact: Contact): string {
  return `${contact.emailUser}@${contact.emailDomain}`;
}

export function mailtoFor(
  contact: Contact,
  subject?: string,
  message?: string,
): string {
  const params = new URLSearchParams();
  if (subject?.trim()) params.set("subject", subject.trim());
  if (message?.trim()) params.set("body", message.trim());
  const query = params.toString();
  return `mailto:${contactEmail(contact)}${query ? `?${query}` : ""}`;
}

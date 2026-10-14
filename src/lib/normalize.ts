import { parsePhoneNumberFromString } from "libphonenumber-js";

export const normalizePhone = (raw: string) =>
  parsePhoneNumberFromString(raw, "MY")?.number ?? raw.replace(/[^\d+]/g, "");

export const normalizeEmail = (e: string) => e.trim().toLowerCase();

export const normalizeUrl = (u: string) => {
  const t = u.trim();
  return !t ? "" : /^https?:\/\//i.test(t) ? t : `https://${t}`;
};

export const buildSearchText = (c: {
  fullName: string; jobTitle: string; company: string; phones: string[]; emails: string[];
  website: string; address: string; event?: string; tags: string[]; note: string; rawText: string;
}) =>
  [c.fullName, c.jobTitle, c.company, c.phones.join(" "), c.emails.join(" "), c.website, c.address,
   c.event ?? "", c.tags.join(" "), c.note, c.rawText].join(" ").toLowerCase();

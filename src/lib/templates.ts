import type { Booking, Property } from "@prisma/client";

export type TemplateContext = {
  booking: Pick<Booking, "guestName" | "guestEmail" | "guestPhone" | "checkIn" | "checkOut" | "guests" | "totalPrice" | "notes">;
  property: Pick<Property, "name" | "type" | "location" | "bedrooms" | "bathrooms" | "maxGuests">;
};

const VAR_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-PH", { weekday: "short", year: "numeric", month: "long", day: "numeric" });
}

function fmtShortDate(d: Date): string {
  return d.toLocaleDateString("en-PH", { month: "numeric", day: "numeric" });
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

export function buildVars(ctx: TemplateContext): Record<string, string> {
  const { booking, property } = ctx;
  const { first, last } = splitName(booking.guestName);
  const nights = Math.max(1, Math.ceil((booking.checkOut.getTime() - booking.checkIn.getTime()) / 86400000));

  return {
    guestFirstName: first,
    guestLastName: last,
    guestName: booking.guestName,
    guestEmail: booking.guestEmail,
    guestPhone: booking.guestPhone,
    guests: String(booking.guests),
    checkIn: fmtDate(booking.checkIn),
    checkOut: fmtDate(booking.checkOut),
    checkInShort: fmtShortDate(booking.checkIn),
    checkOutShort: fmtShortDate(booking.checkOut),
    nights: String(nights),
    totalPrice: `₱${Number(booking.totalPrice).toLocaleString()}`,
    propertyName: property.name,
    propertyType: property.type,
    propertyLocation: property.location,
    bedrooms: String(property.bedrooms),
    bathrooms: String(property.bathrooms),
    maxGuests: String(property.maxGuests),
  };
}

export function render(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(VAR_RE, (_, key: string) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : `{{${key}}}`;
  });
}

export function threadHeader(ctx: TemplateContext): string {
  const { first } = splitName(ctx.booking.guestName);
  return `${first}, ${ctx.property.type}, ${fmtShortDate(ctx.booking.checkIn)}-${fmtShortDate(ctx.booking.checkOut)}`;
}

export const TEMPLATE_VARS: Array<{ name: string; desc: string }> = [
  { name: "guestFirstName", desc: "Guest's first name" },
  { name: "guestLastName", desc: "Guest's last name" },
  { name: "guestName", desc: "Guest's full name" },
  { name: "guestEmail", desc: "Guest's email" },
  { name: "guestPhone", desc: "Guest's phone" },
  { name: "guests", desc: "Number of guests" },
  { name: "checkIn", desc: "Check-in date (long)" },
  { name: "checkOut", desc: "Check-out date (long)" },
  { name: "checkInShort", desc: "Check-in date (M/D)" },
  { name: "checkOutShort", desc: "Check-out date (M/D)" },
  { name: "nights", desc: "Number of nights" },
  { name: "totalPrice", desc: "Total booking price" },
  { name: "propertyName", desc: "Property name" },
  { name: "propertyType", desc: "Property type (2BR, Studio, etc.)" },
  { name: "propertyLocation", desc: "Property location" },
  { name: "bedrooms", desc: "Number of bedrooms" },
  { name: "bathrooms", desc: "Number of bathrooms" },
  { name: "maxGuests", desc: "Max guests" },
];

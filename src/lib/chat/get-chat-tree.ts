import { prisma } from "@/lib/prisma";
import { chatTree, type ChatNode } from "./chat-tree";
import { buildOccupancyNote, sanitizeChargeProse } from "@/lib/occupancy";

/**
 * Returns the chat tree with dynamic property nodes injected from the database.
 * Called server-side (e.g. in layout or page) and passed to the client widget as props.
 */
export async function getChatTree(): Promise<Record<string, ChatNode>> {
  const properties = await prisma.property.findMany({
    // only surface fully-priced properties in the chat assistant
    where: { isActive: true, pricePerNight: { gt: 0 } },
    select: {
      slug: true,
      name: true,
      type: true,
      pricePerNight: true,
      maxGuests: true,
      bedrooms: true,
      bathrooms: true,
      includedGuests: true,
      extraGuestFeePerNight: true,
      propertyRules: true,
    },
    orderBy: { name: "asc" },
  });

  // Deep clone so we don't mutate the module-level object
  const tree: Record<string, ChatNode> = JSON.parse(JSON.stringify(chatTree));

  // ── Inject property listing options ──
  tree.properties.options = [
    ...properties.map((p) => ({
      label: `${p.name} (${p.type})`,
      nodeId: `property-${p.slug}`,
    })),
    { label: "← Back to topics", nodeId: "root" },
  ];

  // Create a detail node per property
  for (const p of properties) {
    const price = Number(p.pricePerNight).toLocaleString();
    const occupancy = {
      maxGuests: p.maxGuests,
      includedGuests: p.includedGuests,
      extraGuestFeePerNight: Number(p.extraGuestFeePerNight),
    };
    tree[`property-${p.slug}`] = {
      id: `property-${p.slug}`,
      message:
        `**${p.name}** — ${p.type}\n\n` +
        `• ${p.bedrooms} bedroom${p.bedrooms !== 1 ? "s" : ""}, ` +
        `${p.bathrooms} bathroom${p.bathrooms !== 1 ? "s" : ""}\n` +
        `• Up to ${p.maxGuests} guest${p.maxGuests !== 1 ? "s" : ""}\n` +
        `• Starting at ₱${price}/night\n\n` +
        buildOccupancyNote(occupancy),
      options: [
        { label: "Other properties", nodeId: "properties" },
        { label: "← Back to topics", nodeId: "root" },
      ],
      link: { label: "Check Availability", href: `/properties/${p.slug}#book` },
    };
  }

  // ── Inject house rules options ──
  const propertiesWithRules = properties.filter((p) => p.propertyRules);

  tree["booking-rules"].options = [
    ...propertiesWithRules.map((p) => ({
      label: `${p.name} (${p.type})`,
      nodeId: `booking-rules-${p.slug}`,
    })),
    { label: "← Back to Booking", nodeId: "booking" },
  ];

  // If no properties have rules, show a fallback message
  if (propertiesWithRules.length === 0) {
    tree["booking-rules"].message =
      "House rules will be shown on each property's booking page. If you have specific questions, feel free to contact us!";
    tree["booking-rules"].options = [
      { label: "Contact Us", nodeId: "contact" },
      { label: "← Back to topics", nodeId: "root" },
    ];
  }

  // Create a house rules node per property
  for (const p of propertiesWithRules) {
    tree[`booking-rules-${p.slug}`] = {
      id: `booking-rules-${p.slug}`,
      message: `**House Rules — ${p.name}**\n\n${sanitizeChargeProse(p.propertyRules, {
        maxGuests: p.maxGuests,
        includedGuests: p.includedGuests,
        extraGuestFeePerNight: Number(p.extraGuestFeePerNight),
      })}`,
      options: [
        { label: "Other properties' rules", nodeId: "booking-rules" },
        { label: "← Back to topics", nodeId: "root" },
      ],
      link: { label: "Check Availability", href: `/properties/${p.slug}#book` },
    };
  }

  return tree;
}

// Shared content for the Haven in Lipa Ambassador program.
// Kept in one place so the public landing page and the enrollment form's
// "agree to terms" box always show the same wording.

export const AMBASSADOR_GUIDELINES: string[] = [
  "Rewards are paid only for completed direct bookings made using your Ambassador Promo Code or referral link.",
  "Cancelled or refunded bookings do not qualify for rewards.",
  "Self-bookings are not eligible.",
  "Please represent Haven in Lipa honestly and professionally.",
  "Haven in Lipa reserves the right to modify or discontinue the Ambassador Program at any time.",
];

export interface RewardTier {
  level: string;
  bookings: string;
  reward: string;
  icon: string; // Font Awesome class
  color: string; // accent hex
}

export const REWARD_TIERS: RewardTier[] = [
  { level: "Bronze",   bookings: "1 – 10",  reward: "₱200", icon: "fa-medal",    color: "#CD7F32" },
  { level: "Silver",   bookings: "11 – 20", reward: "₱400", icon: "fa-medal",    color: "#9CA3AF" },
  { level: "Gold",     bookings: "21 – 30", reward: "₱600", icon: "fa-medal",    color: "#C4A862" },
  { level: "Platinum", bookings: "31+",     reward: "₱800", icon: "fa-gem",      color: "#3B5323" },
];

export const HOW_TO_JOIN: { title: string; body: string }[] = [
  { title: "Apply online", body: "Complete the Ambassador application below — it only takes a few minutes." },
  { title: "Get approved", body: "Once approved, you'll receive your unique Ambassador Promo Code and a personalized booking link." },
  { title: "Get your toolkit", body: "We'll send marketing photos, videos, and social media content ideas to make sharing easy." },
  { title: "Share & earn", body: "Start sharing with your audience and earn rewards on every completed booking." },
];

export const WHY_JOIN: { icon: string; text: string }[] = [
  { icon: "fa-compass",      text: "Help visitors discover the best of Lipa City" },
  { icon: "fa-tag",          text: "Give your audience an exclusive 5% direct-booking discount" },
  { icon: "fa-hand-holding-dollar", text: "Earn rewards for every successful referral" },
  { icon: "fa-images",       text: "Receive marketing materials that make sharing easy" },
  { icon: "fa-people-group", text: "Become part of the growing Haven in Lipa Ambassador community" },
];

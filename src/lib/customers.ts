/**
 * Derived "customers" — there is no Customer table. A customer is a cluster of
 * bookings that share contact info. We group bookings by email OR phone, with
 * transitive joining (A↔B by phone, B↔C by email ⇒ one customer) via union-find.
 *
 * Computed at request time from the full bookings list — zero schema, works on
 * existing data. Used by the admin Customers list and customer detail pages.
 */

/** A booking shape carrying the fields the grouping/aggregation needs. */
export interface CustomerBooking {
  id: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: Date;
  checkOut: Date;
  totalPrice: unknown; // Prisma Decimal — coerced via Number()
  status: string;
  createdAt: Date;
  property: { name: string };
}

export interface Customer {
  /** Stable key: id of the earliest booking in the cluster (by createdAt). */
  id: number;
  name: string;
  email: string;
  phone: string;
  bookingCount: number;
  /** Sum of totalPrice over CONFIRMED bookings only. */
  totalSpent: number;
  /** Sum of totalPrice over ALL bookings (pending/cancelled included). */
  grossSpent: number;
  lastStay: Date; // max checkOut
  firstSeen: Date; // min createdAt
  bookings: CustomerBooking[];
}

export function normEmail(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/** Digits only; keep the last 10 to tolerate country-code / formatting variants. */
export function normPhone(s: string | null | undefined): string {
  const digits = (s ?? "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/** Union-find (disjoint set) over booking array indices. */
class UnionFind {
  private parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[ra] = rb;
  }
}

/**
 * Cluster bookings into customers by shared email OR phone (transitive).
 * Returns customers sorted by most recent stay first.
 */
export function groupCustomers(bookings: CustomerBooking[]): Customer[] {
  const uf = new UnionFind(bookings.length);

  // Link bookings that share a normalized email or phone.
  const byEmail = new Map<string, number>();
  const byPhone = new Map<string, number>();
  bookings.forEach((b, i) => {
    const e = normEmail(b.guestEmail);
    const p = normPhone(b.guestPhone);
    if (e) {
      if (byEmail.has(e)) uf.union(i, byEmail.get(e)!);
      else byEmail.set(e, i);
    }
    if (p) {
      if (byPhone.has(p)) uf.union(i, byPhone.get(p)!);
      else byPhone.set(p, i);
    }
  });

  // Collect cluster members by root.
  const clusters = new Map<number, number[]>();
  bookings.forEach((_, i) => {
    const root = uf.find(i);
    const arr = clusters.get(root) ?? [];
    arr.push(i);
    clusters.set(root, arr);
  });

  const customers: Customer[] = [];
  for (const indices of clusters.values()) {
    const members = indices
      .map((i) => bookings[i])
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()); // earliest first

    const earliest = members[0];
    const mostRecent = members[members.length - 1];

    let totalSpent = 0;
    let grossSpent = 0;
    let lastStay = members[0].checkOut;
    for (const m of members) {
      const price = Number(m.totalPrice) || 0;
      grossSpent += price;
      if (m.status === "confirmed") totalSpent += price;
      if (m.checkOut.getTime() > lastStay.getTime()) lastStay = m.checkOut;
    }

    customers.push({
      id: earliest.id,
      name: mostRecent.guestName,
      email: mostRecent.guestEmail,
      phone: mostRecent.guestPhone,
      bookingCount: members.length,
      totalSpent,
      grossSpent,
      lastStay,
      firstSeen: earliest.createdAt,
      // bookings shown newest-first in the UI
      bookings: [...members].reverse(),
    });
  }

  customers.sort((a, b) => b.lastStay.getTime() - a.lastStay.getTime());
  return customers;
}

/**
 * Recompute clusters and return the customer containing `bookingId`.
 * Lets the customer detail route resolve from any member booking id.
 */
export function findCustomerCluster(
  bookings: CustomerBooking[],
  bookingId: number
): Customer | null {
  const customers = groupCustomers(bookings);
  return (
    customers.find((c) => c.bookings.some((b) => b.id === bookingId)) ?? null
  );
}

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ChargePaymentClient from "@/components/charge/ChargePaymentClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pay your charge — Haven in Lipa",
  robots: { index: false, follow: false },
};

const peso = (n: number) => `₱${Number(n).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
const firstName = (full: string) => full.trim().split(/\s+/)[0] || full;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-cream flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-6">
          <h1 className="font-serif text-[1.5rem] text-forest font-semibold">Haven in Lipa</h1>
          <p className="text-[12px] text-charcoal/45 uppercase tracking-wider mt-1">Secure Payment</p>
        </div>
        {children}
        <p className="text-center text-[11px] text-charcoal/35 mt-6">
          Questions? Email{" "}
          <a href="mailto:customerservice@haveninlipa.com" className="underline">customerservice@haveninlipa.com</a>
        </p>
      </div>
    </main>
  );
}

function StatusCard({ icon, color, title, body }: { icon: string; color: string; title: string; body: string }) {
  return (
    <div className="bg-white rounded-[16px] p-8 border border-black/[.06] shadow-[0_2px_12px_rgba(44,44,44,.07)] text-center">
      <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4 ${color}`}>
        <i className={`fa-solid ${icon} text-2xl`} />
      </div>
      <h2 className="font-serif text-[1.3rem] text-charcoal font-semibold mb-2">{title}</h2>
      <p className="text-[14px] text-charcoal/65 leading-relaxed">{body}</p>
    </div>
  );
}

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const charge = await prisma.additionalCharge.findUnique({
    where: { token },
    include: { booking: { include: { property: { select: { name: true } } } } },
  });

  if (!charge) notFound();

  const amount = Number(charge.amount);
  const { booking } = charge;

  if (charge.status === "cancelled") {
    return (
      <Shell>
        <StatusCard
          icon="fa-circle-xmark"
          color="bg-gray-100 text-gray-500"
          title="This charge is no longer active"
          body="This payment request has been cancelled by the host. If you believe this is a mistake, please get in touch."
        />
      </Shell>
    );
  }

  if (charge.status === "paid") {
    return (
      <Shell>
        <StatusCard
          icon="fa-circle-check"
          color="bg-green-100 text-green-600"
          title="Already paid"
          body={`This charge for ${charge.description} (${peso(amount)}) has been settled. Thank you!`}
        />
      </Shell>
    );
  }

  if (charge.status === "awaiting_verification") {
    return (
      <Shell>
        <StatusCard
          icon="fa-clock"
          color="bg-blue-100 text-blue-600"
          title="We're confirming your payment"
          body={`Thanks! We've recorded that you paid ${peso(amount)} for ${charge.description}. The host is verifying receipt — no further action is needed.`}
        />
      </Shell>
    );
  }

  // pending → payable
  return (
    <Shell>
      <div className="bg-white rounded-[16px] p-6 border border-black/[.06] shadow-[0_2px_12px_rgba(44,44,44,.07)] mb-5">
        <p className="text-[12px] font-semibold text-charcoal/40 uppercase tracking-wider mb-3">Amount due</p>
        <div className="flex items-baseline justify-between">
          <span className="font-serif text-[1.7rem] text-charcoal font-semibold">{peso(amount)}</span>
        </div>
        <div className="mt-3 pt-3 border-t border-black/[.06] text-[13.5px] text-charcoal/65 space-y-1">
          <div className="flex justify-between"><span className="text-charcoal/45">For</span><span>{charge.description}</span></div>
          <div className="flex justify-between"><span className="text-charcoal/45">Stay</span><span>{booking.property.name}</span></div>
          <div className="flex justify-between"><span className="text-charcoal/45">Guest</span><span>{booking.guestName}</span></div>
        </div>
      </div>

      <ChargePaymentClient
        token={charge.token}
        description={charge.description}
        amount={amount}
        guestFirstName={firstName(booking.guestName)}
      />
    </Shell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Booking terms, cancellation policy, house rules, and payment terms for our short-term rental properties.",
};

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="bg-cream min-h-screen pt-28 pb-20">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="font-serif font-semibold text-charcoal text-[2rem] mb-2">Terms of Service</h1>
          <p className="text-charcoal/40 text-[13px] mb-10">Last updated: April 11, 2026</p>

          <div className="prose-custom space-y-8 text-[14.5px] text-charcoal/75 leading-[1.85]">
            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.15rem] mb-3">1. Overview</h2>
              <p>
                By using this website and submitting a booking, you agree to the following terms.
                These terms govern your use of our short-term rental booking platform and your stay at any of our properties in Lipa City, Batangas, Philippines.
              </p>
            </section>

            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.15rem] mb-3">2. Booking &amp; Confirmation</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>A booking request is not confirmed until you receive a confirmation email from us.</li>
                <li>For <strong>GCash and BPI payments</strong>, your booking remains pending until we manually verify your payment. You will receive a confirmation email once verified.</li>
                <li>For <strong>card payments (Stripe)</strong>, your booking is confirmed immediately upon successful payment authorization.</li>
                <li>We reserve the right to decline any booking request at our discretion.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.15rem] mb-3">3. Payment Terms</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>All prices are listed in Philippine Pesos (PHP).</li>
                <li>We accept <strong>GCash</strong>, <strong>BPI bank transfer</strong>, and <strong>credit/debit card</strong> (via Stripe).</li>
                <li>Card payments include a <strong>6% processing fee</strong> to cover Stripe transaction charges. GCash and BPI payments have no additional fees.</li>
                <li>Full payment is required at the time of booking. We do not offer partial payments or installment plans.</li>
                <li>We do not store your credit card information. All card transactions are processed securely by Stripe.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.15rem] mb-3">4. Cancellation Policy</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>More than 7 days before check-in</strong> — full refund, minus any payment processing fees.</li>
                <li><strong>3 to 7 days before check-in</strong> — 50% refund of the total booking amount.</li>
                <li><strong>Less than 3 days before check-in</strong> — no refund.</li>
                <li><strong>No-shows</strong> — no refund.</li>
                <li>To cancel a booking, please contact us at <a href="mailto:customerservice@haveninlipa.com" className="text-forest underline">customerservice@haveninlipa.com</a> or call <a href="tel:+639066554415" className="text-forest underline">+63 906 655 4415</a>.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.15rem] mb-3">5. Check-in &amp; Check-out</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Check-in time:</strong> 2:00 PM onwards</li>
                <li><strong>Check-out time:</strong> 12:00 PM (noon)</li>
                <li>Early check-in or late check-out may be available upon request, subject to availability. Please mention it in the &ldquo;Special Requests&rdquo; field when booking.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.15rem] mb-3">6. House Rules</h2>
              <p>All guests are expected to follow these general rules during their stay:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>Treat the property and its furnishings with care.</li>
                <li>No smoking inside the property.</li>
                <li>Noise should be kept to a reasonable level, especially after 10:00 PM.</li>
                <li>No unauthorized parties or events.</li>
                <li>The number of overnight guests must not exceed the count declared in your booking.</li>
                <li>Pets are not allowed unless the specific property listing states otherwise.</li>
                <li>Guests are responsible for any damage to the property during their stay.</li>
              </ul>
              <p className="mt-3">
                Individual properties may have additional rules, which will be shown to you during the booking process. You must agree to any property-specific rules before completing your booking.
              </p>
            </section>

            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.15rem] mb-3">7. Damages &amp; Liability</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Guests are responsible for any damage, breakage, or excessive cleaning required as a result of their stay.</li>
                <li>We reserve the right to charge the guest for repair or replacement costs.</li>
                <li>We are not liable for any loss of personal belongings during your stay.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.15rem] mb-3">8. Changes to These Terms</h2>
              <p>
                We may update these terms from time to time. Any changes will be posted on this page with an updated &ldquo;Last updated&rdquo; date. Continued use of the website after changes constitutes acceptance of the updated terms.
              </p>
            </section>

            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.15rem] mb-3">9. Contact Us</h2>
              <p>
                If you have questions about these terms, reach out to us:
              </p>
              <div className="mt-3 space-y-1">
                <p>
                  <i className="fa-solid fa-envelope text-forest mr-2 text-[13px]" />
                  <a href="mailto:customerservice@haveninlipa.com" className="text-forest underline">customerservice@haveninlipa.com</a>
                </p>
                <p>
                  <i className="fa-solid fa-phone text-forest mr-2 text-[13px]" />
                  <a href="tel:+639066554415" className="text-forest underline">+63 906 655 4415</a>
                </p>
              </div>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-charcoal/10">
            <Link href="/" className="text-[13px] text-forest hover:underline">
              <i className="fa-solid fa-arrow-left mr-1.5 text-[11px]" /> Back to Homepage
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

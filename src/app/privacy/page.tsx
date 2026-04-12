import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How we collect, use, and protect your personal information when you book a stay with us.",
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="bg-cream min-h-screen pt-28 pb-20">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="font-serif font-semibold text-charcoal text-[2rem] mb-2">Privacy Policy</h1>
          <p className="text-charcoal/40 text-[13px] mb-10">Last updated: April 11, 2026</p>

          <div className="prose-custom space-y-8 text-[14.5px] text-charcoal/75 leading-[1.85]">
            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.15rem] mb-3">1. Who We Are</h2>
              <p>
                We operate short-term rental properties in Lipa City, Batangas, Philippines.
                This website allows guests to browse our listings, check availability, and submit booking requests.
                When we say &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo; in this policy, we mean the property management team behind this site.
              </p>
            </section>

            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.15rem] mb-3">2. Information We Collect</h2>
              <p>When you make a booking or contact us, we collect:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>Full name</strong> — to identify your reservation</li>
                <li><strong>Email address</strong> — to send booking confirmations and updates</li>
                <li><strong>Phone number</strong> — to reach you regarding your stay</li>
                <li><strong>Booking details</strong> — check-in/check-out dates, number of guests, special requests, and selected property</li>
                <li><strong>Payment method</strong> — which payment channel you used (GCash, BPI, or card). We do not store credit card numbers; card payments are processed securely by Stripe.</li>
              </ul>
              <p className="mt-3">
                We may also collect basic technical data automatically, such as your IP address, browser type, and pages visited, through standard web analytics.
              </p>
            </section>

            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.15rem] mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Process and confirm your booking</li>
                <li>Send booking confirmations and stay-related emails</li>
                <li>Respond to your inquiries via the contact form</li>
                <li>Improve our website and services</li>
                <li>Comply with legal obligations</li>
              </ul>
              <p className="mt-3">We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>
            </section>

            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.15rem] mb-3">4. Third-Party Services</h2>
              <p>We use the following services that may process your data:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>Stripe</strong> — for secure card payment processing. Stripe&rsquo;s privacy policy applies to card transactions.</li>
                <li><strong>Google Analytics</strong> — for anonymous website usage statistics.</li>
                <li><strong>Vercel</strong> — for website hosting.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.15rem] mb-3">5. Data Retention</h2>
              <p>
                We retain booking records and contact messages for as long as necessary to fulfill our business and legal obligations.
                If you would like your data removed, please contact us and we will process your request within a reasonable timeframe.
              </p>
            </section>

            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.15rem] mb-3">6. Data Security</h2>
              <p>
                We take reasonable measures to protect your personal information. Passwords are encrypted, card payments are handled by Stripe (PCI-compliant), and access to booking data is restricted to authorized administrators.
              </p>
            </section>

            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.15rem] mb-3">7. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Request a copy of the personal data we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your data, subject to legal retention requirements</li>
              </ul>
              <p className="mt-3">
                To exercise any of these rights, email us at{" "}
                <a href="mailto:customerservice@haveninlipa.com" className="text-forest underline">customerservice@haveninlipa.com</a>.
              </p>
            </section>

            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.15rem] mb-3">8. Changes to This Policy</h2>
              <p>
                We may update this privacy policy from time to time. Any changes will be posted on this page with an updated &ldquo;Last updated&rdquo; date.
              </p>
            </section>

            <section>
              <h2 className="font-serif font-semibold text-charcoal text-[1.15rem] mb-3">9. Contact Us</h2>
              <p>
                If you have any questions about this privacy policy, please reach out:
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

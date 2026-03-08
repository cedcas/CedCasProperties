import type { Metadata } from "next";
import { Playfair_Display, Open_Sans } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-opensans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CedCas Properties — Short-Term Rentals in Lipa City, Batangas",
  description:
    "Clean, comfortable, and thoughtfully managed short-term rentals in Lipa City, Batangas, Philippines. Book your stay with CedCas Properties today.",
  keywords: "short-term rental, Lipa City, Batangas, vacation rental, CedCas Properties",
  openGraph: {
    title: "CedCas Properties",
    description: "Where Comfort Feels Like Home. Short-term rentals in Lipa, Batangas.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfair.variable} ${openSans.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}

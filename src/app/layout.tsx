import type { Metadata } from "next";
import { Montserrat, Poppins, Open_Sans } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-poppins",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-opensans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HavenInLipa — Short-Term Rentals in Lipa City, Batangas",
  description:
    "Stay in Style, Live in Comfort. Clean, comfortable, and thoughtfully managed short-term rentals in Lipa City, Batangas, Philippines.",
  keywords: "short-term rental, Lipa City, Batangas, vacation rental, HavenInLipa",
  openGraph: {
    title: "HavenInLipa",
    description: "Stay in Style, Live in Comfort. Short-term rentals in Lipa, Batangas.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${montserrat.variable} ${poppins.variable} ${openSans.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

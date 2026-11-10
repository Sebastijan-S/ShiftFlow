import type { Metadata } from "next";
import { Geist, Geist_Mono, Roboto_Slab, Public_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const publicSansHeading = Public_Sans({subsets:['latin'],variable:'--font-heading'});

const robotoSlab = Roboto_Slab({subsets:['latin'],variable:'--font-serif'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShiftFlow | Planiranje smena",
  description: "Pripremite tim i dostupnost za pouzdan raspored smena.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="sr-Latn"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, robotoSlab.variable, publicSansHeading.variable)}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

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
  description: "Planirajte smene, menjajte dodele i delite objavljen raspored sa timom.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="sr-Latn"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, robotoSlab.variable, publicSansHeading.variable)}
    >
      <body className="min-h-full flex flex-col"><script dangerouslySetInnerHTML={{__html:"try{if(localStorage.getItem('shiftflow-theme')==='dark'){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark'}}catch{}"}} />{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const publicSansHeading = Public_Sans({subsets:['latin'],variable:'--font-heading'});

export const metadata: Metadata = {
  title: "ShiftFlow | Planiranje smena",
  description: "Planirajte smene, menjajte dodele i delite objavljen raspored sa timom.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="sr-Latn"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", "dark", publicSansHeading.variable)}
    >
      <head>
        <script dangerouslySetInnerHTML={{__html:"try{if(localStorage.getItem('shiftflow-theme')==='light'){document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light'}}catch{}"}} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

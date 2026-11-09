import type { Metadata } from "next";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/geist-mono";
import "./globals.css";
import "./shiftflow.css";

export const metadata: Metadata = { title: "ShiftFlow — Raspored smena", description: "Manje planiranja. Više vremena za dobru kafu. Rasporedite tim, uskladite smene i podelite nedeljni raspored." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="sr-Latn" suppressHydrationWarning><body>{children}</body></html>;
}

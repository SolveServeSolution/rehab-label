import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rehab Data Labelling Platform",
  description: "Physical therapy video labelling and scoring platform for rehabilitation data analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

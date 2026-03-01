import type { Metadata } from "next";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "Ray Optics Web",
  description: "Web-based GUI for RayOptics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}

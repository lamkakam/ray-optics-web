import type { Metadata } from "next";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import { ThemeProvider } from "@/components/ThemeProvider";

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
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <ThemeProvider>
          <ServiceWorkerRegistrar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}


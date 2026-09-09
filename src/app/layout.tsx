import type { Metadata } from "next";
import "./globals.css";
import ClientOnlyApplication from "@/app/ClientOnlyApplication";

/** Application metadata supplied by the root Next.js layout. */
export const metadata: Metadata = {
  title: "Ray Optics Web",
  description: "Web-based GUI for RayOptics",
};

/**
 * Root server layout for the App Router document and client-only application boundary.
 *
 * @remarks
 * ## Responsibilities
 * - Declares the app metadata
 * - Imports global CSS
 * - Renders only the root document during server rendering and static export
 * - Passes routed content to `ClientOnlyApplication`, whose dynamic no-SSR boundary mounts the complete interactive tree in the browser
 * - Keeps metadata and global CSS available to the server-generated document
 *
 * ## Rendered Structure
 * ```tsx
 * <html>
 * <body>
 * <ClientOnlyApplication>{children}</ClientOnlyApplication>
 * </body>
 * </html>
 * ```
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <ClientOnlyApplication>{children}</ClientOnlyApplication>
      </body>
    </html>
  );
}

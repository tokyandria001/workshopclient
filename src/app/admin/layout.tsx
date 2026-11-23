import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Back-office", template: "%s | Back-office Zénith" },
  // Le back-office ne doit pas apparaître dans les moteurs de recherche.
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/30">
      {children}
    </div>
  );
}

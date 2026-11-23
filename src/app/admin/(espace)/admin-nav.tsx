"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/reservations", label: "Réservations" },
  { href: "/admin/planning", label: "Planning" },
  { href: "/admin/ressources", label: "Ressources" },
] as const;

/** Navigation avec mise en évidence de la page courante. */
export function CurrentAdminNav() {
  return <AdminNav pathname={usePathname()} />;
}

export function AdminNav({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Back-office" className="mx-auto max-w-6xl px-4">
      {/* Défilement horizontal interne sur mobile, jamais de la page entière. */}
      <ul className="-mb-px flex gap-4 overflow-x-auto text-sm">
        {LINKS.map(({ href, label }) => {
          const current =
            pathname !== null &&
            (href === "/admin" ? pathname === href : pathname.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-block border-b-2 py-2 whitespace-nowrap",
                  current
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

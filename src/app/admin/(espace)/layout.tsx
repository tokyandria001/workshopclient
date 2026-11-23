import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { logout } from "@/server/auth/actions";
import { requireAdmin } from "@/server/auth/session";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/admin" className="font-heading font-semibold">
            Back-office
          </Link>
          <div className="flex items-center gap-3">
            <Suspense>
              <CurrentAdmin />
            </Suspense>
            <form action={logout}>
              <Button type="submit" variant="outline" size="sm">
                Se déconnecter
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </>
  );
}

async function CurrentAdmin() {
  const admin = await requireAdmin();
  return (
    <span className="hidden text-sm text-muted-foreground sm:inline">
      {admin.email}
    </span>
  );
}

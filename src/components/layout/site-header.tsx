import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-heading text-base font-semibold">
          Zénith de Bel Air
        </Link>
      </div>
    </header>
  );
}

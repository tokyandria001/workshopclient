import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/" className="font-heading text-base font-semibold">
          Zénith de Bel Air
        </Link>
        <nav aria-label="Navigation principale">
          <ul className="flex items-center gap-4 text-sm">
            <li>
              <Link href="/catalogue" className="hover:underline">
                Catalogue
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

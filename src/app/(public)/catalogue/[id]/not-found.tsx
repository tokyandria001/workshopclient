import Link from "next/link";

export default function CatalogResourceNotFound() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-heading text-2xl font-bold">Ressource introuvable</h1>
      <p className="text-muted-foreground">
        Cette ressource n&apos;existe pas ou n&apos;est plus proposée à la
        location.
      </p>
      <Link href="/catalogue" className="w-fit underline">
        Voir le catalogue
      </Link>
    </div>
  );
}

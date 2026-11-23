import Link from "next/link";

export default function ResourceNotFound() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-heading text-2xl font-bold">Ressource introuvable</h1>
      <p className="text-muted-foreground">
        Cette ressource n&apos;existe pas ou a été supprimée.
      </p>
      <Link href="/admin/ressources" className="underline">
        Retour à la liste des ressources
      </Link>
    </div>
  );
}

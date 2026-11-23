import Link from "next/link";

export default function TrackingNotFound() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-heading text-2xl font-bold">
        Réservation introuvable
      </h1>
      <p className="text-muted-foreground">
        Ce lien de suivi n&apos;est pas valide. Vérifiez l&apos;adresse reçue
        par e-mail, ou contactez-nous.
      </p>
      <Link href="/" className="w-fit underline">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}

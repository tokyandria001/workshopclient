import Link from "next/link";

export default function ReservationNotFound() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-heading text-2xl font-bold">
        Réservation introuvable
      </h1>
      <p className="text-muted-foreground">
        Cette réservation n&apos;existe pas ou a été supprimée.
      </p>
      <Link href="/admin/reservations" className="w-fit underline">
        Retour à la liste des réservations
      </Link>
    </div>
  );
}

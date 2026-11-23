import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:py-16">
      <section className="flex flex-col gap-4">
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Zénith de Bel Air
        </h1>
        <p className="max-w-prose text-base text-muted-foreground sm:text-lg">
          Louez notre salle de spectacle et du matériel événementiel en ligne.
        </p>
        <div>
          <Button size="lg" asChild>
            <Link href="/catalogue">Voir le catalogue</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="relative">
          <CardHeader>
            <CardTitle>
              <Link
                href="/catalogue?type=salle"
                className="after:absolute after:inset-0 hover:underline"
              >
                La salle
              </Link>
            </CardTitle>
            <CardDescription>
              Un espace de 550 m² pour vos spectacles et événements.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="relative">
          <CardHeader>
            <CardTitle>
              <Link
                href="/catalogue?type=materiel"
                className="after:absolute after:inset-0 hover:underline"
              >
                Le matériel
              </Link>
            </CardTitle>
            <CardDescription>
              Du matériel disponible à la location pour vos projets.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </div>
  );
}

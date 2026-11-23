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
          <Button size="lg" disabled>
            Réserver (bientôt disponible)
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>La salle</CardTitle>
            <CardDescription>
              Un espace de 550 m² pour vos spectacles et événements.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Le matériel</CardTitle>
            <CardDescription>
              Du matériel disponible à la location pour vos projets.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </div>
  );
}

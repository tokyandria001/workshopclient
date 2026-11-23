import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPage } from "@/server/pages/queries";

export const metadata: Metadata = {
  title: "Conditions générales de location",
};

// Version simple : le texte est affiché tel quel. La mise en forme et la
// modification depuis le back-office arrivent à l'étape 11.
export default async function TermsPage() {
  const page = await getPage("conditions-generales");
  if (!page) notFound();

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
      <h1 className="font-heading text-3xl font-bold tracking-tight">
        {page.title}
      </h1>
      <div className="whitespace-pre-line">{page.content}</div>
    </article>
  );
}

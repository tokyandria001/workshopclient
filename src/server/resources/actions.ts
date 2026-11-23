"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { MAX_IMAGES_PER_RESOURCE } from "@/lib/resource-images";
import { deleteResourceImages, uploadResourceImage } from "@/lib/storage";
import { requireAdmin } from "@/server/auth/session";

import {
  parseResourceForm,
  readResourceForm,
  validateImageFile,
  type ResourceFormValues,
} from "./schema";
import {
  addResourceImage,
  countResourceImages,
  createResource,
  deleteResource,
  removeResourceImage,
  setResourceActive,
  updateResource,
} from "./service";

const LIST_PATH = "/admin/ressources";
const detailPath = (id: string) => `${LIST_PATH}/${id}`;

export type ResourceFormState = {
  values?: ResourceFormValues;
  fieldErrors?: Partial<Record<string, string[]>>;
  error?: string;
  success?: string;
};

/** Création (`resourceId` nul) ou modification d'une ressource. */
export async function saveResource(
  resourceId: string | null,
  _previous: ResourceFormState,
  formData: FormData,
): Promise<ResourceFormState> {
  await requireAdmin();

  const values = readResourceForm(formData);
  const parsed = parseResourceForm(values);
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return {
      values,
      // Les erreurs des montants (priceCents, depositCents) s'affichent sous
      // les champs du formulaire (price, deposit).
      fieldErrors: {
        ...fieldErrors,
        price: fieldErrors.priceCents,
        deposit: fieldErrors.depositCents,
      },
    };
  }

  if (!resourceId) {
    const resource = await createResource(parsed.data);
    revalidatePath(LIST_PATH);
    redirect(`${detailPath(resource.id)}?creee=1`);
  }

  const updated = await updateResource(resourceId, parsed.data);
  if (!updated) return { values, error: "Cette ressource n'existe plus." };

  revalidatePath(LIST_PATH);
  revalidatePath(detailPath(resourceId));
  return { values, success: "Modifications enregistrées." };
}

export async function toggleResourceActive(
  resourceId: string,
  active: boolean,
): Promise<void> {
  await requireAdmin();
  await setResourceActive(resourceId, active);
  revalidatePath(LIST_PATH);
  revalidatePath(detailPath(resourceId));
}

export type SimpleState = { error?: string; success?: string };

export async function deleteResourceAction(
  resourceId: string,
  _previous: SimpleState,
): Promise<SimpleState> {
  await requireAdmin();

  const result = await deleteResource(resourceId);
  if (!result.ok) {
    return {
      error:
        result.reason === "reservations"
          ? "Cette ressource figure dans des réservations : elle ne peut pas être supprimée. Désactivez-la pour la retirer du catalogue."
          : "Cette ressource n'existe plus.",
    };
  }

  // La ressource est supprimée : un échec de nettoyage des photos ne doit pas
  // bloquer l'administrateur (fichiers orphelins sans conséquence).
  await deleteResourceImages(result.images).catch((error: unknown) =>
    console.error(error),
  );
  revalidatePath(LIST_PATH);
  redirect(`${LIST_PATH}?supprimee=1`);
}

export async function uploadResourceImageAction(
  resourceId: string,
  _previous: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  await requireAdmin();

  const checked = validateImageFile(formData.get("image"));
  if (!checked.ok) return { error: checked.error };

  const count = await countResourceImages(resourceId);
  if (count === null) return { error: "Cette ressource n'existe plus." };
  if (count >= MAX_IMAGES_PER_RESOURCE) {
    return {
      error: `Une ressource peut avoir au maximum ${MAX_IMAGES_PER_RESOURCE} photos.`,
    };
  }

  let path: string;
  try {
    path = await uploadResourceImage(resourceId, checked.file);
  } catch (error) {
    console.error(error);
    return { error: "L'envoi de la photo a échoué. Veuillez réessayer." };
  }

  const added = await addResourceImage(resourceId, path);
  if (!added) {
    await deleteResourceImages([path]).catch(() => undefined);
    return {
      error: `Une ressource peut avoir au maximum ${MAX_IMAGES_PER_RESOURCE} photos.`,
    };
  }

  revalidatePath(detailPath(resourceId));
  return { success: "Photo ajoutée." };
}

export async function removeResourceImageAction(
  resourceId: string,
  path: string,
): Promise<void> {
  await requireAdmin();
  // On ne supprime du stockage qu'une photo qui appartenait bien à cette
  // ressource : impossible d'effacer un fichier arbitraire du bucket.
  if (await removeResourceImage(resourceId, path)) {
    await deleteResourceImages([path]).catch((error: unknown) =>
      console.error(error),
    );
  }
  revalidatePath(detailPath(resourceId));
}

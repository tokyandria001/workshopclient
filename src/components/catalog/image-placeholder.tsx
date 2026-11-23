import { ImageIcon } from "lucide-react";

/** Affiché à la place de la photo quand une ressource n'en a pas encore. */
export function ImagePlaceholder() {
  return (
    <div className="flex size-full items-center justify-center text-muted-foreground">
      <ImageIcon className="size-10" aria-hidden="true" />
      <span className="sr-only">Pas de photo</span>
    </div>
  );
}

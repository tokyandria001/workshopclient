import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/(public)/page";

describe("Page d'accueil", () => {
  it("affiche le titre principal", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Zénith de Bel Air" }),
    ).toBeDefined();
  });

  it("présente la salle et le matériel", () => {
    render(<HomePage />);
    expect(screen.getByText("La salle")).toBeDefined();
    expect(screen.getByText("Le matériel")).toBeDefined();
  });
});

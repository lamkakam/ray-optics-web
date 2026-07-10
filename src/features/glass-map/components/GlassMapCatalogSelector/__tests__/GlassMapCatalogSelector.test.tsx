import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GlassMapCatalogSelector } from "@/features/glass-map/components/GlassMapCatalogSelector";
import type { CompleteGlassCatalogsData, GlassData } from "@/features/glass-map/types/glassMap";

const glass: GlassData = {
  refractiveIndexD: 1.5168,
  refractiveIndexE: 1.519,
  abbeNumberD: 64.17,
  abbeNumberE: 63.96,
  partialDispersions: { P_gF: 0.5349, P_Fd: 0.41, P_fe: 0.4 },
  dispersionCoeffKind: "Sellmeier3T",
  dispersionCoeffs: [1, 2, 3, 4, 5, 6],
};

const catalogsData: CompleteGlassCatalogsData = {
  CDGM: {},
  Hikari: {},
  Hoya: { BSC7: glass },
  Ohara: {},
  Schott: { "N-BK7": glass, "N-SF6": glass },
  Sumita: {},
  Special: { air: glass, REFL: glass, Water: glass },
  Custom: { "My Glass": glass },
};

describe("GlassMapCatalogSelector", () => {
  it("lists every supported catalog, including catalogs with no glasses", () => {
    render(<GlassMapCatalogSelector catalogsData={catalogsData} onSelect={jest.fn()} />);

    expect(within(screen.getByRole("combobox", { name: "Catalog" })).getAllByRole("option").map((option) => option.textContent))
      .toEqual(["CDGM", "Hikari", "Hoya", "Ohara", "Schott", "Sumita", "Special", "Custom"]);
  });

  it("defaults to the first catalog with an eligible glass and leaves Glass blank", () => {
    render(<GlassMapCatalogSelector catalogsData={catalogsData} onSelect={jest.fn()} />);

    expect(screen.getByRole("combobox", { name: "Catalog" })).toHaveValue("Hoya");
    expect(screen.getByRole("combobox", { name: "Glass" })).toHaveValue("");
    expect(screen.getByRole("button", { name: "Select glass" })).toBeDisabled();
  });

  it("resets Glass and updates datalist options when Catalog changes", async () => {
    render(<GlassMapCatalogSelector catalogsData={catalogsData} onSelect={jest.fn()} />);
    const glassInput = screen.getByRole("combobox", { name: "Glass" });
    await userEvent.type(glassInput, "BSC7");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Catalog" }), "Schott");

    expect(glassInput).toHaveValue("");
    const datalist = document.getElementById(glassInput.getAttribute("list")!);
    expect(Array.from(datalist!.querySelectorAll("option")).map((option) => option.value))
      .toEqual(["N-BK7", "N-SF6"]);
  });

  it("canonicalizes a complete case-insensitive match and selects it", async () => {
    const onSelect = jest.fn();
    render(<GlassMapCatalogSelector catalogsData={catalogsData} onSelect={onSelect} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Catalog" }), "Schott");
    await userEvent.type(screen.getByRole("combobox", { name: "Glass" }), "n-bk7");

    expect(screen.getByRole("combobox", { name: "Glass" })).toHaveValue("N-BK7");
    await userEvent.click(screen.getByRole("button", { name: "Select glass" }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ catalogName: "Schott", glassName: "N-BK7", data: glass }));
  });

  it.each(["", "N-", "missing"])("keeps Select disabled for invalid input %p", async (value) => {
    render(<GlassMapCatalogSelector catalogsData={catalogsData} onSelect={jest.fn()} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Catalog" }), "Schott");
    if (value !== "") await userEvent.type(screen.getByRole("combobox", { name: "Glass" }), value);
    expect(screen.getByRole("button", { name: "Select glass" })).toBeDisabled();
  });

  it("excludes air and REFL from Special case-insensitively", async () => {
    render(<GlassMapCatalogSelector catalogsData={catalogsData} onSelect={jest.fn()} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Catalog" }), "Special");
    const input = screen.getByRole("combobox", { name: "Glass" });
    const datalist = document.getElementById(input.getAttribute("list")!);
    expect(Array.from(datalist!.querySelectorAll("option")).map((option) => option.value)).toEqual(["Water"]);
  });

  it("selects an eligible Custom glass", async () => {
    const onSelect = jest.fn();
    render(<GlassMapCatalogSelector catalogsData={catalogsData} onSelect={onSelect} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Catalog" }), "Custom");
    await userEvent.type(screen.getByRole("combobox", { name: "Glass" }), "my glass");
    await userEvent.click(screen.getByRole("button", { name: "Select glass" }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ catalogName: "Custom", glassName: "My Glass" }));
  });
});

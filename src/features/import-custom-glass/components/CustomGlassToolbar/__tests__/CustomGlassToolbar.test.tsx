import { createRef } from "react";
import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomGlassToolbar } from "@/features/import-custom-glass/components/CustomGlassToolbar/CustomGlassToolbar";

function renderToolbar(
  selectedCount = 0,
  overrides: Partial<ComponentProps<typeof CustomGlassToolbar>> = {},
) {
  const props: ComponentProps<typeof CustomGlassToolbar> = {
    jsonFileInputRef: createRef<HTMLInputElement>(),
    csvFileInputRef: createRef<HTMLInputElement>(),
    selectedCount,
    onJsonFileSelected: jest.fn(),
    onCsvFilesSelected: jest.fn(),
    onAdd: jest.fn(),
    onEdit: jest.fn(),
    onDownloadJson: jest.fn(),
    onDelete: jest.fn(),
    ...overrides,
  };
  return { ...render(<CustomGlassToolbar {...props} />), props };
}

describe("CustomGlassToolbar", () => {
  it("dispatches every visible command callback", async () => {
    const user = userEvent.setup();
    const callbacks = {
      onAdd: jest.fn(),
      onEdit: jest.fn(),
      onDownloadJson: jest.fn(),
      onDelete: jest.fn(),
    };
    renderToolbar(1, callbacks);

    await user.click(screen.getByRole("button", { name: "Add Glass" }));
    await user.click(screen.getByRole("button", { name: "Edit Glass" }));
    await user.click(screen.getByRole("button", { name: "Download JSON" }));
    await user.click(screen.getByRole("button", { name: "Delete Glass" }));

    expect(callbacks.onAdd).toHaveBeenCalledTimes(1);
    expect(callbacks.onEdit).toHaveBeenCalledTimes(1);
    expect(callbacks.onDownloadJson).toHaveBeenCalledTimes(1);
    expect(callbacks.onDelete).toHaveBeenCalledTimes(1);
  });

  it.each([0, 2])(
    "disables Edit unless exactly one row is selected (%s)",
    async (selectedCount) => {
      const user = userEvent.setup();
      const onEdit = jest.fn();
      renderToolbar(selectedCount, { onEdit });

      const editButton = screen.getByRole("button", { name: "Edit Glass" });
      expect(editButton).toBeDisabled();
      await user.click(editButton);
      expect(onEdit).not.toHaveBeenCalled();
    },
  );

  it("disables Delete for an empty selection and enables it for a non-empty selection", () => {
    const { unmount } = renderToolbar(0);
    expect(screen.getByRole("button", { name: "Delete Glass" })).toBeDisabled();
    unmount();

    renderToolbar(2);
    expect(screen.getByRole("button", { name: "Delete Glass" })).toBeEnabled();
  });

  it("routes visible import commands to their hidden input elements", async () => {
    const user = userEvent.setup();
    const inputClick = jest
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => undefined);

    try {
      renderToolbar();

      await user.click(
        screen.getByRole("button", { name: "Import from JSON" }),
      );
      await user.click(
        screen.getByRole("button", { name: "Import from CSV Files" }),
      );

      expect(inputClick).toHaveBeenCalledTimes(2);
    } finally {
      inputClick.mockRestore();
    }
  });

  it("does nothing when visible import commands have no input ref", async () => {
    const nullRef = { current: null };
    renderToolbar(0, {
      jsonFileInputRef: nullRef,
      csvFileInputRef: nullRef,
    });

    expect(() =>
      fireEvent.click(screen.getByRole("button", { name: "Import from JSON" })),
    ).not.toThrow();
    expect(() =>
      fireEvent.click(
        screen.getByRole("button", { name: "Import from CSV Files" }),
      ),
    ).not.toThrow();
  });

  it("ignores a JSON change event with no selected file", () => {
    const onJsonFileSelected = jest.fn();
    renderToolbar(0, { onJsonFileSelected });

    expect(() =>
      fireEvent.change(screen.getByLabelText("Import custom glass JSON file"), {
        target: { files: undefined },
      }),
    ).not.toThrow();
    expect(onJsonFileSelected).not.toHaveBeenCalled();
  });

  it("dispatches a JSON file, resets the input, and accepts the same file again", async () => {
    const user = userEvent.setup();
    const onJsonFileSelected = jest.fn();
    renderToolbar(0, { onJsonFileSelected });
    const input = screen.getByLabelText("Import custom glass JSON file");
    const file = new File(["{}"], "custom-glass.json", {
      type: "application/json",
    });

    await user.upload(input, file);
    await user.upload(input, file);

    expect(onJsonFileSelected).toHaveBeenNthCalledWith(1, file);
    expect(onJsonFileSelected).toHaveBeenNthCalledWith(2, file);
    expect(input).toHaveValue("");
  });

  it("dispatches every selected CSV file and resets after multi-file selection", async () => {
    const user = userEvent.setup();
    const onCsvFilesSelected = jest.fn();
    renderToolbar(0, { onCsvFilesSelected });
    const input = screen.getByLabelText("Import custom glass CSV files");
    const files = [
      new File(["wl,n"], "FIRST.csv", { type: "text/csv" }),
      new File(["wl,n"], "SECOND.csv", { type: "text/csv" }),
    ];

    await user.upload(input, files);

    expect(onCsvFilesSelected).toHaveBeenCalledWith(files);
    expect(input).toHaveValue("");
  });

  it("reports an empty CSV selection without throwing", () => {
    const onCsvFilesSelected = jest.fn();
    renderToolbar(0, { onCsvFilesSelected });
    const input = screen.getByLabelText("Import custom glass CSV files");

    fireEvent.change(input, { target: { files: [] } });

    expect(onCsvFilesSelected).toHaveBeenCalledWith([]);
  });
});

/** Verifies runtime/catalog progress, blocking errors, and overlay dismissal. */
import { render, screen } from "@testing-library/react";
import { AppInitializationOverlay } from "@/app/AppInitializationOverlay";

const runtimeProgress = { value: 40, status: "Installing rayoptics" };

describe("AppInitializationOverlay", () => {
  it("follows runtime progress, then catalog progress, then disappears", () => {
    const { rerender } = render(
      <AppInitializationOverlay
        isReady={false}
        hasProxy
        initProgress={runtimeProgress}
        glassCatalogsLoading={false}
        glassCatalogPreloadError={undefined}
      />,
    );
    expect(screen.getByText("Initializing Ray Optics")).toBeInTheDocument();
    expect(screen.getByText(runtimeProgress.status)).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Initialization progress" }),
    ).toHaveAttribute("aria-valuenow", "40");

    rerender(
      <AppInitializationOverlay
        isReady
        hasProxy
        initProgress={runtimeProgress}
        glassCatalogsLoading
        glassCatalogPreloadError={undefined}
      />,
    );
    expect(screen.getByText("Preloading glass catalogs")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "90",
    );

    rerender(
      <AppInitializationOverlay
        isReady
        hasProxy
        initProgress={runtimeProgress}
        glassCatalogsLoading={false}
        glassCatalogPreloadError={undefined}
      />,
    );
    expect(
      screen.queryByText("Initializing Ray Optics"),
    ).not.toBeInTheDocument();
  });

  it("replaces progress with a catalog error and resumes progress on retry", () => {
    const props = {
      isReady: true,
      hasProxy: true,
      initProgress: runtimeProgress,
      glassCatalogsLoading: false,
      glassCatalogPreloadError: "Catalog preload failed",
    };
    const { rerender } = render(<AppInitializationOverlay {...props} />);
    expect(screen.getByText("Initializing Ray Optics")).toBeInTheDocument();
    expect(
      screen.getByText(props.glassCatalogPreloadError),
    ).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    rerender(
      <AppInitializationOverlay
        {...props}
        glassCatalogsLoading
        glassCatalogPreloadError={undefined}
      />,
    );
    expect(
      screen.queryByText(props.glassCatalogPreloadError),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "90",
    );
  });

  it.each([false, true])(
    "prioritizes runtime initialization before readiness (proxy: %s)",
    (hasProxy) => {
      render(
        <AppInitializationOverlay
          isReady={false}
          hasProxy={hasProxy}
          initProgress={runtimeProgress}
          glassCatalogsLoading
          glassCatalogPreloadError="Catalog error"
        />,
      );
      expect(screen.getByText(runtimeProgress.status)).toBeInTheDocument();
      expect(screen.queryByText("Catalog error")).not.toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "40",
      );
    },
  );

  it("does not block a ready runtime without a worker proxy", () => {
    render(
      <AppInitializationOverlay
        isReady
        hasProxy={false}
        initProgress={runtimeProgress}
        glassCatalogsLoading
        glassCatalogPreloadError="Catalog error"
      />,
    );
    expect(
      screen.queryByText("Initializing Ray Optics"),
    ).not.toBeInTheDocument();
  });
});

it("displays a sanitized initialization failure instead of indefinite progress", () => {
  const message =
    "The calculation engine could not start. Please reload the page and try again.";
  render(
    <AppInitializationOverlay
      isReady={false}
      hasProxy={false}
      initProgress={runtimeProgress}
      initializationError={message}
      glassCatalogsLoading={false}
      glassCatalogPreloadError={undefined}
    />,
  );
  expect(screen.getByText(message)).toBeInTheDocument();
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
});

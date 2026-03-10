/**
 * Shared Tailwind class tokens — nested per-component design token system.
 *
 * Each component entry has `color` / `size` / `style` sub-objects.
 * Import `componentTokens` (aliased as `cx`) from this module instead of
 * duplicating class strings in every component.
 */

const globalTokens = {
  color: {
    reverseText: "text-white",
    defaultBorder: "border-gray-200 dark:border-gray-700",
    inputBorder: "border-gray-300 dark:border-gray-600",
    surfaceBg: "bg-gray-50 dark:bg-gray-800",
    primaryText: "text-gray-900 dark:text-gray-100",
    secondaryText: "text-gray-700 dark:text-gray-300",
    mutedText: "text-gray-500 dark:text-gray-400",
  },
  size: {},
  style: {
    inputBase: "w-full rounded-lg border outline-none transition focus:ring-2 focus:ring-blue-500",
  },
} as const;

const g = globalTokens;

export const componentTokens = {
  button: {
    color: {
      primaryBgColor: "bg-blue-600",
      primaryHoverBgColor: "hover:bg-blue-700",
      primaryTextColor: g.color.reverseText,
      dangerBgColor: "bg-red-600",
      dangerHoverBgColor: "hover:bg-red-700",
      dangerTextColor: g.color.reverseText,
      secondaryBorderColor: g.color.inputBorder,
      secondaryBgColor: "bg-transparent",
      secondaryTextColor: g.color.secondaryText,
      secondaryHoverBgColor: "hover:bg-gray-100 dark:hover:bg-gray-800",
      toggleBorderColor: g.color.inputBorder,
      toggleBgColor: "dark:bg-gray-800",
      toggleTextColor: g.color.secondaryText,
      toggleHoverBgColor: "hover:bg-blue-50 dark:hover:bg-gray-700",
      floatingBorderColor: g.color.inputBorder,
      floatingBgColor: "bg-white/80 dark:bg-gray-800/80",
      floatingTextColor: "text-gray-600 dark:text-gray-300",
      floatingHoverBgColor: "hover:bg-gray-100 dark:hover:bg-gray-700",
      iconBgColor: "bg-gray-100 dark:bg-gray-700",
      iconHoverBgColor: "hover:bg-gray-200 dark:hover:bg-gray-600",
      iconTextColor: g.color.secondaryText,
    },
    size: {
      horizontalPaddingMd: "px-4",
      verticalPaddingMd: "py-2",
      horizontalPaddingSm: "px-3",
      verticalPaddingSm: "py-1.5",
      horizontalPaddingXs: "px-2",
      verticalPaddingXs: "py-1",
      fontSizeMd: "text-base",
      fontSizeSm: "text-sm",
      fontSizeXs: "text-xs",
    },
    style: {
      borderRadius: "rounded-lg",
      fontWeight: "font-medium",
      iconBorderRadius: "rounded",
      iconFontWeight: "font-bold",
      iconHorizontalMargin: "w-6",
      iconVerticalMargin: "h-6",
      opacity: "disabled:opacity-50",
      cursor: "cursor-pointer disabled:cursor-not-allowed",
      floatingHorizontalMargin: "right-2",
      floatingVerticalMargin: "top-2",
    },
  },

  input: {
    color: {
      borderColor: g.color.inputBorder,
      bgColor: g.color.surfaceBg,
      textColor: g.color.primaryText,
    },
    size: {
      horizontalPadding: "px-3",
      verticalPadding: "py-2",
      fontSize: "text-sm",
    },
    style: {
      base: g.style.inputBase,
    },
  },

  select: {
    color: {
      borderColor: g.color.inputBorder,
      bgColor: g.color.surfaceBg,
      textColor: g.color.primaryText,
    },
    size: {
      horizontalPadding: "px-3",
      verticalPadding: "py-2",
      fontSize: "text-sm",
      compactHorizontalPadding: "px-2",
      compactVerticalPadding: "py-1.5",
      compactFontSize: "text-sm",
    },
    style: {
      base: g.style.inputBase,
      compactBorderStyle: "border",
      compactBorderRadius: "rounded-lg",
      compactOutlineStyle: "outline-none",
    },
  },

  modal: {
    color: {
      backdropBgColor: "bg-black/50",
      panelBorderColor: g.color.defaultBorder,
      panelBgColor: "bg-white dark:bg-gray-900",
      titleBorderColor: g.color.defaultBorder,
      titleTextColor: g.color.primaryText,
    },
    size: {
      panelPadding: "p-6",
    },
    style: {
      backdrop: "absolute inset-0 backdrop-blur-sm",
      panel: "relative z-10 w-full rounded-2xl border shadow-2xl animate-modal-enter",
      title: "mb-4 border-b pb-3 text-lg font-semibold",
    },
  },

  label: {
    color: {
      textColor: g.color.secondaryText,
      captionTextColor: "text-gray-500",
    },
    size: {
      default: "text-sm",
      caption: "text-xs",
    },
    style: {
      base: "mb-1 block font-medium",
      caption: "mb-1",
    },
  },

  chip: {
    color: {
      borderColor: g.color.defaultBorder,
      bgColor: g.color.surfaceBg,
      textColor: "text-gray-600 dark:text-gray-400",
    },
    size: {
      padding: "px-2 py-0.5",
      fontSize: "text-xs",
    },
    style: {
      base: "rounded-full border",
    },
  },

  divider: {
    color: {
      borderColor: g.color.defaultBorder,
    },
    style: {
      base: "border-t",
    },
  },

  tooltip: {
    color: {
      bgColor: "bg-gray-900",
      textColor: "text-white",
    },
    size: {
      padding: "px-2 py-1",
      fontSize: "text-xs",
    },
    style: {
      base: "pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded opacity-0 transition-opacity group-hover:opacity-100 z-10",
    },
  },

  tab: {
    color: {
      activeBgColor: "bg-gray-100 dark:bg-gray-800",
      activeTextColor: "text-gray-900 dark:text-gray-100",
      inactiveTextColor: "text-gray-500 dark:text-gray-400",
      inactiveHoverTextColor: "hover:text-gray-700 dark:hover:text-gray-200",
    },
    size: {},
    style: {},
  },

  text: {
    color: {
      loadingTextColor: g.color.mutedText,
      placeholderTextColor: "text-gray-400 dark:text-gray-500",
      bodyTextColor: g.color.secondaryText,
      headingTextColor: g.color.primaryText,
      emptyTextColor: "text-gray-400 dark:text-gray-500",
    },
  },

  panel: {
    color: {
      loadingOverlayBgColor: "bg-white/60 dark:bg-gray-900/60",
    },
    style: {
      imageContainer: "relative flex h-full w-full flex-col items-center justify-center",
      loadingOverlay: "absolute inset-0 flex items-center justify-center",
      emptyState: "flex items-center justify-center text-sm",
    },
  },

  overlay: {
    color: {
      initBgColor: "bg-gray-900/60",
      cardBgColor: "bg-white/10 dark:bg-black/20",
      cardTextColor: "text-white",
    },
    style: {
      init: "fixed inset-0 z-[200] flex flex-col items-center justify-center backdrop-blur-sm",
      card: "flex flex-col items-center gap-4 rounded-xl px-10 py-8 shadow-xl",
    },
  },
} as const;


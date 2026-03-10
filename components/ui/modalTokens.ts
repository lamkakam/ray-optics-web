/**
 * Shared Tailwind class tokens — nested per-component design token system.
 *
 * Each component entry has `color` / `size` / `style` sub-objects.
 * Import `componentTokens` (aliased as `cx`) from this module instead of
 * duplicating class strings in every component.
 */

const globalTokens = {
  color: {
    primaryBg:     "bg-blue-600 hover:bg-blue-700",
    dangerBg:      "bg-red-600 hover:bg-red-700",
    inverseText:   "text-white",
    defaultBorder: "border-gray-200 dark:border-gray-700",
    inputBorder:   "border-gray-300 dark:border-gray-600",
    surfaceBg:     "bg-gray-50 dark:bg-gray-800",
    primaryText:   "text-gray-900 dark:text-gray-100",
    secondaryText: "text-gray-700 dark:text-gray-300",
    mutedText:     "text-gray-500 dark:text-gray-400",
  },
  size: {
    inputPadding: "px-3 py-2",
    btnMd:        "px-4 py-2",
    btnSm:        "px-3 py-1.5 text-sm",
    btnXs:        "px-2 py-1 text-xs",
  },
  style: {
    inputBase: "w-full rounded-lg border outline-none transition focus:ring-2 focus:ring-blue-500",
    btnBase:   "rounded-lg font-medium transition cursor-pointer",
  },
} as const;

const g = globalTokens;

export const componentTokens = {
  button: {
    color: {
      primary:    `${g.color.primaryBg} ${g.color.inverseText}`,
      secondary:  `${g.color.inputBorder} ${g.color.secondaryText} hover:bg-gray-100 dark:hover:bg-gray-800`,
      toggle:     `${g.color.inputBorder} ${g.color.secondaryText} hover:bg-blue-50 dark:bg-gray-800 dark:hover:bg-gray-700`,
      danger:     `${g.color.dangerBg} ${g.color.inverseText}`,
      floating:   `${g.color.inputBorder} bg-white/80 text-gray-600 hover:bg-gray-100 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-700`,
    },
    size: {
      md:   g.size.btnMd,
      sm:   g.size.btnSm,
      xs:   g.size.btnXs,
      icon: "w-6 h-6 text-sm",
    },
    style: {
      base:     g.style.btnBase,
      iconBase: "inline-flex items-center justify-center rounded font-bold transition cursor-pointer",
      floating: "absolute right-2 top-2 rounded-lg border disabled:opacity-50",
      disabled: "disabled:opacity-50 disabled:cursor-not-allowed",
    },
  },

  input: {
    color: {
      default: `${g.color.inputBorder} ${g.color.surfaceBg} ${g.color.primaryText}`,
    },
    size: {
      default: `${g.size.inputPadding} text-sm`,
    },
    style: {
      base: g.style.inputBase,
    },
  },

  select: {
    color: {
      default: `${g.color.inputBorder} ${g.color.surfaceBg} ${g.color.primaryText}`,
      compact: `${g.color.inputBorder} ${g.color.surfaceBg} ${g.color.primaryText}`,
    },
    size: {
      default: `${g.size.inputPadding} text-sm`,
      compact: "px-2 py-1.5 text-sm",
    },
    style: {
      base:    g.style.inputBase,
      compact: "rounded-lg border outline-none",
    },
  },

  modal: {
    color: {
      backdrop: "bg-black/50",
      panel:    `${g.color.defaultBorder} bg-white dark:bg-gray-900`,
      title:    `${g.color.defaultBorder} ${g.color.primaryText}`,
    },
    size: {
      panel: "p-6",
    },
    style: {
      backdrop: "absolute inset-0 backdrop-blur-sm",
      panel:    "relative z-10 w-full rounded-2xl border shadow-2xl animate-modal-enter",
      title:    "mb-4 border-b pb-3 text-lg font-semibold",
    },
  },

  label: {
    color: {
      default: g.color.secondaryText,
      caption: "text-gray-500",
    },
    size: {
      default: "text-sm",
      caption: "text-xs",
    },
    style: {
      base:    "mb-1 block font-medium",
      caption: "mb-1",
    },
  },

  chip: {
    color: {
      default: `${g.color.defaultBorder} ${g.color.surfaceBg} text-gray-600 dark:text-gray-400`,
    },
    size: {
      default: "px-2 py-0.5 text-xs",
    },
    style: {
      base: "rounded-full border",
    },
  },

  divider: {
    color: {
      default: g.color.defaultBorder,
    },
    style: {
      base: "border-t",
    },
  },

  tooltip: {
    color: {
      default: "bg-gray-900 text-white",
    },
    size: {
      default: "px-2 py-1 text-xs",
    },
    style: {
      base: "pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded opacity-0 transition-opacity group-hover:opacity-100 z-10",
    },
  },

  tab: {
    color: {
      active:   "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100",
      inactive: "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
    },
    size:  {},
    style: {},
  },

  text: {
    color: {
      loading:     g.color.mutedText,
      placeholder: "text-gray-400 dark:text-gray-500",
      body:        g.color.secondaryText,
      heading:     g.color.primaryText,
      empty:       "text-gray-400 dark:text-gray-500",
    },
  },

  panel: {
    color: {
      loadingOverlay: "bg-white/60 dark:bg-gray-900/60",
    },
    style: {
      imageContainer: "relative flex h-full w-full flex-col items-center justify-center",
      loadingOverlay: "absolute inset-0 flex items-center justify-center",
      emptyState:     "flex items-center justify-center text-sm",
    },
  },

  overlay: {
    color: {
      init: "bg-gray-900/60",
      card: "bg-white/10 text-white dark:bg-black/20",
    },
    style: {
      init: "fixed inset-0 z-[200] flex flex-col items-center justify-center backdrop-blur-sm",
      card: "flex flex-col items-center gap-4 rounded-xl px-10 py-8 shadow-xl",
    },
  },
} as const;


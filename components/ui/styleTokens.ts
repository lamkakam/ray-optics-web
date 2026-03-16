/**
 * Shared Tailwind class tokens — nested per-component design token system.
 *
 * Each component entry has `color` / `size` / `style` sub-objects.
 * Import `componentTokens` (aliased as `cx`) from this module instead of
 * duplicating class strings in every component.
 */

const globalTokens = {
  color: {
    primaryColor: "bg-blue-600",
    errorColor: "bg-red-600",
    primaryText: "text-gray-900 dark:text-gray-100",
    secondaryText: "text-gray-700 dark:text-gray-300",
    mutedText: "text-gray-500 dark:text-gray-400",
    reverseText: "text-white dark:text-black",
    defaultBorder: "border-gray-200 dark:border-gray-700",
    inputBorder: "border-gray-300 dark:border-gray-600",
    surfaceBg: "bg-gray-100 dark:bg-gray-800",
    reverseSurfaceBg: "bg-gray-800 dark:bg-gray-100",
    focusRingColor: "focus:ring-blue-500",
    backdropBgColor: "bg-black/50",
    overlayPanelBgColor: "bg-white dark:bg-gray-900",
  },
  size: {
    focusRingWidth: "focus:ring-2",
  },
  style: {
    backdropBlur: "backdrop-blur-sm",
    overlayPanelBorderRadius: "rounded-2xl",
    overlayPanelShadow: "shadow-2xl",
    opacity: "disabled:opacity-50",
    cursor: "disabled:cursor-not-allowed",
  },
} as const;

const g = globalTokens;

export const componentTokens = {
  button: {
    color: {
      primaryBgColor: g.color.primaryColor,
      primaryHoverBgColor: "hover:bg-blue-700",
      primaryTextColor: "text-white",
      dangerBgColor: g.color.errorColor,
      dangerHoverBgColor: "hover:bg-red-700",
      dangerTextColor: "text-white",
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
      floatingHorizontalMargin: "right-2",
      floatingVerticalMargin: "top-2",
    },
    style: {
      borderRadius: "rounded-lg",
      fontWeight: "font-medium",
      opacity: "disabled:opacity-50",
      cursor: "cursor-pointer disabled:cursor-not-allowed",
    },
  },

  input: {
    color: {
      borderColor: g.color.inputBorder,
      bgColor: g.color.surfaceBg,
      textColor: g.color.primaryText,
      focusRingColor: g.color.focusRingColor,
    },
    size: {
      horizontalPadding: "px-3",
      verticalPadding: "py-2",
      fontSize: "text-sm",
      defaultWidth: "w-full",
      focusRingWidth: g.size.focusRingWidth,
    },
    style: {
      borderRadius: "rounded-lg",
      borderStyle: "border",
      outlineStyle: "outline-none",
      transitionStyle: "transition",
    },
  },

  select: {
    color: {
      borderColor: g.color.inputBorder,
      bgColor: g.color.surfaceBg,
      textColor: g.color.primaryText,
      focusRingColor: g.color.focusRingColor,
    },
    size: {
      horizontalPadding: "px-3",
      verticalPadding: "py-2",
      fontSize: "text-sm",
      compactHorizontalPadding: "px-2",
      compactVerticalPadding: "py-1.5",
      compactFontSize: "text-sm",
      compactWidth: "w-full",
      defaultWidth: "w-full",
      focusRingWidth: g.size.focusRingWidth,
    },
    style: {
      compactBorderStyle: "border",
      compactBorderRadius: "rounded-lg",
      compactOutlineStyle: "outline-none",
      borderRadius: "rounded-lg",
      borderStyle: "border",
      outlineStyle: "outline-none",
      transitionStyle: "transition",
      opacity: g.style.opacity,
      cursor: g.style.cursor,
    },
  },

  modal: {
    color: {
      backdropBgColor: g.color.backdropBgColor,
      panelBorderColor: g.color.defaultBorder,
      panelBgColor: g.color.overlayPanelBgColor,
      titleBorderColor: g.color.defaultBorder,
      titleTextColor: g.color.primaryText,
    },
    size: {
      panelPadding: "p-6",
      panelWidth: "w-full",
      titleFontSize: "text-lg",
      titlePadding: "pb-3",
      titleMargin: "mb-4",
    },
    style: {
      backdropBlur: g.style.backdropBlur,
      panelBorderRadius: g.style.overlayPanelBorderRadius,
      panelShadow: g.style.overlayPanelShadow,
    },
  },

  header: {
    color: {
      textColor: g.color.primaryText,
    },
    size: {
      h1FontSize: "text-xl",
      h2FontSize: "text-lg",
      h3FontSize: "text-base",
      h4FontSize: "text-sm",
      h5FontSize: "text-xs",
      h6FontSize: "text-xs",
    },
    style: {
      fontWeight: "font-semibold",
    },
  },

  label: {
    color: {
      textColor: g.color.secondaryText,
    },
    size: {
      fontSize: "text-sm",
      margin: "mb-1",
    },
    style: {
      fontWeight: "font-medium",
    },
  },

  chip: {
    color: {
      borderColor: g.color.defaultBorder,
      bgColor: g.color.surfaceBg,
      textColor: g.color.secondaryText,
    },
    size: {
      horizontalPadding: "px-2",
      verticalPadding: "py-0.5",
      fontSize: "text-xs",
    },
    style: {
      borderRadius: "rounded-full",
      borderStyle: "border",
    },
  },

  tooltip: {
    color: {
      bgColor: g.color.reverseSurfaceBg,
      textColor: g.color.reverseText,
    },
    size: {
      horizontalPadding: "px-2",
      verticalPadding: "py-1",
      fontSize: "text-xs",
    },
    style: {
      pointerEvents: "pointer-events-none",
      borderRadius: "rounded",
      opacity: "opacity-0",
      transition: "transition-opacity",
      hoverOpacity: "group-hover:opacity-100",
      zIndex: "z-10",
    },
  },

  tab: {
    color: {
      activeBgColor: g.color.surfaceBg,
      activeTextColor: g.color.primaryText,
      inactiveTextColor: g.color.mutedText,
      inactiveHoverTextColor: "hover:text-gray-700 dark:hover:text-gray-200",
    },
    size: {},
    style: {},
  },

  text: {
    color: {
      subheadingTextColor: g.color.secondaryText,
      bodyTextColor: g.color.secondaryText,
      placeholderTextColor: g.color.mutedText,
      captionTextColor: g.color.mutedText,
    },
    size: {
      subheadingFontSize: "text-sm",
      bodyFontSize: "text-sm",
      placeholderFontSize: "text-sm",
      captionFontSize: "text-xs",
      captionMargin: "mb-1",
    },
    style: {
      subheadingFontWeight: "font-medium",
    },
  },

  overlay: {
    color: {
      backdropBgColor: g.color.backdropBgColor,
      panelBgColor: g.color.overlayPanelBgColor,
      panelTextColor: g.color.secondaryText,
    },
    size: {
      panelHorizontalPadding: "px-10",
      panelVerticalPadding: "py-8",
    },
    style: {
      zIndex: "z-[200]",
      backdropBlur: g.style.backdropBlur,
      panelBorderRadius: g.style.overlayPanelBorderRadius,
      panelShadow: g.style.overlayPanelShadow,
    },
  },
} as const;


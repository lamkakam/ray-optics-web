/**
 * Shared Tailwind class tokens for modal dialogs.
 *
 * Import `cx` from this module instead of duplicating class strings
 * in every modal component.
 */
export const cx = {
  backdrop: "absolute inset-0 bg-black/50 backdrop-blur-sm",
  panel:
    "relative z-10 w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-modal-enter dark:border-gray-700 dark:bg-gray-900",
  title:
    "mb-4 border-b border-gray-200 pb-3 text-lg font-semibold text-gray-900 dark:border-gray-700 dark:text-gray-100",
  label:
    "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300",
  input:
    "w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100",
  select:
    "w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100",
  btnPrimary:
    "rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 cursor-pointer",
  btnSecondary:
    "rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 cursor-pointer",
  btnToggle:
    "rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer",
  btnDanger:
    "rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700 cursor-pointer",
  divider:
    "border-t border-gray-200 dark:border-gray-700",
  btnIconAdd:
    "w-6 h-6 inline-flex items-center justify-center rounded bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition cursor-pointer",
  btnIconDelete:
    "w-6 h-6 inline-flex items-center justify-center rounded bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition cursor-pointer",
  caption:
    "mb-1 text-xs text-gray-500",
  tooltip:
    "pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 z-10",
  headerSelect:
    "rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100",
  btnPrimarySubmit:
    "rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
  initOverlay:
    "fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gray-900/60 backdrop-blur-sm",
  initCard:
    "flex flex-col items-center gap-4 rounded-xl bg-white/10 px-10 py-8 text-white shadow-xl dark:bg-black/20",
} as const;

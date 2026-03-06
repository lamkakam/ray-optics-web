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
} as const;

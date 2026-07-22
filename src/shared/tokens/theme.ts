/**
 * Defines the discriminated string literal type representing the application's colour theme.
 *
 * @remarks
 * Pass `Theme` as a prop rather than reading from store in leaf components, to keep them testable.
 */
export type Theme = "light" | "dark";

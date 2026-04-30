# `shared/components/primitives/MenuContainer/MenuContainer.tsx`

Semantic `<menu>` scroll container for compact selectable lists.

- Renders children inside a `<menu>` element.
- Accepts direct `<li>` children. Keyboard navigation supports direct `<li><button /></li>` items only.
- Applies a fixed maximum height and vertical overflow for long lists.
- Handles `ArrowDown` and `ArrowUp` by focusing and clicking the next or previous enabled direct item button, wrapping at the ends.
- Starts at the first enabled button for `ArrowDown` and the last enabled button for `ArrowUp` when focus is outside the menu items.
- Calls a consumer `onKeyDown` before internal navigation and skips internal behavior when that handler prevents default.
- Uses `componentTokens.menuContainer` for surface, border, text, sizing, and radius classes.

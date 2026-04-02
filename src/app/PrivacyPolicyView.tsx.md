# PrivacyPolicyView.tsx

## Purpose
Full-page privacy policy view rendered by the `/privacy-policy` App Router page.

## Props
None.

## Content
- `<Header level={2}>Privacy Policy</Header>`
- Explains that the app runs fully client-side in the browser
- Lists the third-party CDNs contacted for Pyodide and Python package delivery
- Notes that IP addresses may be visible to those CDNs

## Usages

```tsx
// In app/(app-shell)/privacy-policy/page.tsx
<PrivacyPolicyView />
```

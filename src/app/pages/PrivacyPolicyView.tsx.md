# PrivacyPolicyView.tsx

## Purpose
Full-page privacy policy view rendered by the `/privacy-policy` App Router page. Contains the same content as the former `PrivacyPolicyModal` but rendered inline (no modal wrapper).

## Props
None.

## Content Sections
1. **Overview** — describes the client-side nature of the app
2. **Third-Party CDNs** — lists `cdn.jsdelivr.net`, `files.pythonhosted.org`, `pypi.org`
3. **IP Addresses** — explains IP exposure to CDNs
4. **We may make changes to these terms** — update notice

## Usages

```tsx
// In app/(app-shell)/privacy-policy/page.tsx
<PrivacyPolicyView />
```

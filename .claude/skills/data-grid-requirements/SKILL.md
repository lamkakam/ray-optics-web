---
name: data-grid-requirements
description: Data grid requirements for inputting and editing information of optical surfaces
---

## Library
- ag-grid (community version)

## Data Grid Requirements

- The first row is always the object surface. IT MUST NOT BE DELETABLE.
- The last row is always the image surface. IT MUST NOT BE DELETABLE. NO SURFACES CAN BE ADDED AFTER THE IMAGE SURFACE.
- Columns:
  1. Checkbox column for row selection. No checkbox for the first and last row.
  2. Surface label column. The first row is "Object" (NOT EDITABLE), the last row is "Image" (NOT EDITABLE). The other rows can be edited from a dropdown with "Default" and "Stop" as options. The `value` of the option is `"Default"` or `"Stop"`.
  3. Curvature Radius column. Not editable for the first row. All other rows, including the last row, are editable. Default value is 0.
  4. Thickness column. Not editable for the first row and last row. Editable for other rows. Default value is 0. DO NOT DISPLAY THE VALUE FOR THE FIRST ROW AND LAST ROW.
  5. Medium column. Not editable for the first row and last row. Editable for other rows. Default value is "air". DO NOT DISPLAY THE VALUE FOR THE FIRST ROW AND LAST ROW. On editing, it should invoke a modal with a dropdown: this dropdown is filterable by manufacturer (eg. Special, Schott, Ohara, etc.). "Special" is for "air" and "REFL".
  6. Semi-diameter column. Not editable for the first row and last row. Editable for other rows. Default value is 1. DO NOT DISPLAY THE VALUE FOR THE FIRST ROW AND LAST ROW.
  7. Aspherical checkbox column. Not editable for the first row and last row. Editable for other rows. Default is unchecked. Once the checkbox is checked, it should invoke a modal with a textbox for conic constant and a dropdown for selecting "Conical" or "Even Aspherical". If "Even Aspherical" is selected, it should invoke 10 other textboxes for the even aspherical coefficients (a2, a4, ..., a20). the textbox for conic constant is always active and visible in the modal because both options require it. DO NOT DISPLAY THE VALUE FOR THE FIRST ROW AND LAST ROW.

- Both modals must be in separated components.
- The state for data in the grid for column 2 to 7 must be handled by a parent component.
- The state for the grid values MUST BE ABLE TO TRANSFORM INTO THE TYPE OF `Surfaces` from `lib/opticalModel.ts`:
```typescript
// from lib/opticalModel.ts
export interface Surface {
  label: "Default" | "Stop";
  curvatureRadius: number; // 0 means flat (infinite radius).
  thickness: number;
  medium: string; // can be "air" or "REFL"
  manufacturer: string; // if medium is "air" or "REFL", manufacturer is also "air"
  semiDiameter: number;
  aspherical?: {
    conicConstant: number;
    polynomialCoefficients?: number[]; // length <= 10
  };
}

export interface Surfaces {
  object: {
    distance: number,
  },
  image: {
    curvatureRadius: number, // 0 means flat (infinite radius)
  },
  surfaces: Surface[];
}
```


### UI/UX Features

- [ ] Column resizing
- [ ] Inline editing
- [ ] Row selection (single row only) for two operaions: add multiple rows after the selected row, and delete the selected row
- [ ] Keyboard navigation
- [ ] Responsive design
- [ ] Theme support (light/dark/system)
- [ ] Export to JSON file
- [ ] Accessibility compliance (ARIA labels, keyboard navigation)
- [ ] The file for the grid component is put into `components/composite/`, and `components/container/` for the parent component.
- [ ] The files for the modal components are put into `components/composite/`. The files for other small components like dropdown are put into `components/micro/`.


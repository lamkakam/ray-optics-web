---
name: aperture-field-wavelength-configurer-requirements
description: System Aperture, Field, and Wavelengths configuration requirements for ray optics web
---

## Aperture, Field, and Wavelength Configurer Requirements
Layout:
```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Label: System Aperture                                                        │
├────────────────────────────┬──────────────────────────────────────────────────┤
│ Dropdown for types         │ Label & Textbox for value (floating point number)│
├────────────────────────────┴──────────────────────────────────────────────────┤
│ Label: Field                                                                  │
├───────────────────────────────────────────────────────────────────────────────┤
│ Button                                                                        |
├───────────────────────────────────────────────────────────────────────────────┤
│ Label: Wavelengths                                                            │
├───────────────────────────────────────────────────────────────────────────────┤
│ Button                                                                        │
└───────────────────────────────────────────────────────────────────────────────┘
```

- IMPORTANT: All grids involved in this skill must use ag-grid with all columns NOT sortable, NOT filterable and NOT switchable.


### 1. Aperture Configuration
Data type for a dropdown option value:
```typescript
interface SystemApertureValue {
  pupilSpace: "object" | "image";
  pupilType: "epd" | "f/#" | "NA";
}
```

Dropdown options for pupil space:
- Label: Entrance Pupil Diameter, value: `{ pupilSpace: "object", pupilType: "epd" }` (default option)
- Label: Image Space F/#, value: `{ pupilSpace: "image", pupilType: "f/#" }`
- Label: Object Space NA, value: `{ pupilSpace: "object", pupilType: "NA" }`

Textbox for value (floating point number; can be positive or negative). Default value is 0.5.


### 2. Field Configuration
Button for toggling a modal as shown below:
```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Label: Field                                                                                            │
├──────────────────────────┬──────────────────────────────────┬───────────────────────────────────────────┤
│ Dropdown for field space │ Dropdown for ["Height", "Angle"] │ Textbox for value (floating point number) │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ag-grid grid for relative fields                                                                        │
│                                                                                                         │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                   Cancel Button │ Apply Button                                          │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- Dropdown for field space options:
  - Label: Object, value: `"object"` (default option)
  - Label: Image, value: `"image"`

- Dropdown for field type options:
  - Label: Height, value: `"height"` (default option)
  - Label: Angle, value: `"angle"`
- Textbox for value (floating point number) with default value 0. Can be positive or negative.

- ag-grid grid for relative fields (min. 1 row; max. 10 rows)
  - First column: row addition and deletion buttons. No deletion button for the first row.
  - Second column: ag-grid's Text cell editor for each relative field value (floating point number; can be +ve or -ve). Default value is 0.

- Grid state must be transformed into an array of numbers storing relative field values with PRESERVED ORDER. This array is shared by other components to be implemented.

### 3. Wavelength Configuration
Button for toggling a modal as shown below:
```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Label: Wavelengths                                                                                      │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ag-grid grid for wavelengths and weights and etc.                                                       │
│                                                                                                         │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                   Cancel Button │ Apply Button                                          │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- ag-grid grid for wavelengths and weights and etc. (min. 1 row; max. 10 rows)
  - First column: row addition and deletion buttons. No deletion button for the first row.
  - Second column: ag-grid's Dropdown cell editor for a list of wavlengths (Fraunhofer lines like r, C, d, e, F, g, etc. sorted from longer to shorter wavelengths; CASE SENSITIVE).
    - Default option: "e".
    - When an option is selected, the wavelength (nm) column should be set to the corresponding wavelength.
  - Wavelength (nm) column: ag-grid's Text cell editor for each wavelength value (floating point number; must be > 0). Default value is 546.073.
    - It overrides the second column's value.
  - Weight column: ag-grid's Text cell editor for each weight value (floating point number; must be >= 0). Default value is 1.
  - Reference Wavelength column: Radio button. Default option is the first row. One and only one row is selected.

- The state of grid must be transformed into an objects with the following structure with PRESERVED ORDER:
```typescript
{
  weights: [number, number][]; // [wavelength in nm, weight][]
  referenceIndex: number; // index of the reference wavelength in the weights array
}
```


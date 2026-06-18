# Grammar of Lens Data Files from Photons to Photos
The doc is about the grammar and the parsing of lens data files (txt) from [Photons to Photos](https://www.photonstophotos.net/).

## 1. Def

```ebnf
file =
    descriptive_data_section
    constants_section?
    variable_distances_section
    lens_data_section
    aspherical_data_section?
    figure_section?
    notes_section?
;

descriptive_data_section =
    "[descriptive data]" newline
    "title" text newline
;

constants_section =
    "[constants]" newline
    constant_line*
;

constant_line =
    name number_list newline
;

variable_distances_section =
    "[variable distances]" newline
    variable_line*
;

variable_line =
    name value_list newline
;

lens_data_section =
    "[lens data]" newline
    lens_surface_line*
;

lens_surface_line =
    refracting_surface_line
  | air_surface_line
  | aperture_stop_line
  | cover_glass_line
;

refracting_surface_line =
    surface_id radius thickness nd aperture vd glass_name? glass_catalog? newline
;

air_surface_line =
    surface_id radius thickness aperture newline
;

aperture_stop_line =
    surface_id "AS" thickness aperture newline
;

cover_glass_line =
    surface_id "CG" thickness nd aperture vd newline
  | surface_id "CG" thickness aperture newline
;

aspherical_data_section =
    "[aspherical data]" newline
    aspherical_line*
;

aspherical_line =
    surface_id base_radius conic_constant asphere_coefficient* newline
;

figure_section =
    "[figure]" newline
    figure_line*
;

figure_line =
    "source" text newline
  | "originX" number newline
  | "originY" number newline
  | "ppmm" number newline
;

notes_section =
    "[notes]" newline
    text_line*
;
```

Supporting definitions:
```ebnf
surface_id =
    integer
  | integer "AS"
;

radius =
    number
  | "Infinity"
;

thickness =
    number
  | variable_distance_name
;

value =
    number
  | "Infinity"
  | "undefined"
  | variable_distance_name
;

value_list =
    value+
;

number_list =
    number+
;

nd =
    number;        (* refractive index *)

vd =
    number;        (* Abbe number *)

aperture =
    number;        (* clear aperture / diameter *)

base_radius =
    number;

conic_constant =
    number;

asphere_coefficient =
    number;        (* A4, A6, A8, A10, ... *)

name =
    text before first numeric/value token;

text =
    remainder of line;
```

## 2. Examples for getting OpticalSpecs from variables under [variable distances]

### 2.1 Example of a prime lens
```
[variable distances]
...
Angle of View	270
...
F-Number	5.6
...
d0	Infinity
...
Bf	14.4144
```

The variable `Bf` (backfocus) may be used for the `thickness` of the last row in [lens data].

The parsed `OpticalSpecs` instance would be:
```typescript
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

const opticalModal: OpticalModel = {
  setAutoAperture: false,
  specs: {
    pupil: {
      space: "image", // always defined over image space if F-Number is used
      type: "f/#", // always use F-Number if F-Number is provided
      value: 5.6,
    },

    field: {
      space: "object", // always defined over object space when Angle of View is used. If Image Height is used, it's defined over image space ("image")
      type: "angle", // always use Angle of View if Angle of View exists and isn't undefined. If not, use "height".
      maxField: (270/2),
      fields: [0, 0.707, 1], // always
      isRelative: true, // always true
      isWideAngle: true, // true when the Angle of View >= 80, false when the Angle of View < 80
    },

    // always defined like this for wavelength config
    wavelengths: {
      weights: [[587.562, 2], [486.133, 1],[656.273, 1]],
      referenceIndex: 0,
    },
    //
  },

  object: {
    distance: 1e10, // use 1e10 represents Infinity d0 (object distance)
    medium: "air", // always air
    manufacturer: "", // always empty string for "air"
  },

  image: {
    curvatureRadius: 0, // always flat
  },

  // parsed rows from the section [lens data] and an optional section [aspherical data]
  surfaces: [...],
};

```

### 2.2 Example of a zoom lens

The following is an example of [variable distances] section of the data file for a zoom lens. There are 3 data columns in this example.
A UI modal should be prompted to ask the user to specify which focal length should be used. `d0` denotes object distance. `d5`, `d12`, `d20` and `d22` here are variables to be used in the following section [lens data]. `Bf` (backfocus) may also be used in [lens data] as well.

```
[variable distances]
Focal Length	9.193	24.376	64.678
Angle of View	81.980	33.558	12.930
F-Number	2.912	2.912	2.912
...
d0	Infinity	Infinity	Infinity
d5	1.920	18.225	39.492
d12	25.033	9.558	4.784
d20	2.974	6.090	4.759
d22	6.789	17.332	29.926
Bf	0	0	0
```

### 2.3 Example of a finite conjugated microscope objective

```
[variable distances]
Focal Length	1.752
NA	1.35
Image Height	40
Magnification	-100
WD	0.100
d0	0
Bf	169.23
```

The parsed `OpticalSpecs` instance would be:
```typescript
import type { OpticalModel } from "@/shared/lib/types/opticalModel";

const opticalModal: OpticalModel = {
  setAutoAperture: false,
  specs: {
    pupil: {
      space: "object", // always defined over image space when NA is used
      type: "NA",
      value: 1.35,
    },

    field: {
      space: "image", // always defined over image space when Image Height is used
      type: "height",
      maxField: (40/2), // must be halved because the value for this web app defines half-field
      fields: [0, 0.707, 1], // always
      isRelative: true, // always true
      isWideAngle: true, // true when NA >= 0.5, false when NA < 0.5
    },

    // always defined like this for wavelength config
    wavelengths: {
      weights: [[587.562, 2], [486.133, 1],[656.273, 1]],
      referenceIndex: 0,
    },
    //
  },

  object: {
    distance: 0, // d0 is 0 in this example
    medium: "air", // always air
    manufacturer: "", // always empty string for "air"
  },

  image: {
    curvatureRadius: 0, // always flat
  },

  // parsed rows from the section [lens data] and an optional section [aspherical data]
  surfaces: [...],
};

```



## 3. Examples for spherical lens surfaces, air surfaces, aperture stops and cover glass
The following examples don't have aspheric surfaces, i.e. the `surface_id` doesn't appear under `[aspherical data]`. Each data row is expected to be parsed into a `Surface` instance. Typescript type `Surface` is defined in `src/shared/lib/types/opticalModel.ts`.

### 3.1 Example instance of aperture_stop_line
`11	AS	8.77		24.42			` means:
- `surface_id` is `11 AS`
- `thickness` is `8.77`
- `aperture` is `24.42`
- For `aperture_stop_line`, the surface is flat

Therefore, the parsed `Surface` instance is:
```typescript
{
  label: "Stop", // AS means aperture stop, so the label is "Stop" 
  curvatureRadius: 0, // 0 represents flat (infinite radius).
  thickness: 8.77,
  medium: "air",
  manufacturer: "", // when medium is "air", manufacturer is ""
  semiDiameter: (24.42/2), // the aperature data from the data file is diameter so the semiDiameter = 24.42 / 2
}
```

### 3.2 Example instance of air_surface_line with a variable
`22	26.061	d22		15.92	` means:
- `surface_id` is `22`
- `radius` is `26.061`
- `thickness` is `d22`, which is a variable defined under `[variable distances]`
- `aperture` is `15.92`
- For `air_surface_line`, the medium is `"air"` because no `nd`, `vd`, `glass_name` or `glass_catalog` is given

Therefore, the parsed `Surface` instance is:
```typescript
const d22: number = ...

{
  label: "Default",
  curvatureRadius: 26.061,
  thickness: d22,
  medium: "air",
  manufacturer: "",
  semiDiameter: (15.92/2),
}

```

### 3.3 Example instance of cover_glass_line with nd and vd
`27	CG	0.300	1.517	17.81	64.166` means:
- `surface_id` is `27 CG`
- `thickness` is `0.300`
- `nd` is `1.517`
- `aperture` is `17.81`
- `vd` is `64.166`
- For `cover_glass_line`, the surface is flat

Therefore, the parsed `Surface` instance is:
```typescript
{
  label: "Default",
  curvatureRadius: 0, // 0 represents flat
  thickness: 0.300,
  medium: "1.517", // attribute medium is overloaded for nd
  manufacturer: "64.166", // attribute manufacturer is overloaded for vd
  semiDiameter: (17.81/2),
}

```


### 3.4 Example instance of cover_glass_line without nd and vd
`28	CG	1.950		17.81` means:
- `surface_id` is `28 CG`
- `thickness` is `1.950`
- `aperture` is `17.81`
- Again for `cover_glass_line`, the surface is flat

Therefore, the parsed `Surface` instance is:
```typescript
{
  label: "Default",
  curvatureRadius: 0,
  thickness: 1.950,
  medium: "air",
  manufacturer: "",
  semiDiameter: (17.81/2),
}

```

## 3.5 Example 1 of refracting_surface_line

`11	Infinity	1.575	1.51743	12.35	58.5` should be parsed as:
```typescript
{
  label: "Default",
  curvatureRadius: 0, // 0 represents flat
  thickness: 1.575,
  medium: "1.51743", // attribute medium is overloaded for nd
  manufacturer: "58.5", // attribute manufacturer is overloaded for vd
  semiDiameter: (12.35/2),
}

```

## 3.6 Example 2 of refracting_surface_line
`9	32.92	1.65	1.729164	29.02	54.669031	H-LAK52	cdgm` should be parsed as:
```typescript
{
  label: "Default",
  curvatureRadius: 32.92,
  thickness: 1.65,
  medium: "H-LAK52", // canonical glass name when it matches loaded catalog data
  manufacturer: "CDGM", // canonical catalog name when it matches loaded catalog data
  semiDiameter: (29.02/2),
}

```

Glass name and catalog matching is case-insensitive when the app-wide glass catalogs have loaded. The imported manufacturer and glass strings are resolved to the canonical app values from the catalog data, so casing variants such as `hoya` and `H-LAK52` can import as `Hoya` and the loaded canonical glass name.

Special media names `CaF2`, `Fused silica`, and `Water` are also matched case-insensitively and parsed with an empty manufacturer:
```typescript
{
  medium: "CaF2",
  manufacturer: "",
}
```

The aliases `fluorite` and `fluorspar` resolve to canonical `CaF2`. Reflective material `REFL` is not accepted through lowercase aliasing.

If a row provides a named glass that does not exist in the lookup maps, and the row also includes `nd`, the parser falls back to the Photons to Photos model-glass values:
```typescript
{
  medium: "1.654", // nd
  manufacturer: "39.1", // vd
}
```

If the glass catalogs are unavailable, named-glass rows keep legacy parsing: the imported glass name is used as `medium` and the imported catalog is uppercased as `manufacturer`.

## 4. Examples of aspheric lens surfaces and air surfaces
The following examples have aspheric surfaces, i.e. the `surface_id` appears under `[aspherical data]`.

### 4.1 Example 1

```
[lens data]
...
6	300.000	0.800	1.803	26.07	45.57
...

[aspherical data]
...
6	300	0	-3.93629E-05	3.95479E-07	-1.09912E-09	
...
```
means:
- `surface_id` is `6`
- `radius` is `300.000`
- `thickness` is `0.800`
- `nd` is `1.803`
- `aperture` is `26.07`
- `vd` is `45.57`
- `conic_constant` is `0`
- asphere coefficients are `[-3.93629E-05, 3.95479E-07, -1.09912E-09]`
- For the same surface, in case of `radius` in `[lens data]` doesn't agree with `radius` in `[aspherical data]`, reject the parsing

Therefore, the parsed `Surface` instance is:
```typescript
{
  label: "Default",
  curvatureRadius: 300.000,
  thickness: 0.800,
  medium: "1.803", // attribute medium overloaded for nd
  manufacturer: "45.57", // attribute manufacturer overloaded for vd
  semiDiameter: (26.07/2),
  aspherical: {
    kind: "EvenAspherical", // has to be even aspherical
    conicConstant: 0,
    polynomialCoefficients: [-3.93629E-05, 3.95479E-07, -1.09912E-09],
  },
}

```

### 4.2 Example 2
```
[lens data]
...
7	10.415	5.630		17.14
...

[aspherical data]
...
7	10.415	0	-7.86178E-05	-1.27061E-07	-1.97636E-09	5.44302E-11
...
```
means:
- `surface_id` is `7`
- `radius` is `10.415`
- `thickness` is `5.630`
- `aperture` is `17.14`
- `conic_constant` is `0`
- asphere coefficients are `[-7.86178E-05, -1.27061E-07, -1.97636E-09, 5.44302E-11]`
- Again, for the same surface, in case of `radius` in `[lens data]` doesn't agree with `radius` in `[aspherical data]`, reject the parsing

Therefore, the parsed `Surface` instance is:
```typescript
{
  label: "Default",
  curvatureRadius: 10.415,
  thickness: 5.630,
  medium: "air",
  manufacturer: "",
  semiDiameter: (17.14/2),
  aspherical: {
    kind: "EvenAspherical", // has to be even aspherical
    conicConstant: 0,
    polynomialCoefficients: [-7.86178E-05, -1.27061E-07, -1.97636E-09, 5.44302E-11],
  },
}

```

---
name: optics-conventions
description: Conventions for optics design software (Zemax-style) about coordinate systems, radius of curvature, thickness
---

## Optics Design Conventions (Zemax-style)

### Coordinate System & Propagation

- **+Z**: along the optical axis, from object space toward image space (nominal light propagation direction).
- **+X, +Y**: transverse directions, forming a right-handed coordinate system with +Z.

### Radius of Curvature (R)
Don't use curvature C = 1/R. Use R directly.
Uses the "center of curvature" convention:

- **R > 0**: center of curvature lies to the **right** (+Z side) of the surface vertex.
- **R < 0**: center of curvature lies to the **left** (−Z side) of the surface vertex.

### Standard surfaces
- has a conic constant. 0 = sphere, -1 = paraboloid, <-1 = hyperboloid, >0 = oblate ellipsoid.
- no polynomial coefficients. No higher-order terms.

### Even apherical surfaces
- also has a conic constant. 0 = sphere, -1 = paraboloid, <-1 = hyperboloid, >0 = oblate ellipsoid.
- has polynomial coefficients:
     * Array length must not exceed 20th-order term, ie. array length <= 10
     * Trailing zero terms are omitted

**Sanity check (light traveling left → right):**
- A biconvex lens has **R₁ > 0** (first surface bulges toward incoming light) and **R₂ < 0** (second surface bulges toward outgoing light).
- A biconcave lens has **R₁ < 0** and **R₂ > 0**.

### Thickness

The **Thickness** in the Lens Data Editor is the axial distance from the current surface vertex to the **next** surface vertex along +Z.

- **Positive thickness**: next surface is ahead in the propagation direction (normal case).
- **Negative thickness**: next surface is behind (used in folded layouts or when reversing the propagation direction).


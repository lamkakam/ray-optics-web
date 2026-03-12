# DecenterData `dtype` Reference

Source: [`rayoptics.elem.surface.DecenterData`](https://ray-optics.readthedocs.io/en/latest/api/rayoptics.elem.surface.html#rayoptics.elem.surface.DecenterData)
([GitHub](https://github.com/mjhoptics/ray-optics/blob/7bc7ab82206228be2286e1b137243f93524f00b1/src/rayoptics/elem/surface.py#L274))

---

## Overview

`DecenterData` stores a position offset (`dec: [x, y, 0]`) and orientation
(`euler: [alpha, beta, gamma]`) that shift/tilt a surface out of the nominal
optical axis. The `dtype` parameter controls **when** the transformation is
applied relative to the surface — before, after, or both — and whether it is
forward or inverse.

Two internal methods drive the behaviour:

- `tform_before_surf()` → transformation applied **before** the ray hits the surface
- `tform_after_surf()` → transformation applied **after** the ray leaves the surface

---

## dtype Values

### `'decenter'`

| | Transform |
|---|---|
| Before surface | rotation matrix **R** + displacement **d** |
| After surface | identity (nothing) |

**Meaning**: permanently shifts/tilts the surface. The ray continues in the new
frame, so all subsequent surfaces are also in the decentered coordinate frame.
Must be "closed" manually by a later `'reverse'` surface if you want to return
to the original axis.

---

### `'reverse'`

| | Transform |
|---|---|
| Before surface | identity (nothing) |
| After surface | **R⁻¹** (transposed) + **−d** |

**Meaning**: undoes a decentering that was applied by a previous surface.
Typically placed immediately after a `'decenter'` surface to restore the
nominal optical axis for the rest of the system.

---

### `'dec and return'`

| | Transform |
|---|---|
| Before surface | rotation matrix **R** + displacement **d** |
| After surface | **R⁻¹** (transposed) + **−d** |

**Meaning**: the tilt/shift applies only to **this single surface** and is
immediately undone afterward. The next surface is back in the original frame.
This is the standard choice for a "local" tilt — only one surface is affected
without disturbing the rest of the prescription.

---

### `'bend'`

| | Transform |
|---|---|
| Before surface | rotation matrix **R** + displacement **d** |
| After surface | **R** (same rotation, no displacement) |

**Meaning**: designed for **fold mirrors**. Applying the same rotation before
and after the mirror correctly folds the beam — the net angular deviation
equals twice the tilt angle, matching the law of reflection for a tilted
mirror.

---

## Summary Table

| `dtype` | Before surface | After surface | Typical use |
|---|---|---|---|
| `decenter` | R·x + d | identity | Permanent frame shift for multiple surfaces |
| `reverse` | identity | R⁻¹·x − d | Undo a prior `'decenter'` |
| `dec and return` | R·x + d | R⁻¹·x − d | Local tilt on a single surface |
| `bend` | R·x + d | R·x (no d) | Fold / turning mirror |

---

## Python Source (condensed)

```python
def tform_before_surf(self) -> Tfm3d:
    if self.dtype != 'reverse':
        return self.rot_mat, self.dec
    else:
        return None, np.array([0., 0., 0.])

def tform_after_surf(self) -> Tfm3d:
    if self.dtype == 'reverse' or self.dtype == 'dec and return':
        rt = self.rot_mat
        if self.rot_mat is not None:
            rt = self.rot_mat.transpose()
        return rt, -self.dec
    elif self.dtype == 'bend':
        return self.rot_mat, np.array([0., 0., 0.])
    else:
        return None, np.array([0., 0., 0.])
```

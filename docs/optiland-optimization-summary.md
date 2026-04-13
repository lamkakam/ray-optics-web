# Optiland Optimization Source Summary

This summary is based on the installed Optiland package in the local venv:
`/home/kakamlam/optiland-test/lib/python3.12/site-packages/optiland`.

## Overview

Optiland's optimization code is centered on an `OptimizationProblem` object in
`optiland.optimization.problem`. The model is simple:

- variables describe which optical-system parameters may change
- operands describe what should be matched, minimized, or constrained
- optimizers drive the variables to reduce a merit function derived from the
  operands

The main package export in `optiland.optimization.__init__` exposes:

- `OptimizationProblem`
- variable wrappers such as `RadiusVariable`, `ConicVariable`,
  `ThicknessVariable`, `IndexVariable`, and coefficient-based variables
- operand wrappers such as `ParaxialOperand`, `AberrationOperand`,
  `RayOperand`, and `Operand`
- SciPy-based optimizers such as `OptimizerGeneric`, `LeastSquares`,
  `DualAnnealing`, `DifferentialEvolution`, `SHGO`, `BasinHopping`,
  `GlassExpert`, and `OrthogonalDescent`
- Torch optimizers when torch imports successfully

## Core Optimization Flow

`OptimizationProblem` owns two managers:

- `OperandManager` for merit-function terms
- `VariableManager` for tunable design parameters

The core methods are:

- `add_operand(...)` to append a new metric/constraint term
- `add_variable(...)` to expose an optical-system parameter for optimization
- `fun_array()` to return the vector of weighted residuals squared
- `sum_squared()` to return the scalar objective value
- `rss()` to return the root-sum-square merit
- `update_optics()` to update each unique optic referenced by the variables

The objective is built from `op.fun()` for each operand. Each operand returns a
weighted residual, and `OptimizationProblem.fun_array()` squares those values.
That means the main scalar objective is a sum of squared weighted residuals.

Optiland also stores `initial_value` on the problem and uses it for reporting
improvement percentages in `merit_info()`.

## Operands: Merit Function Terms

The merit-function side is defined in `optiland.optimization.operand`.

`Operand` is a small dataclass with:

- `operand_type`
- `target` for equality constraints
- `min_val` and `max_val` for inequality constraints
- `weight`
- `input_data`

Behavior is:

- if `target` is set, residual is `value - target`
- if bounds are set, residual is zero when the value is inside bounds, and a
  penalty distance when it is outside bounds
- `fun()` returns `weight * delta()`

If no target or bounds are provided, the operand defaults its target to the
current value, effectively freezing the current metric as the reference.

The available built-in operands are registered through `METRIC_DICT`, then put
into a global `operand_registry`. The package groups them into a few main
families:

- paraxial metrics: focal data, pupil data, magnification, total track
- aberration metrics: Seidel and chromatic aberration terms and summed forms
- real-ray metrics: intercepts, direction cosines, clearance, AOI, OPD
  difference, RMS spot size
- lens constraints: for example edge thickness

This is extensible by design because the registry can register new operand
names to functions.

## Variables: What the Optimizer Can Change

The variable side is defined in `optiland.optimization.variable`.

`Variable` is a wrapper that holds:

- the owning optic
- a type name such as `radius` or `thickness`
- optional bounds
- an optional scaler
- metadata such as `surface_number`, `coeff_number`, `axis`, `wavelength`, or
  `glass_selection`

`Variable._get_variable()` maps the type string to a concrete behavior class.
The installed package includes support for:

- geometric variables: `radius`, `reciprocal_radius`, `conic`, `thickness`,
  `tilt`, `decenter`
- material/index variables: `index`, `material`
- freeform/asphere variables: `asphere_coeff`, `polynomial_coeff`,
  `chebyshev_coeff`, `zernike_coeff`, `forbes_qbfs_coeff`,
  `forbes_qnormalslope_coeff`, `forbes_q2d_coeff`, `norm_radius`
- NURBS-related variables: `nurbs_control_point`, `nurbs_weight`

`Variable.value` returns the scaled value used by optimizers. `Variable.update()`
accepts a scaled optimization-space value, inverse-scales it, then writes the
physical value back through the concrete variable behavior.

One practical detail in `VariableManager.add(...)` is that when a surface
variable is added, any pickup already controlling the same target attribute is
removed from the optic. That suggests Optiland treats a variable declaration as
taking direct ownership of that degree of freedom.

## Scaling

Scaling is a first-class part of the design under
`optiland.optimization.scaling`.

The base `Scaler` defines:

- `scale(value)`
- `inverse_scale(scaled_value)`
- `transform_bounds(min_val, max_val)`

Bounds are transformed through the selected scaler before optimization. The
base scaler also supports non-monotonic transforms by swapping bounds when
needed, though the default assumption is monotonic increasing.

Concrete scalers include:

- `IdentityScaler`
- `LinearScaler`
- `LogScaler`
- `PowerScaler`
- `ReciprocalScaler`

Variable classes can supply useful defaults. For example, `RadiusVariable`
defaults to a `LinearScaler(factor=1/100.0, offset=-1.0)`, which indicates the
library tries to normalize some physical parameters before optimization.

## SciPy Optimization Path

The default continuous optimization path is the SciPy family in
`optiland.optimization.optimizer.scipy`.

`OptimizerGeneric` is the base wrapper around `scipy.optimize.minimize`.
Important behavior:

- it records the initial variable vector so an `undo()` operation can restore
  the previous state
- it rejects string-valued variables up front, specifically glass/material
  variables, and instructs the user to use `GlassExpert` instead
- it reads the current scaled variable values as the optimizer's `x0`
- it passes transformed bounds from each variable into SciPy
- `_fun(x)` updates all variables, calls `problem.update_optics()`, evaluates
  `problem.sum_squared()`, and returns a Python float
- NaNs or `ValueError` during optical evaluation are converted into a large
  penalty value (`1e10`)

So the generic SciPy path is a classic black-box continuous optimization loop
over the scalar sum-of-squares merit.

### Least Squares

`LeastSquares` is a specialized SciPy wrapper around
`scipy.optimize.least_squares`.

Instead of minimizing the already-summed scalar objective, it builds a residual
vector directly from `[op.fun() for op in self.problem.operands]`. That matches
SciPy's least-squares API more naturally.

Notable behavior:

- default `method_choice` is `"lm"` for a damped least-squares style workflow
- if residual count is lower than variable count, `"lm"` is rejected and it
  switches to `"trf"`
- if bounds are present, `"lm"` warns that bounds are ignored
- for bounded methods, the initial point is nudged inside the bounds if it sits
  exactly on an edge
- failed ray tracing, NaNs, or other exceptions return a large residual vector
  rather than aborting

This optimizer is likely the closest thing in the package to a conventional
optical design damped least-squares workflow.

### Other SciPy Wrappers

The package also exposes wrappers for:

- `DualAnnealing`
- `DifferentialEvolution`
- `SHGO`
- `BasinHopping`
- `OrthogonalDescent`

From the package structure, these appear to share the same `OptimizationProblem`
and variable/operand model while swapping only the optimization algorithm.

## Discrete Material Optimization: GlassExpert

`MaterialVariable` is special because its value is a string glass/material name,
not a continuous scalar. It updates a surface's `material_post` using
`MaterialFactory`.

If the surface starts as an `AbbeMaterial`, `MaterialVariable` converts that
approximate representation into the closest real catalog glass before
optimization. That conversion is printed to the console.

Because generic continuous optimizers assert that variables cannot be strings,
material optimization is handled separately by `GlassExpert`.

`GlassExpert` implements a hybrid discrete/continuous strategy:

- identify all glass variables
- do a broad exploration over a downsampled glass map in `(n_d, V_d)` space
- do a local exploration over nearest-neighbor glasses
- for each candidate glass, temporarily substitute it, run a continuous local
  optimization, measure the merit, and keep the best result
- restore the best state and perform a final local optimization pass

This is effectively a greedy categorical search in glass space combined with
continuous refinement of the remaining variables.

## Torch Optimization Path

The package also supports a differentiable path through
`optiland.optimization.optimizer.torch`.

`TorchBaseOptimizer` requires:

- the Optiland backend to be `"torch"`
- gradient tracking enabled

It creates one `torch.nn.Parameter` per optimization variable, then runs a
standard optimization loop:

1. zero gradients
2. push parameter values into the Optiland variables
3. call `problem.update_optics()`
4. compute `problem.sum_squared()`
5. backpropagate
6. step the optimizer
7. clamp parameters to bounds
8. step an exponential learning-rate scheduler

The installed package includes:

- `TorchAdamOptimizer`
- `TorchSGDOptimizer`

This path is clearly intended for gradient-based design optimization when the
backend operations are differentiable.

## Integration Points Outside `optimization`

Two nearby modules reuse the same optimization machinery.

### Tolerancing Compensation

`optiland.tolerancing.compensator.CompensatorOptimizer` subclasses
`OptimizationProblem` and selects either `OptimizerGeneric` or `LeastSquares`.
This shows the optimization package is also used for compensator solves after
perturbations in tolerancing workflows.

### PyTorch ML Wrapper

`optiland.ml.wrappers.OpticalSystemModule` wraps an `OptimizationProblem` as a
PyTorch `nn.Module`.

It exposes the problem variables as trainable parameters, synchronizes them into
the optic during `forward()`, updates the optics, and returns either
`problem.sum_squared()` or a custom objective function. This makes the optical
system usable as a differentiable component inside larger ML models.

## Notable Design Choices

- The package separates "what may change" (variables) from "what should be
  achieved" (operands) cleanly.
- The default scalar objective is the sum of squared weighted residuals.
- Equality and inequality targets are both supported at the operand level.
- Variable scaling is built into the optimization API rather than bolted on.
- Continuous and categorical optimization are split cleanly: continuous methods
  handle numeric variables, while material search is delegated to `GlassExpert`.
- Optical-system updates are explicit through `problem.update_optics()`, which
  is called after each variable update step by every optimizer path.
- The torch path mirrors the SciPy path conceptually, but works through
  autograd-enabled backend operations.

## Practical Reading of the Intended Workflow

Based on the source, the expected user workflow looks like this:

1. build or load an optical system
2. create an `OptimizationProblem`
3. add variables for the degrees of freedom to optimize
4. add operands for targets and constraints
5. choose an optimizer family:
   continuous SciPy, least-squares SciPy, torch, or `GlassExpert`
6. run the optimizer and inspect the updated optical system

In short, Optiland's optimization subsystem is organized around a compact merit
function abstraction and then offers several solver backends on top of that same
problem definition.

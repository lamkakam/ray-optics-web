# K-Means Glass Candidate Selection

Glass selection is categorical: a surface must end with one real glass from its candidate list. K-means is used only to reduce the number of expensive optical trials, not to define the optical merit function.

The Glass Expert UI stores an explicit candidate identity set for Object gap `0` and each selected physical-surface gap `1..N`. Pools can combine the six manufacturer catalogs, the bundled `Special` materials (`CaF2`, `Fused Silica`, `Water`, and `D263TECO`), and live user-defined `Custom` materials. Air and `REFL` are not candidates. Manufacturer resolution is cached; injected Special and mutable Custom material objects are resolved from the worker's live mappings.

A saved pool is validated again immediately before evaluation and optimization. Every selected identity must still exist, and a non-ModelGlass incumbent must be selected in its own pool. Numeric ModelGlass incumbents are the exception: they are mapped to the nearest selected real candidate in the same raw coordinate space described below. This means deleting a selected Custom material or omitting an incumbent leaves the saved UI selection intact but blocks a run until the pool is corrected.

## From Glasses to Points

Each candidate glass $g$ is mapped to the two-dimensional point

$$
x_g = (n_d, V_d),
\qquad
V_d = \frac{n_d - 1}{n_F - n_C}.
$$

All four values involved in the coordinate calculation must produce finite coordinates, and $n_F$ must differ from $n_C$. A candidate with unreadable or non-finite data cannot enter clustering.

The distance calculation uses raw Euclidean coordinates:

$$
d(g_1, g_2)
=
\sqrt{(n_{d,1}-n_{d,2})^2 + (V_{d,1}-V_{d,2})^2}.
$$

There is no normalization or feature scaling. Since $V_d$ commonly spans a much larger numeric range than $n_d$, differences in $V_d$ can dominate clustering and nearest-neighbour selection. This is a deliberate property of the current search and should be considered when choosing candidate pools.

## Independent Clustering Per Surface

For each optimizable surface $s$, let $G_s$ be its finite candidate pool. That surface is clustered independently with

$$
k_s = \min(\text{num\_neighbours}, |G_s|).
$$

Independent clustering matters because surfaces may have different catalogs, candidate counts, or intended optical roles. Candidates from separate surfaces are never mixed into one k-means fit.

K-means centroids are synthetic points and are not selectable glasses. Each centroid is therefore projected back to the nearest real member of its cluster. The resulting real candidates are the global representatives used for optical trials.

Catalog membership does not change report identity. Special and Custom media may have internal RayOptics catalog names, but progress and final reports use the configured `Special` / `Custom` identity so the frontend can apply the result deterministically.

## Search Sequence

The reduced search proceeds in three stages:

1. Global representative pass: for each surface in configuration order, try its projected k-means representatives. Every representative is evaluated with the real optical merit function and continuous variables are refined for that trial.
2. Local nearest-neighbour pass: after the global pass, find raw-coordinate neighbours around each surface's incumbent glass and evaluate those real candidates with the same continuous refinement.
3. Final polish: keep the selected glasses fixed and run one final continuous refinement.

With multiple glass surfaces, the algorithm is an ordered greedy search. It finishes one surface against the current design before moving to the next; it does not construct the Cartesian product of all surface candidate pools. This keeps the number of trials practical, but the result can depend on surface order and is not guaranteed to be the globally best combination.

## Compact Example

Suppose three surfaces each have 24 candidates and `num_neighbours = 4`.

- A Cartesian search contains $24^3 = 13{,}824$ glass combinations before continuous refinement.
- Independent k-means selection produces $4$ global representatives per surface, for $3 \times 4 = 12$ global candidate trials.
- Trying up to $4$ local neighbours per surface adds at most another $12$ candidate trials.
- One final continuous polish gives at most $25$ refinement runs in this simplified count.

The reduction comes from using the coordinate map to choose representative real glasses, while every accepted or rejected decision still comes from the full optical merit evaluation.

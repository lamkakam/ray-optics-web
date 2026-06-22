# Next.js module-worker library output

Next.js uses `_N_E` as the webpack library namespace for client exports. The
namespace is part of Next's generated client runtime and must remain available
when the client build also emits the Pyodide worker.

ES-module workers execute in strict mode. An emitted assignment to an
unqualified `_N_E` identifier therefore throws a `ReferenceError` when the
identifier has not already been declared. The client webpack configuration uses
an `assign` library target named `["globalThis", "_N_E"]`, which emits an
explicit `globalThis._N_E = __webpack_exports__` assignment and works in window
and worker global scopes.

A banner declaration would depend on generated-code ordering and would create a
lexical binding rather than make the intended global-object assignment
explicit. A separate worker build would duplicate and diverge from Next's
existing webpack pipeline. Configuring the library target fixes the generated
assignment at its source while preserving Next's export semantics.

## Verification and compatibility

A production build must retain module output, the base-path-aware worker public
path, disabled chunk splitting, and ignored Node-only imports. Inspect the
emitted worker and confirm it contains an explicit `globalThis._N_E` assignment
and no unqualified `_N_E =` assignment. Serve the static export and verify in a
browser that Pyodide initializes without page-console or worker errors.

This override applies only to client webpack output. Server output must remain
compatible with Next.js page-data collection, and the application must continue
to use Next's static export and existing worker pipeline.

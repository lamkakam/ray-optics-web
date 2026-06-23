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

## Development compilation

Next.js development compilations share transformed App Router modules between
the server and browser compilers. Webpack's module-output experiment must
therefore be enabled for every compilation before that shared transformation
occurs. Server `output.module` is explicitly set to `false`, while browser
`output.module` is set to `true`; this preserves CommonJS server bundles and
emits the browser worker constructor with `type: "module"` instead of
`type: undefined`.

## Verification and compatibility

Development and production builds must retain module output, the
base-path-aware worker public path, disabled chunk splitting, and ignored
Node-only imports. Inspect the development App Router browser chunk and confirm
the emitted worker constructor contains `type: "module"` and not
`type: undefined`. Inspect the production worker and confirm it contains an
explicit `globalThis._N_E` assignment and no unqualified `_N_E =` assignment.
Run both outputs in a browser and verify that Pyodide initializes without
page-console or worker errors.

This override applies only to client webpack output. Server output must remain
compatible with Next.js page-data collection, and the application must continue
to use Next's static export and existing worker pipeline.

const { createServer } = require("node:http");
const next = require("next");

/**
 * @typedef {(request: import("node:http").IncomingMessage, response: import("node:http").ServerResponse) => Promise<void>} RequestHandler
 */

/**
 * Add the headers required for cross-origin isolation before Next handles a
 * development request.
 *
 * @param {RequestHandler} nextHandler
 * @returns {RequestHandler}
 */
function withCrossOriginIsolationHeaders(nextHandler) {
  return (request, response) => {
    response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    return nextHandler(request, response);
  };
}

async function startDevelopmentServer() {
  const port = Number(process.env.PORT ?? 3000);
  /** @type {RequestHandler | undefined} */
  let requestHandler;

  const httpServer = createServer((request, response) => {
    if (requestHandler === undefined) {
      response.statusCode = 503;
      response.end("Development server is starting");
      return;
    }

    void requestHandler(request, response).catch((error) => {
      console.error(error);
      if (!response.headersSent) response.statusCode = 500;
      response.end("Internal Server Error");
    });
  });
  const app = next({
    dev: true,
    webpack: true,
    port,
    httpServer,
  });

  await app.prepare();
  requestHandler = withCrossOriginIsolationHeaders(app.getRequestHandler());
  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
}

if (require.main === module) {
  void startDevelopmentServer().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { withCrossOriginIsolationHeaders };

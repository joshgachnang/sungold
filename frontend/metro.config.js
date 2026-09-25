const {getDefaultConfig} = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // @terreno/admin-frontend imports jspdf for its consent-PDF export. jspdf's CommonJS and
  // Node builds wrap an AMD-style `require(["html2canvas"], cb)` call that Metro's static
  // transform cannot parse, which fails the whole bundle — including Expo Router's static
  // web render, which resolves under a "node" condition and would otherwise pick
  // jspdf.node.min.js. Pin every jspdf request to the ESM browser build on web, and drop it
  // on native, where PDF export is unavailable and jspdf's browser/Node APIs are missing.
  if (moduleName === "jspdf" || moduleName.startsWith("jspdf/dist/jspdf.node")) {
    if (platform !== "web") {
      return {type: "empty"};
    }
    try {
      const jspdfDir = path.dirname(require.resolve("jspdf/package.json", {paths: [__dirname]}));
      return {
        filePath: path.join(jspdfDir, "dist", "jspdf.es.min.js"),
        type: "sourceFile",
      };
    } catch {
      // jspdf is not installed — let Metro report the failure itself.
    }
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

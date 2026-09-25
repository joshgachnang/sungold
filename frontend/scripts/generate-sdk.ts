#!/usr/bin/env bun

import {execFile} from "node:child_process";
import {existsSync, readFileSync, realpathSync, writeFileSync} from "node:fs";
import {basename, dirname, extname, join, resolve, sep} from "node:path";

const cliPath = join(
  __dirname,
  "..",
  "node_modules",
  "@rtk-query",
  "codegen-openapi",
  "lib",
  "bin",
  "cli.mjs"
);
const configFile = process.argv[2] ?? "openapi-config.ts";
const sdkFile = process.argv[3] ?? "store/openApiSdk.ts";
const projectRoot = resolve(__dirname, "..");
const configPath = resolve(projectRoot, configFile);
const sdkPath = resolve(projectRoot, sdkFile);
const tsConfigPath = join(__dirname, "..", "tsconfig.codegen.json");
const canonicalProjectRoot = realpathSync(projectRoot);

const isProjectFile = (filePath: string): boolean => {
  if (!filePath.startsWith(`${projectRoot}${sep}`) || extname(filePath) !== ".ts") {
    return false;
  }
  try {
    const canonicalPath = existsSync(filePath)
      ? realpathSync(filePath)
      : resolve(realpathSync(dirname(filePath)), basename(filePath));
    return canonicalPath.startsWith(`${canonicalProjectRoot}${sep}`);
  } catch {
    return false;
  }
};

if (!isProjectFile(configPath) || !isProjectFile(sdkPath)) {
  console.error("SDK config and output must be TypeScript files inside frontend/");
  process.exit(1);
}

execFile(
  "tsx",
  [cliPath, configPath],
  {env: {...process.env, TS_NODE_PROJECT: tsConfigPath}},
  (error, _stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }

    if (existsSync(sdkPath)) {
      let content = readFileSync(sdkPath, "utf8");
      content = content.replace(/^export const \{\} = injectedRtkApi;\n?/m, "");
      if (!content.startsWith("// biome-ignore-all lint/suspicious/noExplicitAny")) {
        content =
          "// biome-ignore-all lint/suspicious/noExplicitAny: types are generated from backend OpenAPI schemas\n" +
          content;
      }
      writeFileSync(sdkPath, content, "utf8");
    }

    execFile(
      "bunx",
      ["biome", "check", "--unsafe", "--write", sdkPath],
      {cwd: projectRoot},
      (formatError) => {
        if (formatError) {
          console.error(`Formatting error: ${formatError.message}`);
          process.exit(1);
        }
      }
    );
  }
);

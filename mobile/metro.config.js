const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// Block duplicate React copies from root and shared node_modules
// Convert Windows backslashes to forward slashes, then escape for regex
const toRegex = (p) => {
  const normalized = p.split(path.sep).join("/");
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped + ".*");
};

config.resolver.blockList = [
  toRegex(path.resolve(workspaceRoot, "node_modules", "react")),
  toRegex(path.resolve(workspaceRoot, "node_modules", "react-native")),
  toRegex(path.resolve(workspaceRoot, "shared", "node_modules", "react")),
  toRegex(
    path.resolve(workspaceRoot, "shared", "node_modules", "react-native"),
  ),
];

// Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Add shared folder to extraNodeModules
// Pin react/react-native to mobile's copies to prevent duplicate React in monorepo
config.resolver.extraNodeModules = {
  "@shared": path.resolve(workspaceRoot, "shared/src"),
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
  "react/jsx-runtime": path.resolve(
    projectRoot,
    "node_modules/react/jsx-runtime",
  ),
};

// Ensure GIF files are recognized as assets
if (!config.resolver.assetExts.includes("gif")) {
  config.resolver.assetExts.push("gif");
}

module.exports = config;

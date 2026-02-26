const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Add shared folder to extraNodeModules
config.resolver.extraNodeModules = {
  "@shared": path.resolve(workspaceRoot, "shared/src"),
};

// Ensure GIF files are recognized as assets
if (!config.resolver.assetExts.includes("gif")) {
  config.resolver.assetExts.push("gif");
}

module.exports = config;

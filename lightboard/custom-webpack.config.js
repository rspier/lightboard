const { GitRevisionPlugin } = require('git-revision-webpack-plugin');
const webpack = require('webpack');

module.exports = (config, options, targetOptions) => { // Adjusted to match expected signature for :application builder if different
  const gitRevisionPlugin = new GitRevisionPlugin({
    commithashCommand: 'rev-parse --short HEAD', // Ensure short hash
    // branch: true, // Optionally get branch info too, if needed later
  });

  // Initialize plugins array if it doesn't exist
  if (!config.plugins) {
    config.plugins = [];
  }

  // Add DefinePlugin to make git information available as environment variables
  config.plugins.push(
    new webpack.DefinePlugin({
      'process.env.GIT_COMMIT_HASH': JSON.stringify(gitRevisionPlugin.commithash()),
      // 'process.env.GIT_VERSION': JSON.stringify(gitRevisionPlugin.version()), // Example: if full version string is needed
      // 'process.env.GIT_BRANCH': JSON.stringify(gitRevisionPlugin.branch()),    // Example: if branch name is needed
    })
  );

  // The custom-webpack builder for :application might pass targetOptions differently
  // or expect the original options to be preserved.
  // For now, we assume the `config` object is the one to modify and return.
  // If build/serve fails, we might need to inspect how options are passed for this builder version.

  return config;
};

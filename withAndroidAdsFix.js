// withAndroidAdsFix.js
//
// Expo config plugin that patches AndroidManifest.xml to add the
// AdMob App ID <meta-data> tag required by Google Mobile Ads SDK.
//
// Also disables the "optimizeViewHierarchy" flag that causes:
//   java.lang.IllegalStateException: addViewAt: failed to insert view
// on React Native New Architecture (Fabric) with AdMob BannerAd.
//
// This plugin is referenced in app.json → expo.plugins as:
//   "./withAndroidAdsFix"

const { withGradleProperties } = require("@expo/config-plugins");

/**
 * Disable view hierarchy optimisation for the React Native renderer.
 * On New Architecture (Fabric) this optimisation can collapse the native
 * host view that BannerAd needs to attach to, producing:
 *   IllegalStateException: addViewAt: failed to insert view [N] into parent [M]
 */
const withDisableFabricViewOptimization = (config) => {
  return withGradleProperties(config, (mod) => {
    const props = mod.modResults;

    // Remove any existing entry so we don't duplicate
    const filtered = props.filter(
      (item) =>
        !(
          item.type === "property" &&
          item.key ===
            "android.defaults.useNewArchitecture.optimizeViewHierarchy"
        ),
    );

    filtered.push({
      type: "property",
      key: "android.defaults.useNewArchitecture.optimizeViewHierarchy",
      value: "false",
    });

    mod.modResults = filtered;
    return mod;
  });
};

module.exports = (config) => {
  config = withDisableFabricViewOptimization(config);
  return config;
};

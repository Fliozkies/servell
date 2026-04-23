const { withAndroidManifest, withInfoPlist } = require("@expo/config-plugins");

const withGoogleMobileAds = (config, { androidAppId, iosAppId }) => {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // Ensure the tools namespace is declared so tools:replace works
    if (!manifest.$["xmlns:tools"]) {
      manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    }

    const mainApplication = manifest.application?.[0];
    if (mainApplication) {
      if (!mainApplication["meta-data"]) {
        mainApplication["meta-data"] = [];
      }

      // Remove any existing entries for this key to avoid duplicates
      mainApplication["meta-data"] = mainApplication["meta-data"].filter(
        (item) =>
          item.$?.["android:name"] !==
          "com.google.android.gms.ads.APPLICATION_ID",
      );

      // Add the APPLICATION_ID with tools:replace to override the library's empty default
      mainApplication["meta-data"].push({
        $: {
          "android:name": "com.google.android.gms.ads.APPLICATION_ID",
          "android:value": androidAppId,
          "tools:replace": "android:value",
        },
      });
    }
    return config;
  });

  config = withInfoPlist(config, (config) => {
    config.modResults.GADApplicationIdentifier = iosAppId;
    return config;
  });

  return config;
};

module.exports = withGoogleMobileAds;

module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }], // ← important for JSX transform
      "nativewind/babel", // ← now as preset, not plugin
    ],
    // plugins: []   ← usually leave empty or add others here if needed
  };
};

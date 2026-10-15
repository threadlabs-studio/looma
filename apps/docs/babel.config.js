module.exports = {
  presets: [require.resolve("@docusaurus/core/lib/babel/preset")],
  // Component controllers and the Vue editor spread native iterables (Set, Map), not only arrays.
  overrides: [{
    test: /packages[\\/]looma[\\/](components|vue)[\\/]/,
    assumptions: { iterableIsArray: false }
  }]
};

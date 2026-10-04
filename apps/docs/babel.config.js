module.exports = {
  presets: [require.resolve("@docusaurus/core/lib/babel/preset")],
  // Component controllers spread native iterables (including Set), not only arrays.
  overrides: [{
    test: /packages[\\/]looma[\\/]components[\\/]/,
    assumptions: { iterableIsArray: false }
  }]
};

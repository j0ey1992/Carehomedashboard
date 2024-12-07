module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
  },
  plugins: [
    "@typescript-eslint"
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": ["warn", {
      "argsIgnorePattern": "^_|^context$"
    }],
    "no-unused-vars": "off"
  },
  ignorePatterns: [
    "/lib/**/*",
    "*.d.ts",
    ".eslintrc.js"
  ]
};

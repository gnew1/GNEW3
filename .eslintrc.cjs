/** @type {import('eslint').Linter.Config} */ 
module.exports = { 
  root: true, 
  ignorePatterns: ["**/dist/**", "**/out/**", "**/typechain-types/**", 
"**/coverage/**"], 
  parser: "@typescript-eslint/parser", 
  plugins: ["@typescript-eslint"], 
  extends: ["eslint:recommended", 
"plugin:@typescript-eslint/recommended", "prettier"], 
  rules: {
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "error"
  }
};
 

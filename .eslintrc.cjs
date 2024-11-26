/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  root: true,
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier/skip-formatting',
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  rules: {
    'no-var': 'error',
    semi: 'error',
    'no-undef': 'off',
    'space-before-function-paren': 0
  }
}

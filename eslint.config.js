import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Rule 1 (channels only): games may import only engine/api and their own files,
// and may never touch a canvas context, the DOM or a raw colour property.
// esquery regex literals cannot contain a slash, so "[.]" and "\x2F" are used.
const SLASH = '\\x2F';
const gameImportRule = {
  selector: `ImportDeclaration[source.value!=/^([.]${SLASH}[^.].*|([.][.]${SLASH})+engine${SLASH}api|vitest)$/]`,
  message: 'Games may import only from engine/api and their own folder (hard rule 1).',
};
const bannedIdentifiers = {
  selector:
    'Identifier[name=/^(fillStyle|strokeStyle|getContext|shadowColor|createLinearGradient|createRadialGradient|CanvasRenderingContext2D|document)$/]',
  message: 'Games draw only through the channel Renderer (hard rule 1).',
};

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', '.claude/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/games/**/*.ts'],
    rules: { 'no-restricted-syntax': ['error', gameImportRule, bannedIdentifiers] },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
        URL: 'readonly',
      },
    },
  },
);

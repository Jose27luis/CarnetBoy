import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const noComments = {
  meta: {
    type: 'problem',
    messages: {
      forbidden: 'El código no lleva comentarios; los nombres deben explicar la intención.',
    },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (comment.type === 'Shebang') {
            continue;
          }
          context.report({ loc: comment.loc, messageId: 'forbidden' });
        }
      },
    };
  },
};

export const carnetPlugin = {
  rules: {
    'no-comments': noComments,
  },
};

export const sharedRules = {
  'carnet/no-comments': 'error',
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/ban-ts-comment': [
    'error',
    { 'ts-ignore': true, 'ts-expect-error': true, 'ts-nocheck': true },
  ],
  '@typescript-eslint/explicit-module-boundary-types': 'error',
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
};

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.next/**', '**/.turbo/**', 'apps/web/**', '**/*.mjs'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      carnet: carnetPlugin,
    },
    rules: sharedRules,
  },
);

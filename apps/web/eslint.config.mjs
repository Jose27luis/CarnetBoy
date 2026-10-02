import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import tseslint from 'typescript-eslint';
import { carnetPlugin, sharedRules } from '../../eslint.config.mjs';

export default tseslint.config(
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', '*.mjs'],
  },
  ...nextVitals,
  ...nextTypescript,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      react: { version: '19.2' },
    },
    plugins: {
      carnet: carnetPlugin,
    },
    rules: {
      ...sharedRules,
      'react/jsx-no-useless-fragment': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='placeholder']",
          message: 'Sin placeholder: usa un label visible y, si hace falta, un texto de ayuda.',
        },
      ],
    },
  },
);

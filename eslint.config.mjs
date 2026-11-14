import { lintConfig } from 'tsm-utils/lint';

const newConfig = lintConfig.map(rule => ({
  ...rule,
  ignores: ['src/**/migrations/**'],
}));

export default [
  ...newConfig,
  {
    rules: {
      'consistent-type-imports': 'off',
      'ts/consistent-type-imports': 'off',
    },
  },
    {
        files: ['**/layout.tsx', '**/page.tsx', '**/not-found.ts', '**.config.**', '**/reportWebVitals.ts', 'tailwind.config**', 'next.config**', '**/config/**'],
        rules: {
            'import/no-default-export': 'off',
        },
    },
];

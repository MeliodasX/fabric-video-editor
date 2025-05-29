import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.config({
    extends: [
      'next',
      'next/core-web-vitals',
      'next/typescript',
      'plugin:prettier/recommended',
    ],
    plugins: ['prettier'],
    rules: {
      'prettier/prettier': [
        'warn',
        {
          usePrettierrc: true,
        },
      ],
      'react/react-in-jsx-scope': 'off',
    },
  }),
]


export default eslintConfig;

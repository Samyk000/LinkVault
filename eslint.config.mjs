import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "dist/**",
      "components/ui/**",
      "*.config.*",
      "next-env.d.ts",
    ],
  },
  ...compat.config({
    extends: ["next/core-web-vitals", "next/typescript"],
  }),
  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      // React specific rules - Critical errors only
      "react/no-unescaped-entities": "error",
      "react/jsx-key": "error",
      
      // Next.js specific rules
      "@next/next/no-img-element": "error",
      
      // TypeScript specific rules - Turn off strict warnings
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/triple-slash-reference": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-this-alias": "off",
      
      // General code quality rules - Keep minimal
      "no-console": "off",
      "prefer-const": "off",
      "curly": "off",
    },
  },
];

export default eslintConfig;

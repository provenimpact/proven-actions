import { defineConfig } from "rollup";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";

export default defineConfig({
  input: "src/main.ts",
  output: {
    file: "dist/index.js",
    format: "esm",
    sourcemap: true,
  },
  plugins: [
    typescript({
      tsconfig: "./tsconfig.json",
      // Override outDir so rollup controls the output
      compilerOptions: {
        outDir: undefined,
        declaration: false,
        declarationMap: false,
      },
    }),
    nodeResolve({
      preferBuiltins: true,
      exportConditions: ["node", "import", "default"],
    }),
    commonjs(),
  ],
});

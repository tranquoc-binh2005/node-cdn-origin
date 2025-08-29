import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default [
  // ES Module build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      nodeResolve(),
      commonjs(),
      terser()
    ],
    external: ['express', 'multer', 'sharp']
  },
  
  // CommonJS build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
      sourcemap: true
    },
    plugins: [
      nodeResolve(),
      commonjs(),
      terser()
    ],
    external: ['express', 'multer', 'sharp']
  }
];

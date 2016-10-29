// Rollup plugins
import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
    entry: 'lib/dom/index.js',
    dest: 'dist/ghostworker-dom.js',
    format: 'umd',
    moduleName: 'GhostWorkerDOM',
    sourceMap: true,
    plugins: [
        resolve({
            jsnext: true,
            main: true,
            browser: true,
        }),
        commonjs(),
        babel({
            exclude: 'node_modules/**',
        }),
    ]
}
/* eslint-env node */

'use strict';

const { dest, parallel, series, src, task } = require('gulp');

async function bundle(inputPath, outputPath, format)
{
    const { homepage, version } = require('./package.json');
    const rollup                = require('rollup');

    const inputOptions = { input: inputPath };
    const bundle = await rollup.rollup(inputOptions);
    const outputOptions =
    {
        banner: `// Polytype ${version} – ${homepage}\n`,
        esModule: false,
        file: outputPath,
        format,
    };
    await bundle.write(outputOptions);
}

function minify(srcGlobs, extname)
{
    const rename = require('gulp-rename');
    const terser = require('gulp-terser');

    const minifyOpts =
    {
        compress: { hoist_funs: true, passes: 2 },
        output: { comments: (node, comment) => comment.pos === 0 },
    };
    const stream =
    src(srcGlobs).pipe(terser(minifyOpts)).pipe(rename({ extname })).pipe(dest('lib'));
    return stream;
}

task
(
    'clean',
    async () =>
    {
        const del = require('del');

        await del(['.nyc_output', 'coverage', 'lib/**/*', 'readme.md']);
    },
);

task
(
    'make-ts-defs',
    async () =>
    {
        const { promises: { readFile, writeFile } } = require('fs');
        const Handlebars                            = require('handlebars');

        async function writeOutput(outputPath, asModule)
        {
            const output = template({ asModule });
            await writeFile(outputPath, output);
        }

        const input = String(await readFile('src/polytype.d.ts.hbs'));
        const template = Handlebars.compile(input, { noEscape: true });
        const promises =
        [
            writeOutput('lib/polytype-global.d.ts', false),
            writeOutput('lib/polytype-module.d.ts', true),
        ];
        await Promise.all(promises);
    },
);

task
(
    'lint',
    () =>
    {
        const lint = require('gulp-fasttime-lint');

        const stream =
        lint
        (
            {
                src: 'src/**/*.{js,mjs}',
                globals: ['global', 'self'],
                parserOptions: { ecmaVersion: 8, sourceType: 'module' },
            },
            {
                src: 'lib/**/*.d.ts',
                parserOptions: { project: 'tsconfig.json' },
                rules: { 'max-len': 'off' },
            },
            {
                src: ['*.js', 'test/**/*.js', '!**/_*'],
                parserOptions: { ecmaVersion: 8 },
            },
            {
                src: 'example/**/*.{js,ts}',
                envs: 'node',
                globals: ['classes', 'console'],
                parserOptions: { ecmaVersion: 7, project: 'tsconfig.json', sourceType: 'module' },
                rules:
                {
                    '@typescript-eslint/unbound-method':    'off',
                    'brace-style':                          'off',
                    'no-unused-vars':
                    ['error', { varsIgnorePattern: '^(?:Green|WhiteUnit)Circle$' }],
                    'quotes':                               ['error', 'double'],
                },
            },
        );
        return stream;
    },
);

task('bundle:cjs', () => bundle('src/polytype-esm.js', 'lib/polytype.cjs', 'cjs'));

task('bundle:esm', () => bundle('src/polytype-esm.js', 'lib/polytype.mjs', 'esm'));

task('bundle:global', () => bundle('src/polytype-global.js', 'lib/polytype.js', 'iife'));

task('minify:esm', () => minify('lib/polytype.mjs', '.min.mjs'));

task('minify:global', () => minify('lib/polytype.js', '.min.js'));

task
(
    'test',
    callback =>
    {
        const { fork } = require('child_process');

        const { resolve } = require;
        const nycPath = resolve('nyc/bin/nyc');
        const modulePath = resolve('./test/node-spec-runner');
        const childProcess =
        fork
        (
            nycPath,
            ['--extension=.cjs', '--reporter=html', '--reporter=text-summary', '--', modulePath],
        );
        childProcess.on('exit', code => callback(code && 'Test failed'));
    },
);

task
(
    'make-toc',
    async () =>
    {
        const { version }                           = require('./package.json');
        const { promises: { readFile, writeFile } } = require('fs');
        const Handlebars                            = require('handlebars');
        const toc                                   = require('markdown-toc');

        const input = String(await readFile('src/readme.md.hbs'));
        const { content } = toc(input, { firsth1: false });
        const template = Handlebars.compile(input, { noEscape: true });
        const output = template({ toc: content, version });
        await writeFile('readme.md', output);
    },
);

task
(
    'default',
    series
    (
        'clean',
        'make-ts-defs',
        'lint',
        parallel
        (
            'bundle:cjs',
            series('bundle:esm', 'minify:esm'),
            series('bundle:global', 'minify:global'),
        ),
        'test',
        'make-toc',
    ),
);

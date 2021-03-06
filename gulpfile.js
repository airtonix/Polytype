/* eslint-env node */

'use strict';

const { parallel, series, task } = require('gulp');

{ // Suppress deprecation warning DEP0097
    const { emitWarning } = process;
    process.emitWarning =
    (warning, type, code, ...extraArgs) =>
    {
        if (code !== 'DEP0097')
            emitWarning(warning, type, code, ...extraArgs);
    };
}

async function bundle(inputPath, format, outputPath, outputPathMin)
{
    const { homepage, version } = require('./package.json');
    const { rollup }            = require('rollup');
    const cleanup               = require('rollup-plugin-cleanup');

    function addOutput(file, compact, plugins)
    {
        const outputOptions =
        {
            banner: `// Polytype ${version} – ${homepage}\n`,
            compact,
            esModule: false,
            file,
            format,
            plugins,
        };
        const promise = bundle.write(outputOptions);
        outputPromises.push(promise);
    }

    const cleanupPlugin = cleanup({ maxEmptyLines: -1 });
    const inputOptions = { input: inputPath, plugins: [cleanupPlugin] };
    const bundle = await rollup(inputOptions);
    const outputPromises = [];
    addOutput(outputPath);
    if (outputPathMin != null)
    {
        const { terser } = require('rollup-plugin-terser');

        const minifyOpts =
        {
            compress: { hoist_funs: true, passes: 2 },
            output: { comments: (node, comment) => comment.pos === 0 },
        };
        const terserPlugin = terser(minifyOpts);
        addOutput(outputPathMin, true, [terserPlugin]);
    }
    await Promise.all(outputPromises);
}

function readFileAsString(inputPath)
{
    const { promises: { readFile } } = require('fs');

    const promise = readFile(inputPath, 'utf8');
    return promise;
}

task
(
    'clean',
    async () =>
    {
        const { promises: { rmdir } } = require('fs');

        const paths = ['coverage', 'lib', 'readme.md', 'test/spec-runner.html'];
        const options = { recursive: true };
        await Promise.all(paths.map(path => rmdir(path, options)));
    },
);

task
(
    'make-ts-defs',
    async () =>
    {
        const { version }                           = require('./package.json');
        const { promises: { mkdir, writeFile } }    = require('fs');
        const Handlebars                            = require('handlebars');

        async function writeOutput(outputPath, asModule)
        {
            const output = template({ asModule, version });
            await writeFile(outputPath, output);
        }

        const mkdirPromise = mkdir('lib', { recursive: true });
        const input = await readFileAsString('src/polytype.d.ts.hbs');
        const template = Handlebars.compile(input, { noEscape: true });
        await mkdirPromise;
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
        const lint = require('@fasttime/gulp-lint');

        const stream =
        lint
        (
            {
                src: 'src/**/*.{js,mjs}',
                parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
                rules: { 'prefer-named-capture-group': 'off' },
            },
            {
                src: 'lib/**/*.d.ts',
                parserOptions: { ecmaVersion: 2020, project: 'tsconfig.json' },
                rules: { 'max-len': 'off' },
            },
            {
                src: ['*.js', 'test/**/*.js'],
                parserOptions: { ecmaVersion: 2020 },
            },
            {
                src: 'example/**/*.{js,ts}',
                envs: 'node',
                globals: ['classes'],
                parserOptions:
                { ecmaVersion: 2020, project: 'tsconfig.json', sourceType: 'module' },
                rules:
                {
                    'brace-style':  'off',
                    'comma-dangle':
                    [
                        'error',
                        {
                            'arrays':       'always-multiline',
                            'objects':      'always-multiline',
                            'imports':      'always-multiline',
                            'exports':      'always-multiline',
                            'functions':    'only-multiline',
                        },
                    ],
                    'no-unused-vars':
                    ['error', { varsIgnorePattern: '^(?:Green|WhiteUnit)Circle$' }],
                    'quotes':       ['error', 'double'],
                },
            },
        );
        return stream;
    },
);

task('bundle:cjs', () => bundle('src/polytype-esm.js', 'cjs', 'lib/polytype.cjs'));

task
(
    'bundle:esm',
    () => bundle('src/polytype-esm.js', 'esm', 'lib/polytype.mjs', 'lib/polytype.min.mjs'),
);

task
(
    'bundle:global',
    () => bundle('src/polytype-global.js', 'iife', 'lib/polytype.js', 'lib/polytype.min.js'),
);

task
(
    'test',
    callback =>
    {
        const { fork } = require('child_process');

        const { resolve } = require;
        const c8Path = resolve('c8/bin/c8');
        const modulePath = resolve('./test/node-spec-runner');
        const childProcess =
        fork
        (
            c8Path,
            ['--reporter=html', '--reporter=text-summary', modulePath],
            { execArgv: ['--require=./test/patch-cov-source'] },
        );
        childProcess.on('exit', code => callback(code && 'Test failed'));
    },
);

task
(
    'make-spec-runner',
    async () =>
    {
        const { promises: { readdir, writeFile } }  = require('fs');
        const Handlebars                            = require('handlebars');
        const { extname }                           = require('path');

        async function getSpecs()
        {
            const filenames = await readdir('test/spec/common');
            const specs = filenames.filter(filename => extname(filename) === '.js').sort();
            return specs;
        }

        async function getTemplate()
        {
            const input = await readFileAsString('src/spec-runner.html.hbs');
            const template = Handlebars.compile(input);
            return template;
        }

        const promises = [getTemplate(), getSpecs()];
        const [template, specs] = await Promise.all(promises);
        const output = template({ specs });
        await writeFile('test/spec-runner.html', output);
    },
);

task
(
    'make-toc',
    async () =>
    {
        const { version }                           = require('./package.json');
        const { promises: { chmod, writeFile } }    = require('fs');
        const Handlebars                            = require('handlebars');
        const toc                                   = require('markdown-toc');

        const promises =
        [
            readFileAsString('src/readme.md.hbs'),
            chmod('readme.md', 0o666)
            .catch
            (
                reason =>
                {
                    if (reason.code !== 'ENOENT')
                        throw reason;
                },
            ),
        ];
        const [input] = await Promise.all(promises);
        const { content } = toc(input, { firsth1: false });
        const template = Handlebars.compile(input, { noEscape: true });
        const output = template({ toc: content, version });
        await writeFile('readme.md', output, { mode: 0o444 });
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
        parallel('bundle:cjs', 'bundle:esm', 'bundle:global'),
        'test',
        parallel('make-spec-runner', 'make-toc'),
    ),
);

task
(
    'build',
    series
    (
        'make-ts-defs',
        parallel('bundle:cjs', 'bundle:esm', 'bundle:global'),
        parallel('make-spec-runner', 'make-toc'),
    ),
);

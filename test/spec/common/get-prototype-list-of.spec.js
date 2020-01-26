/* eslint-env mocha */
/*
global
assert,
classes,
createDeceptiveObject,
createNullPrototypeFunction,
document,
maybeIt,
newRealm,
*/

'use strict';

describe
(
    'getPrototypeListOf',
    () =>
    {
        function testGetPrototypeListOf(obj, expected)
        {
            const actual = Object.getPrototypeListOf(obj);
            assert.deepEqual(actual, expected);
            assert.notStrictEqual
            (
                Object.getPrototypeListOf(obj),
                actual,
                'Multiple invocations of Object.getPrototypeListOf should not return the same ' +
                'object.',
            );
        }

        it
        (
            'has expected own properties',
            () =>
            {
                assert.hasOwnPropertyDescriptors
                (
                    Object.getPrototypeListOf,
                    {
                        length:
                        {
                            configurable: true,
                            enumerable: false,
                            value: 1,
                            writable: false,
                        },
                        name:
                        {
                            configurable: true,
                            enumerable: false,
                            value: 'getPrototypeListOf',
                            writable: false,
                        },
                    },
                );
                assert.isEmpty(Object.getOwnPropertySymbols(Object.getPrototypeListOf));
            },
        );

        it
        (
            'cannot be called with new',
            () =>
            assert.throwsTypeError
            // eslint-disable-next-line new-cap
            (() => new Object.getPrototypeListOf(), /\bis not a constructor\b/),
        );

        it
        (
            'returns a new empty array if an object has null prototype',
            () => testGetPrototypeListOf({ __proto__: null }, []),
        );

        it
        (
            'returns a one element array if an object has a non-null prototype',
            () => testGetPrototypeListOf({ }, [Object.prototype]),
        );

        it
        (
            'returns the prototype of a multiple inheritance instance',
            () =>
            {
                class A
                { }

                class B
                { }

                class C extends classes(A, B)
                { }

                testGetPrototypeListOf(new C(), [C.prototype]);
            },
        );

        it
        (
            'returns a new empty array for a clustered constructor',
            () =>
            {
                const A =
                class
                { };
                const B =
                class
                { };
                const _AB = classes(A, B);
                testGetPrototypeListOf(_AB, []);
            },
        );

        it
        (
            'returns a new empty array for a clustered prototype',
            () =>
            {
                const A =
                class
                { };
                const B =
                class
                { };
                const _AB = classes(A, B);
                testGetPrototypeListOf(_AB.prototype, []);
            },
        );

        describe
        (
            'returns the prototypes of a multiple inheritance constructor',
            () =>
            {
                function test(classes)
                {
                    class A
                    { }

                    class B
                    { }

                    class C extends classes(A, B)
                    { }

                    testGetPrototypeListOf(C, [A, B]);
                }

                it('in the same realm', () => test(classes));

                it
                (
                    'in another realm',
                    async () =>
                    {
                        const { classes: classesʼ } = await newRealm(true);
                        test(classesʼ);
                    },
                );
            },
        );

        describe
        (
            'returns all prototypes of a multiple inheritance prototype excluding null and ' +
            'duplicates',
            () =>
            {
                function test(classes)
                {
                    const A =
                    class
                    { };
                    const B = createNullPrototypeFunction();
                    const C =
                    class
                    { };
                    const D = Function();
                    D.prototype = A.prototype;
                    const ABCD =
                    class extends classes(A, B, C, D)
                    { };
                    testGetPrototypeListOf(ABCD.prototype, [A.prototype, C.prototype]);
                }

                it('in the same realm', () => test(classes));

                it
                (
                    'in another realm',
                    async () =>
                    {
                        const { classes: classesʼ } = await newRealm(true);
                        test(classesʼ);
                    },
                );
            },
        );

        maybeIt
        (
            typeof document !== 'undefined',
            'returns a one element array if an object has document.all for prototype',
            () => testGetPrototypeListOf({ __proto__: document.all }, [document.all]),
        );

        it
        (
            'throws a TypeError with null',
            () => assert.throwsTypeError(() => Object.getPrototypeListOf(null)),
        );

        it
        (
            'throws a TypeError with a deceptive object',
            ()  =>
            {
                const obj = createDeceptiveObject();
                assert.throwsTypeError
                (() => Object.getPrototypeListOf(obj), 'Corrupt prototype list');
            },
        );
    },
);

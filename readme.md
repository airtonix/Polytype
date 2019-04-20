# Proxymi · [![npm version][npm badge]][npm url]

**Proxy-based multiple inheritance for JavaScript and TypeScript. Without mixins.**

**Proxymi** is a library that adds support for dynamic
[multiple inheritance](https://en.wikipedia.org/wiki/Multiple_inheritance) to JavaScript and
TypeScript with a simple syntax.
“Dynamic” means that changes to base classes at runtime are reflected immediately in all derived
classes just like programmers would expect when working with single prototype inheritance.

Proxymi uses
[proxies](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
along with other relatively new language features to provide multiple inheritance.
Some of these features are not yet well supported in all browsers.
As of today, Proxymi runs in **current versions of Chrome, Firefox,
Safari<sup>[[*notes*](#compatibility "Safari is only partially supported. See the Compatibility
section for details.")]</sup>, Opera and in Node.js**.
As JavaScript support in other browsers improves, Proxymi will start to run in those browsers, too.

- [Features](#features)
- [Setup Instructions](#setup-instructions)
  * [As a vanilla script](#as-a-vanilla-script)
  * [As a module](#as-a-module)
- [Usage](#usage)
  * [Inheriting from multiple base classes](#inheriting-from-multiple-base-classes)
  * [Using methods and accessors from multiple base classes](#using-methods-and-accessors-from-multiple-base-classes)
  * [Static methods and accessors](#static-methods-and-accessors)
  * [Invoking multiple base constructors](#invoking-multiple-base-constructors)
  * [`instanceof`](#instanceof)
  * [`in`](#in)
  * [`isPrototypeOf`](#isprototypeof)
  * [Dynamic base class changes](#dynamic-base-class-changes)
- [TypeScript support](#typescript-support)
- [Compatibility](#compatibility)

## Features

* C++ style multiple inheritance
* Works in Node.js and in most browsers
* Full TypeScript support
* Zero dependencies
* Qualified or unqualified access to all base class features
  * constructors
  * methods, getters and setters – both static and nonstatic
  * value properties on base classes and base instance prototypes
* `in`, `instanceof` and `isPrototypeOf` integration

## Setup Instructions

### As a vanilla script

In an HTML-based application Proxymi can be embedded as a plain JavaScript library.
Just download [proxymi.js](https://raw.githubusercontent.com/fasttime/Proxymi/master/lib/proxymi.js)
or [proxymi.min.js](https://raw.githubusercontent.com/fasttime/Proxymi/master/lib/proxymi.min.js)
from GitHub and include it in your HTML file.

```html
<script src="proxymi.min.js"></script>
```

Alternatively, you can hotlink the current stable version using a CDN of your choice.

```html
<script src="https://gitcdn.xyz/repo/fasttime/Proxymi/master/lib/proxymi.min.js"></script>
```

### As a module

If you are using Node.js, you can install Proxymi with [npm](https://www.npmjs.org).

```console
npm install proxymi
```

Then you can import it in your code like any dependency.

```js
require("proxymi"); // CommonJS syntax
```
or
```js
import "proxymi"; // ECMAScript module syntax
```

In TypeScript you can also import certain types where necessary.

```ts
import { SuperConstructorInvokeInfo } from "proxymi";
```

If you are not using TypeScript or don’t need to explicitly reference any exported types, you only
need to add a single import statement in a central location in your code.

## Usage

### Inheriting from multiple base classes

For example, declare a derived class `ColoredCircle` that inherits from both base classes `Circle`
and `ColoredObject`.

```js
class Circle
{
    constructor(centerX, centerY, radius)
    {
        this.moveTo(centerX, centerY);
        this.radius = radius;
    }
    get diameter() { return this.radius * 2; }
    set diameter(diameter) { this.radius = diameter / 2; }
    moveTo(centerX, centerY)
    {
        this.centerX = centerX;
        this.centerY = centerY;
    }
    toString()
    {
        return `circle with center (${this.centerX}, ${this.centerY}) and radius ${this.radius}`;
    }
}

class ColoredObject
{
    constructor(color) { this.color = color; }
    static areSameColor(obj1, obj2) { return obj1.color === obj2.color; }
    paint() { console.log(`painting in ${this.color}`); }
    toString() { return `${this.color} object`; }
}

class ColoredCircle
extends classes(Circle, ColoredObject) // Base classes as comma-separated params
{
    // Add methods here.
}
```

### Using methods and accessors from multiple base classes

```js
const c = new ColoredCircle();

c.moveTo(42, 31);
c.radius = 1;
c.color = "red";
console.log(c.centerX, c.centerY);  // 42, 31
console.log(c.diameter);            // 2
c.paint();                          // "painting in red"
```

As usual, the keyword `super` invokes a base class method or accessor when used inside a derived
class.

```js
class ColoredCircle
extends classes(Circle, ColoredObject)
{
    paint()
    {
        super.paint(); // Using method paint from some base class
    }
}
```

If different base classes include a method or accessor with the same name, the syntax
```js
super.class(DirectBaseClass).methodOrAccessor
```
can be used to make the invocation unambiguous.

```js
class ColoredCircle
extends classes(Circle, ColoredObject)
{
    toString()
    {
        // Using method toString from base class Circle
        const circleString = super.class(Circle).toString();
        return `${circleString} in ${this.color}`;
    }
}
```

### Static methods and accessors

Static methods and accessors are inherited, too.

```js
ColoredCircle.areSameColor(c1, c2)
```
same as
```js
ColoredObject.areSameColor(c1, c2)
```

### Invoking multiple base constructors

Use arrays to group together parameters for each base constructor in the derived class constructor.

```js
class ColoredCircle
extends classes(Circle, ColoredObject)
{
    constructor(centerX, centerY, radius, color)
    {
        super
        (
            [centerX, centerY, radius], // Circle constructor params
            [color]                     // ColoredObject constructor params
        );
    }
}
```

If you prefer to keep parameter lists associated to their base classes explicitly without relying on
order, there is an alternative syntax.

```js
class GreenCircle
extends classes(Circle, ColoredObject)
{
    constructor(centerX, centerY, radius)
    {
        super
        (
            { super: ColoredObject, arguments: ["green"] },
            { super: Circle, arguments: [centerX, centerY, radius] }
        );
    }
}
```

There is no need to specify an array of parameters for each base constructor.
If the parameter arrays are omitted, the base constructors will still be invoked without parameters.

```js
class WhiteUnitCircle
extends classes(Circle, ColoredObject)
{
    constructor()
    {
        super(); // Base constructors invoked without parameters
        this.centerX    = 0;
        this.centerY    = 0;
        this.radius     = 1;
        this.color      = "white";
    }
}
```

### `instanceof`

The `instanceof` operator works just like it should.

```js
const c = new ColoredCircle();

console.log(c instanceof Circle);           // true
console.log(c instanceof ColoredObject);    // true
console.log(c instanceof ColoredCircle);    // true
console.log(c instanceof Object);           // true
console.log(c instanceof Array);            // false
```

In pure JavaScript, the expression
```js
B.prototype instanceof A
```
determines if `A` is a base class of class `B`.

Proxymi takes care that this test still works well with multiple inheritance.

```js
console.log(ColoredCircle.prototype instanceof Circle);         // true
console.log(ColoredCircle.prototype instanceof ColoredObject);  // true
console.log(ColoredCircle.prototype instanceof ColoredCircle);  // false
console.log(ColoredCircle.prototype instanceof Object);         // true
console.log(Circle.prototype instanceof ColoredObject);         // false
```

### `in`

The `in` operator determines whether a property is in an object or in its prototype chain.
In the case of multiple inheritance, the prototype “chain” looks more like a directed graph, yet the
function of the `in` operator is the same.

```js
const c = new ColoredCircle();

console.log("moveTo" in c); // true
console.log("paint" in c);  // true
```

```js
console.log("areSameColor" in ColoredCircle);   // true
console.log("areSameColor" in Circle);          // false
console.log("areSameColor" in ColoredObject);   // true
```

### `isPrototypeOf`

`isPrototypeOf` works fine, too.

```js
const c = new ColoredCircle();

console.log(Circle.prototype.isPrototypeOf(c));         // true
console.log(ColoredObject.prototype.isPrototypeOf(c));  // true
console.log(ColoredCircle.prototype.isPrototypeOf(c));  // true
console.log(Object.prototype.isPrototypeOf(c));         // true
console.log(Array.prototype.isPrototypeOf(c));          // false
```

```js
console.log(Circle.isPrototypeOf(ColoredCircle));               // true
console.log(ColoredObject.isPrototypeOf(ColoredCircle));        // true
console.log(ColoredCircle.isPrototypeOf(ColoredCircle));        // false
console.log(Object.isPrototypeOf(ColoredCircle));               // false
console.log(Function.prototype.isPrototypeOf(ColoredCircle));   // true
```

### Dynamic base class changes

If a property in a base class is added, removed or modified at runtime, the changes are immediately
reflected in all derived classes. This is the magic of proxies.

```js
const c = new ColoredCircle();

Circle.prototype.sayHello = () => console.log("Hello!");
c.sayHello(); // "Hello!"
```

## TypeScript support

Proxymi has built-in TypeScript support: you can take advantage of type checking while working with
multiple inheritance without installing any additional packages.
If you are using an IDE that supports TypeScript code completion like Visual Studio Code, you will
get multiple inheritance sensitive suggestions as you type.

## Compatibility

Proxymi was successfully tested in the following browsers / JavaScript engines.

* Chrome 54+
* Firefox 51+
* Safari 11 *(Partial support. See notes below.)*
* Opera 41+
* Node.js 8+

The minimum supported TypeScript version is 3.4.

Because of poor ECMAScript compliance, Safari accepts non-constructor functions (such as arrow
functions, generators, etc.) as arguments to
`classes`,<sup>[[*issue*](https://bugs.webkit.org/show_bug.cgi?id=193057)]</sup> although it does
not allow instantiating classes derived from such functions.
Also, Safari does not throw a `TypeError` when attempting to assign to a read-only property of a
Proxymi class or object in strict
mode.<sup>[[*issue*](https://bugs.webkit.org/show_bug.cgi?id=177398)]</sup>

In the current version of Edge, the JavaScript engine Chakra has
[a serious bug](https://github.com/Microsoft/ChakraCore/issues/5883) that can produce incorrect
results when the `instanceof` operator is used with bound functions after Proxymi has been loaded.
For this reason it is recommended not to use Proxymi in Edge as long as this issue persists.

[npm badge]: https://badge.fury.io/js/proxymi.svg
[npm url]: https://www.npmjs.com/package/proxymi

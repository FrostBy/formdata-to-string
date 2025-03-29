# formdata-to-string-frontend

Transform a [FormData](https://developer.mozilla.org/en-US/docs/Web/API/FormData) instance into a raw string.

[![Build](https://github.com/frostby/formdata-to-string/workflows/CI/badge.svg)](https://github.com/frostby/formdata-to-string/) [![](https://img.shields.io/npm/v/formdata-to-string-frontend)](https://npm.im/formdata-to-string-frontend)

## Installation

```sh
npm install --save formdata-to-string-frontend
```

## Usage

This library is built up of internal methods from within Node's internal `fetch` library, [undici](https://github.com/nodejs/undici) for transforming a `FormData` instance into something that can be supplied in a `fetch` request. The purpose of this is to silo the conversion and stream reading aspect of that process so that output can be used in other methods (eg. unit testing, [code snippet generation](https://npm.im/@readme/httpsnippet), etc.).

```js
import formDataToString from 'formdata-to-string-frontend';
// const { default: formDataToString } = require('formdata-to-string-frontend');

const form = new FormData();
form.append('dog', 'buster');
form.append('age', '18');

console.log(await formDataToString(form));
```

```
------formdata-undici-089527285518
Content-Disposition: form-data; name="dog"

buster
------formdata-undici-089527285518
Content-Disposition: form-data; name="age"

18
------formdata-undici-089527285518--
```

It also supports `File` and `Blob` objects that can be supplied to the `FormData` API:

```js
const form = new FormData();

const dataURL = 'data:image/png;name=owlbert.png;base64,iVBORw0KGgo...';
form.append('image', new Blob([dataURL], { type: 'image/png' }), 'owlbert.png');

console.log(await formDataToString(form));
```

```
------formdata-undici-075655755345
Content-Disposition: form-data; name="image"; filename="owlbert.png"
Content-Type: image/png

data:image/png;name=owlbert.png;base64,iVBORw0KGgo...
------formdata-undici-075655755345--
```

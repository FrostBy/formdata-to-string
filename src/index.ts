interface Options {
  /**
   * A custom boundary to use in your generated FormData string. Will default to an internal
   * `undici` identifying boundary if not supplied.
   */
  boundary?: string;
}

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  return new Response(stream).text();
}

function extractBody(object: FormData, opts?: Options) {
  let length: number | null = 0;

  const boundary = opts?.boundary
    ? opts.boundary
    : `----formdata-undici-0${`${Math.floor(Math.random() * 1e11)}`.padStart(11, '0')}`;
  const prefix = `--${boundary}\r\nContent-Disposition: form-data`;

  /*! formdata-polyfill. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> */
  const escape = (str: string) => str.replace(/\n/g, '%0A').replace(/\r/g, '%0D').replace(/"/g, '%22');
  const normalizeLinefeeds = (value: string) => value.replace(/\r?\n|\r/g, '\r\n');

  const enc = new TextEncoder();
  const blobParts = [];
  const rn = new Uint8Array([13, 10]); // '\r\n'
  let hasUnknownSizeValue = false;

  Array.from(object.entries()).forEach(([name, value]) => {
    if (typeof value === 'string') {
      const chunk = enc.encode(
        `${prefix}; name="${escape(normalizeLinefeeds(name))}"\r\n\r\n${normalizeLinefeeds(value)}\r\n`,
      );
      blobParts.push(chunk);
      length += chunk.byteLength;
    } else {
      const chunk = enc.encode(
        `${prefix}; name="${escape(normalizeLinefeeds(name))}"${
          value.name ? `; filename="${escape(value.name)}"` : ''
        }\r\nContent-Type: ${value.type || 'application/octet-stream'}\r\n\r\n`,
      );
      blobParts.push(chunk, value, rn);
      if (typeof value.size === 'number') {
        length += chunk.byteLength + value.size + rn.byteLength;
      } else {
        hasUnknownSizeValue = true;
      }
    }
  });

  const chunk = enc.encode(`--${boundary}--`);
  blobParts.push(chunk);
  length += chunk.byteLength;
  if (hasUnknownSizeValue) {
    length = null;
  }

  // eslint-disable-next-line func-names
  const action = async function* () {
    for (let i = 0; i < blobParts.length; i += 1) {
      const part = blobParts[i];
      if (part.stream) {
        yield* part.stream();
      } else {
        yield part;
      }
    }
  };

  const type = `multipart/form-data; boundary=${boundary}`;

  let iterator: AsyncIterableIterator<Uint8Array>;
  const stream = new ReadableStream({
    async start() {
      iterator = action()[Symbol.asyncIterator]();
    },
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        queueMicrotask(() => controller.close());
      } else {
        controller.enqueue(new Uint8Array(value));
      }
    },
    async cancel() {
      await iterator.return();
    },
  });

  return {
    body: {
      stream,
      length,
    },
    type,
  };
}

export default async function formDataToString(form: FormData, opts: Options = {}): Promise<string> {
  const {
    body: { stream },
  } = extractBody(form, opts);
  return streamToString(stream);
}

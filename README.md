# Scriptkiddie Source

## Usage

This source provides a JavaScript environment to build a connector catalog (`discover`) & execute
its runtime (`read`). Code supplied in both the `Catalog` and `JavaScript` fields is run in an
`async` function; the `JavaScript` script is provided helper functions for sending spec-compliant
messages.

> [!TIP]
> When saving the source in an Airbyte cloud environment, the web application firewall (WAF)
> can detect certain patterns in the code and block the request. If you encounter this issue, change
> the code slightly and try again. If the issue persists, both fields also support base64 encoded
> content which makes the process less great but keeps the functionality. You can use
> [base64decode.org](https://www.base64decode.org/) to quickly encode & decode your code.

### Helpers

The following are available to your code in the `JavaScript` field.

#### variables

- `config` - the passed configuration object
- `catalog` - the configured catalog
- `state` - optional, the starting state provided by the platform
- `process` - the node `process` object, useful for exiting with non-zero status codes

#### methods

| method               | syntax                                               | description                                                                                                   |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| getConfiguredStreams | `getConfiguredStreams()`                             | returns an array of `{ stream, syncMode, state? }` objects representing each configured stream                |
| getStreamConfig      | `getStreamConfig({ name, namespace? })`              | returns `{ syncMode, state? }` with the catalog-defined sync mode for the stream and a starting state, if any |
| emitRecord           | `emitRecord({ name, namespace? }, data)`             | emits a record containing `data` for the stream described by `name` and optionally `namespace`                |
| wait                 | `await wait(ms)`                                     | waits for `ms` milliseconds before continuing                                                                 |
| log                  | `log(msg)`                                           | logs a message                                                                                                |
| logError             | `logError(errorMsg)`                                 | logs an error message                                                                                         |
| emitGlobalState      | `emitGlobalState(globalState)`                       | emits a global state                                                                                          |
| emitStreamState      | `emitStreamState({ name, namespace? }, streamState)` | emits a stream state for the stream described by `name` and optionally `namespace`                            |
| emitStreamStatus     | `emitStreamStatus({ name, namespace? }, status)`     | emits a stream status for the stream described by `name` and optionally `namespace`                           |
| out                  | `out({ type: "...", })`                              | emits whatever object is passed to the platform                                                               |

### Templates

#### catalog

```javacript
const catalog = { streams: [] };
// generate a catalog with 10 streams
for (let i = 0; i < 10; i++) {
  catalog.streams.push({
    name: `stream_${i}`,

    "supported_sync_modes": [
      "full_refresh", "incremental"
    ],

    // "source_defined_cursor": true,
    // "default_cursor_field": [""],

    "json_schema": {
      "properties": {
        "value": {
          "type": "number",
        }
      }
    }
  });
}
return catalog;
```

#### runtime

**stream state**

```javascript
const RECORDS_TO_EMIT = 5;

for (const { stream, syncMode, state } of getConfiguredStreams()) {
	const streamDescriptor = { name: stream.name, namespace: stream.namespace };
	emitStreamStatus(streamDescriptor, "STARTED");
	emitStreamStatus(streamDescriptor, "RUNNING");

	const startingValue = syncMode === "incremental" && state ? state.value + 1 : 0;
	for (let i = 0; i < RECORDS_TO_EMIT; i++) {
		emitRecord({ name: stream.name }, { value: startingValue + i });
	}

	emitStreamState(streamDescriptor, { value: startingValue + RECORDS_TO_EMIT - 1 });

	emitStreamStatus(streamDescriptor, "COMPLETE");
}
```

**global state**

```javascript
const globalState = {};
const streamStates = [];

const RECORDS_TO_EMIT = 5;

for (const { stream, syncMode, state } of getConfiguredStreams()) {
	const streamDescriptor = { name: stream.name, namespace: stream.namespace };
	emitStreamStatus(streamDescriptor, "STARTED");
	emitStreamStatus(streamDescriptor, "RUNNING");

	const startingValue = syncMode === "incremental" && state ? state.value + 1 : 0;
	for (let i = 0; i < RECORDS_TO_EMIT; i++) {
		emitRecord({ name: stream.name }, { value: startingValue + i });
	}

	streamStates.push({ stream_descriptor: streamDescriptor, stream_state: { value: startingValue + RECORDS_TO_EMIT - 1 } });

	emitStreamStatus(streamDescriptor, "COMPLETE");
}

emitGlobalState(globalState, streamStates);
```

## Development

### Prerequisites

run `npm install` to install the necessary dependencies

### Building

```
docker build . -t chandlerprall/source-scriptkiddie:dev
```

### Testing locally

Building the docker image makes it available to a local Airbyte deployment. To test the connector
locally, you can run the connector commands against the source code or the docker image as described
below

#### Against the source code

```
node source.js spec
node source.js check --config config/config.json
node source.js discover --config config/config.json
node source.js read --config config/config.json --catalog config/configured_catalog.json
```

#### Against the docker image

First, make sure you build the latest Docker image, then run any of the connector commands:

```
docker run --rm chandlerprall/source-scriptkiddie:dev spec
docker run --rm -v $(pwd)/config:/config chandlerprall/source-scriptkiddie:dev check --config /config/config.json
docker run --rm -v $(pwd)/config:/config chandlerprall/source-scriptkiddie:dev discover --config /config/config.json
docker run --rm -v $(pwd)/config:/config chandlerprall/source-scriptkiddie:dev read --config /config/config.json --catalog /config/configured_catalog.json
```

## Changelog

| Version | Description                         |
| ------- | ----------------------------------- |
| 0.2.0   | base64 support, added documentation |

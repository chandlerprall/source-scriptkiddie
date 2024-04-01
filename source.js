const path = require('path')

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

const AsyncFunction = async function () { }.constructor;

switch (argv._[0]) {
  case 'spec':
    spec()
    break
  case 'check':
    check(argv.config)
    break
  case 'discover':
    discover(argv.config)
    break
  case 'read':
    read(argv.config, argv.catalog, argv.state)
    break
}

function log(msg) {
  out({ type: "LOG", log: typeof msg === 'string' ? msg : JSON.stringify(msg) })
}

function logError(error_message) {
  current_time_in_ms = Date.now()
  out({ type: "TRACE", trace: { type: "ERROR", emitted_at: current_time_in_ms, error: { message: typeof error_message === 'string' ? error_message : JSON.stringify(error_message) } } })
}

function out(msg) {
  console.log(JSON.stringify(msg))
}

function spec() {
  specification = require('./spec.json')
  out({ type: "SPEC", spec: specification })
}

function maybeDecode(str) {
  if (str.match(/^[A-Za-z0-9+/]+=*$/)) {
    return atob(str);
  }
  return str;
}

async function check(configPath) {
  try {
    const config = require(path.resolve(configPath))
    if (!config.hasOwnProperty("catalog")) {
      out({ type: "CONNECTION_STATUS", connectionStatus: { status: "FAILED", message: "Config does not contain catalog" } })
      return
    } else if (!config.hasOwnProperty("runtime")) {
      out({ type: "CONNECTION_STATUS", connectionStatus: { status: "FAILED", message: "Config does not contain runtime" } })
      return
    }

    // compile check
    const catalogResult = await (new AsyncFunction(maybeDecode(config.catalog))());
    if (catalogResult == null || typeof catalogResult !== 'object') {
      throw new Error('Catalog function did not return an object');
    }
    new AsyncFunction(maybeDecode(config.runtime));

    out({ type: "CONNECTION_STATUS", connectionStatus: { status: "SUCCEEDED" } })
  } catch (e) {
    out({ type: "CONNECTION_STATUS", connectionStatus: { status: "FAILED", message: e.toString() } })
  }
}

async function discover(configPath) {
  const config = require(path.resolve(configPath))
  out({
    type: "CATALOG",
    catalog: await (new AsyncFunction(maybeDecode(config.catalog))())
  })
}

async function read(configPath, catalogPath, statePath) {
  const config = require(path.resolve(configPath));
  const catalog = require(path.resolve(catalogPath));
  const state = !statePath ? undefined : require(path.resolve(statePath));

  function getConfiguredStreams() {
    return catalog.streams.map(({ stream }) => ({ stream, ...getStreamConfig(stream) }));
  }

  function getStreamConfig({ name, namespace }) {
    const streamConfig = catalog.streams.find(conf => conf.stream.name === name && conf.stream.namespace === namespace);
    const syncMode = streamConfig.sync_mode;

    let streamsStates = [];
    if (state) {
      if (state[0]?.type === "GLOBAL") {
        streamsStates = state[0].global.stream_states ?? [];
      } else if (state[0]?.type == "STREAM") {
        streamsStates = state.map(({ stream }) => stream);
      }
    }

    let streamState;
    for (const { stream_descriptor, stream_state } of streamsStates) {
      if (stream_descriptor.name === name && stream_descriptor.namespace === namespace) {
        streamState = stream_state;
        break;
      }
    }

    return { syncMode, state: streamState };
  }

  const fn = new AsyncFunction('config', 'catalog', 'emitRecord', 'log', 'out', 'logError', 'state', 'process', 'emitGlobalState', 'emitStreamState', 'emitStreamStatus', 'getConfiguredStreams', 'getStreamConfig', 'wait', maybeDecode(config.runtime));
  await fn(config, catalog, emitRecord, log, out, logError, state, process, emitGlobalState, emitStreamState, emitStreamStatus, getConfiguredStreams, getStreamConfig, wait);
}

function emitRecord({ name, namespace }, data) {
  out({
    type: "RECORD",
    record: {
      stream: name,
      namespace,
      data,
      emitted_at: Date.now(),
    }
  })
}

function emitGlobalState(globalState, streamStates = []) {
  out({
    type: "STATE",
    state: {
      type: "GLOBAL",
      global: {
        shared_state: globalState,
        stream_states: streamStates,
      }
    }
  });
};

function emitStreamState({ name, namespace }, streamState) {
  out({
    type: "STATE",
    state: {
      type: "STREAM",
      stream: {
        stream_descriptor: { name, namespace },
        stream_state: streamState
      },
    }
  });
};

function emitStreamStatus({ name, namespace }, status) {
  log({
    type: "TRACE",
    trace: {
      type: "STREAM_STATUS",
      emitted_at: Date.now(),
      stream_status: {
        stream_descriptor: { name, namespace },
        status: status,
      }
    }
  });
  out({
    type: "TRACE",
    trace: {
      type: "STREAM_STATUS",
      emitted_at: Date.now(),
      stream_status: {
        stream_descriptor: { name, namespace },
        status: status,
      }
    }
  });
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

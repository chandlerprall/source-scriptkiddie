const { readFileSync, dir } = require('fs')
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
  out({ type: "LOG", log: msg })
}

function log_error(msg) {
  current_time_in_ms = Date.now()
  out({ type: "TRACE", trace: { type: "ERROR", emitted_at: current_time_in_ms, error: { message: error_message } } })
}

function out(msg) {
  console.log(JSON.stringify(msg))
}

function spec() {
  specification = require('./spec.json')
  out({ type: "SPEC", spec: specification })
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
    const catalogResult = await (new AsyncFunction(config.catalog)());
    if (catalogResult == null || typeof catalogResult !== 'object') {
      throw new Error('Catalog function did not return an object');
    }
    new AsyncFunction(config.runtime);

    out({ type: "CONNECTION_STATUS", connectionStatus: { status: "SUCCEEDED" } })
  } catch (e) {
    out({ type: "CONNECTION_STATUS", connectionStatus: { status: "FAILED", message: e.toString() } })
  }
}

/*
{
  "streams": [
    {
      "name": "stock_prices",
      "supported_sync_modes": [
        "full_refresh"
      ],
      "json_schema": {
        "properties": {
          "price": {
            "type": "number"
          },
          "stock_ticker": {
            "type": "string"
          }
        }
      }
    }
  ]
}
*/
async function discover(configPath) {
  const config = require(path.resolve(configPath))
  out({
    type: "CATALOG",
    catalog: await (new AsyncFunction(config.catalog)())
  })
}

/*
emitRecord('stock_prices', null, { stock_ticker: "goog", price: 100 });
emitRecord('stock_prices', null, { stock_ticker: "nvda", price: 75 });
*/
async function read(configPath, catalogPath, statePath) {
  const config = require(path.resolve(configPath));
  const catalog = require(path.resolve(catalogPath));
  const state = !statePath ? [] : require(path.resolve(statePath));

  const fn = new AsyncFunction('config', 'catalog', 'emitRecord', 'log', 'out', 'log_error', 'state', 'process', config.runtime);
  await fn(config, catalog, emitRecord, log, out, log_error, state, process);
}

function emitRecord(stream, namespace, record) {
  out({
    type: "RECORD",
    record: {
      stream,
      namespace,
      data: record,
      emitted_at: Date.now(),
    }
  })
}
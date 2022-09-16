[![npm version](https://badge.fury.io/js/cluster-harakiri.svg)](https://www.npmjs.com/package/cluster-harakiri)
[![CI workflow](https://github.com/smartfile/node-cluster-harakiri/actions/workflows/ci.yml/badge.svg)](https://github.com/smartfile/node-cluster-harakiri/actions)

# Cluster Harakiri

> This library provides a wrapper around the standard node `cluster` module. The library will automatically terminate and restart cluster workers based on time or connections. These parameters can be configured for the particular use case using environmental variables or programmatic initialization.

## Prerequisites

This project requires NodeJS (version 16 or later) and NPM.
[Node](http://nodejs.org/) and [NPM](https://npmjs.org/) are really easy to install.
To make sure you have them available on your machine,
try running the following command.

```sh
$ npm -v && node -v
8.15.0
v16.17.0
```

## Table of contents

- [Cluster Harakiri](#cluster-harakiri)
  - [Prerequisites](#prerequisites)
  - [Table of contents](#table-of-contents)
  - [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Running the tests](#running-the-tests)
    - [Running the linter](#running-the-linter)
    - [Building a distribution version](#building-a-distribution-version)
  - [API](#api)
    - [setupHarakiri](#setupharakiri)
      - [Options](#options)
  - [Contributing](#contributing)
  - [Versioning](#versioning)
  - [Authors](#authors)
  - [License](#license)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

## Installation

**BEFORE YOU INSTALL:** please read the [prerequisites](#prerequisites)

To install and set up the library, run:

```sh
$ npm install cluster-harakiri
```

Or if you prefer using Yarn:

```sh
$ yarn add cluster-harakiri
```

## Usage

Start with cloning this repo on your local machine:

```sh
$ git clone https://github.com/smartfile/node-cluster-harakiri.git
$ cd node-cluster-harakiri
```

### Running the tests

```sh
$ npm test
```

### Running the linter

```sh
$ npm run lint
```

## API

### setupHarakiri

```js
setupHarakiri(options)
```

Supported options and result fields for the `setupHarakiri` method are listed below. Most options
are also available as environmental variables. It is not necessary to call this method. Options
can be set in the environment and this method will be called if not already called when workers
are created.

#### Options

`ttl`

| Type | Default value | Environmental variable
| --- | --- | --- |
| number |  | `HARAKIRI_WORKER_TTL`

If present, the workers will be terminated after at least `ttl` seconds.

`connectionLimit`

| Type | Default value | Environmental variable
| --- | --- | --- |
| number |  | `HARAKIRI_WORKER_CONN_LIMIT`

If present, the workers will be terminated after at least `connectionLimit` connections.

`checkInterval`

| Type | Default value | Environmental variable
| --- | --- | --- |
| number | 30 | `HARAKIRI_WORKER_CHECK_INTERVAL`

The periodic interval, in seconds, to check if there are any workers to terminate.

`termDelay`

| Type | Default value | Environmental variable
| --- | --- | --- |
| number | | `HARAKIRI_WORKER_TERM_DELAY`

If present, the amount of time to delay, in seconds, between terminating workers. This can be used to prevent
many or all workers from being terminated at the same time.

`closeTimeout`

| Type | Default value | Environmental variable
| --- | --- | --- |
| number | | `HARAKIRI_WORKER_CLOSE_TIMEOUT`

If present, the amount of time, in seconds, to wait for the worker to exit after termination. This can
be used to prevent a worker from running indefinitely if the connection stays alive.

`restartWorker`

| Type | Default value | Environmental variable
| --- | --- | --- |
| boolean | true |

If true, creates a new worker when a worker terminates.

## Contributing

1.  Fork it!
2.  Create your feature branch: `git checkout -b my-new-feature`
3.  Add your changes: `git add .`
4.  Commit your changes: `git commit -am 'Add some feature'`
5.  Push to the branch: `git push origin my-new-feature`
6.  Submit a pull request :sunglasses:

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/smartfile/node-cluster-harakiri/releases).

## Authors

* **Clifton Barnes** - [cabarnes](https://github.com/cabarnes)

## License

[MIT License](LICENSE) © SmartFile



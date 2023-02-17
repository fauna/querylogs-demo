# Setup

1. Install dependencies: `npm install`

# What is this?

A set of demo applications for receiving query logs from your preview account or production account, and publishing them as metrics into Data Dog.

It runs in two modes:

1. **Demo Mode** `npm run demo` - a guided CLI that uses the username and password of your preview account to create a synthetic dashboard session enabling the program to receive logs. The CLI demo is intended to show you the core functionality offered.
2. **Program Mode** - `npm run example-program` - an example of how to write a program to fetch Fauna logs. It uses an **Account Key** to call the Fauna's frontdoor service to requests logs for your production Fauna account. To use this, make an **Account Key** in the production Fauna account of your choice, export it to your local environment with `export ACCOUNT_KEY=<your_key>` and run! Inspect the source code in `example-program.js` to tweak the inputs and see ideas for how to use such a program to build a more complete integration with your observability platform.
3. **Datadog Metrics** - go into the `fauna-metrics-to-datadog` subdirectory and utlized vector to publish your query logs into Data Dog as metrics. See the `README` in that directory for more details.

# How can I use this?

You can combine the example code in **Program Mode** (`example-program.js`) and **Datadog Metrics** (`fauna-metrics-to-datadog`) to build automation that regularly slurps your querylogs into datadog.

Feel free to copy this code as you like and let us know if you find other features you'd like to see or have questions about the process. Contact our [support team](https://support.fauna.com/hc) to get rolling on that.



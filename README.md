# What is this?

A demo application for receiving query logs from your preview account or production account.

It runs in two modes:

1. **Demo Mode** `npm run demo` - a guided CLI that uses the username and password of your preview account to create a synthetic dashboard session enabling the program to receive logs. The CLI demo is intended to show you the core functionality offered.
2. **Program Mode** - `npm run example-program` - uses an **Account Key** to call the Fauna's frontdoor service to requests logs for your production Fauna account. To use this, make an **Account Key** in the production Fauna account of your choice and run! Inspect the source code in `example-program.js` to tweak the inputs.

# Setup

1. Install dependencies: `npm install`
2. Run the demo application: `npm run demo`

The demo application walks you through requesting Fauna query logs.
Once query logs are received, you have the option to download them
locally for analysis.

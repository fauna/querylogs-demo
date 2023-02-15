# Setup

1. Install dependencies: `npm install`

# What is this?

A demo application for receiving query logs from your preview account or production account.

It runs in two modes:

1. **Demo Mode** `npm run demo` - a guided CLI that uses the username and password of your preview account to create a synthetic dashboard session enabling the program to receive logs. The CLI demo is intended to show you the core functionality offered.
2. **Program Mode** - `npm run example-program` - an example of how to write a program to fetch Fauna logs. It uses an **Account Key** to call the Fauna's frontdoor service to requests logs for your production Fauna account. To use this, make an **Account Key** in the production Fauna account of your choice, export it to your local environment with `export ACCOUNT_KEY=<your_key>` and run! Inspect the source code in `example-program.js` to tweak the inputs and see ideas for how to use such a program to build a more complete integration with your observability platform.


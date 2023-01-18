# What is this?

A demo application for receiving query logs from your preview account.

Presently it uses your username and password to create a synthetic dashboard session enabling the program to receive logs; however, when
the product launches we will support the creation and usage of API tokens. This will enable programs to use API tokens, rather than synthetic
dashboard sessions, to receive query logs.

# How do I use it?

1. Install dependencies: `npm install`
2. Run the demo application: `npm run demo`

The demo application walks you through requesting Fauna query logs.
Once query logs are received, you have the option to download them
locally for analysis.

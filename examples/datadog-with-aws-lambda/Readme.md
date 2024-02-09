# Get Started

### Pre-requisites:
- [Node.js](https://nodejs.org/en/download/) installed on your machine
- [Serverless Framework](https://www.serverless.com/framework/docs/getting-started/) installed on your machine 
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) installed on your machine
- [AWS Account](https://aws.amazon.com/premiumsupport/knowledge-center/create-and-activate-aws-account/) with the necessary permissions to create the resources
- [Datadog Account](https://www.datadog.com/)
- [Fauna Account](https://fauna.com/) a pro or enterprise account is required to use the Fauna Logs feature

To get started create a new `.env` file in the root of the project and add the following environment variables:

```bash
LOGS_DURATION_MINUTES=20 # Gets log from last 20 minutes
REGION_GROUP=fauna-region-group # Name of the region group i.e us-std
DATABASE_NAME=fauna-database-name # Name of the database
FAUNA_ACCOUNT_KEY=fauna-account-key
DATADOG_API_KEY=datadog-api-key
FAUNA_DB_SECRET=fauna-db-secret
```

Then run the following command to install the dependencies:

```bash
npm install
```

To deploy the stack run the following command:

```bash
sls deploy
```

To remove the stack run the following command:

```bash
sls remove
```
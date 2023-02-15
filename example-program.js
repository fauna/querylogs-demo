const axios = require('axios').default;
const winston = require('winston');

const frontdoorClient = axios.create({
  baseURL: "https://frontdoor.fauna.com",
  timeout: 10000,
});

/**
   This example program shows you how to use an Account Key to fetch
   logs programmatically. You could extend such a program to act on any
   region group or time-bad according to your input; and extend it further
   to fetch the logs with the resulting presigned_url and then dump it into
   your observability platform.

   To use it set ACCOUNT_KEY environmental variable to an account key in
   your Fauna account.
*/
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'querylogs-demo' },
  transports: [
    new winston.transports.Console({
      level: "debug",
      handleExceptions: true,
      // enable json output, good to send to DD
      format: winston.format.json(),
    }),
  ],
});

async function getLogs() {
  const headers = { Authorization: `Bearer ${process.env["ACCOUNT_KEY"]}` };
  const { data: querylogRequest } = await frontdoorClient.post(
    "/api/v1/logs?type=query",
    { region_group: "us-std", time_start: "2023-02-14T00:00:00Z", time_end: "2023-02-15T00:00:00Z"},
    { headers }
  );
  logger.info(querylogRequest);
  await pollResults(querylogRequest, headers, "us-std");
}

if (process.env["ACCOUNT_KEY"] === undefined) {
  logger.error("You must set ACCOUNT_KEY in your local environment to run this program!");
  return;
}

async function pollResults(
  querylogRequest,
  headers,
  region_group,
) {
  let result;
  const maxRuntimeMs = 300 * 1000;
  const time_start = Date.now();
  do {
    ({ data: result } = await frontdoorClient.get(
      `/api/v1/logs/${querylogRequest.request_id}?regionGroup=${region_group}&type=query`,
      { headers }
    ));
    await new Promise((resolve) => setTimeout(resolve, 1000));
    logger.info(`State: ${result.state}`);
  } while (
    Date.now() < time_start + maxRuntimeMs &&
    !["Complete", "DoesNotExist", "Failed", "TimedOut"].includes(result.state)
  );
  logger.info(result);
  return result;
}

getLogs().then(() => logger.info("Thanks for trying out Fauna logs! Please give us any and all feedback!"));

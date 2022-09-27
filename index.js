const axios = require('axios').default;
const prompts = require("prompts");
const https = require('https');
const fs = require('fs');
const winston = require('winston');

const RED = "\x1b[1m\x1b[31m";
const YELLOW = "\x1b[1m\x1b[33m%s\x1b[0m";
const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";

const log_red = (item) => console.log(RED, item, RESET);
const log_yellow = (item) => console.log(YELLOW, item, RESET);
const log_green = (item) => console.log(GREEN, item, RESET);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'querylogs-demo' },
  transports: [
    // - Write all logs with importance level of `error` or less to `error.log`
    // - Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

const frontdoorClient = axios.create({
  baseURL: "https://frontdoor.prev.faunadb.net",
  timeout: 10000,
});

async function getRegionGroupSecrets() {
  const authServiceClient = axios.create({
    baseURL: "https://auth-console.fauna-preview.com",
    timeout: 20000,
  });
  while (true) {
    const { email, password } = await getEmailPassword(); 
    try {
      const { data } = await authServiceClient.post(
        "/login",
        { email, password, strategy: "email_and_password" },
        {
          headers: {
            accept: "application/json",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/json",
          },
        }
      );
      return {
        "us-std": `Bearer ${data.regionGroups["us"].secret}`,
        "eu-std": `Bearer ${data.regionGroups["eu"].secret}`,
        "classic": `Bearer ${data.regionGroups["global"].secret}`,
      }
    } catch (e) {
      if (e.response?.status === 401) {
        log_yellow("Invalid username or password entered; please try again");
        continue;
      }
      logger.error(e.response?.data);
      throw e;
    }
  }
}

async function runDemo() {
  const regionGroupCreds = await getRegionGroupSecrets();
  let keepGoing = true;
  while (keepGoing) {
    await receiveQuerylogs(regionGroupCreds);
    await (async () => {
      const p = await prompts({
        type: 'confirm',
        name: 'value',
        message: 'Receive more query logs?',
      });
      keepGoing = p.value;
    })();
  }
}

async function receiveQuerylogs(regionGroupCreds) {
  let input, bearerToken, regionGroup;
  let querylogRequest;
  while (true) {
    try {
      ({ input, bearerToken, regionGroup } = await getInputs(regionGroupCreds));
      headers = { Authorization: bearerToken };
      ({ data: querylogRequest } = await frontdoorClient.post(
        "/api/v1/querylogs",
        input,
        { headers }
      ));
      console.log(querylogRequest);
      break;  
    } catch (e) {
      if (e.response?.status === 404) {
        log_yellow(`${e.response.data.reason} Please pick another input.`);
        continue;
      }
      if (e.response?.status === 401) {
        log_red("You've lost your session - another client may have logged in with these credentials; please run the demo again.");
        process.exit(1);
      }
      logger.error(e.response?.data);
      throw e;
    }
  }
  log_green("Polling for results for 2 minutes");
  const maxRuntimeMs = 120 * 1000;
  const startTime = Date.now();
  let result;
  do {
    ({ data: result } = await frontdoorClient.get(
      `/api/v1/querylogs/${querylogRequest.requestId}?regionGroup=${regionGroup}`,
      { headers }
    ));
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } while (
    Date.now() < startTime + maxRuntimeMs &&
    !["Complete", "Failed", "DoesNotExist"].includes(result.state)
  );
  if (result.state === "Complete") {
    log_green("Complete! Final response:");
    console.log(result);
    console.log(`You can download your logs here: ${result.url}`);
    let download;
    await (async () => {
      const p = await prompts({
        type: 'confirm',
        name: 'value',
        message: 'Download to a gzip file here?',
      });
      download = p.value;
    })();
    if (download) {
      let fileName;
      await (async () => {
        const p = await prompts({
          type: 'text',
          name: 'value',
          message: "What do you want to name your file?",
          validate: value => value.trim() === "" ? "filename must be non-empty" : true
        });
        fileName = p.value.trim();
      })();
      const file = fs.createWriteStream(fileName);

      const req = https.get(result.url, function(response) {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          log_green("Download Completed");
        });
      });
      req.end();
      while (!file.closed) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  } else if (result.state === "Failed") {
    log_red("Failed! Final response:");
    console.log(result);
  } else if (result.state === "DoesNotExist") {
    log_green("Complete! Final response:");
    console.log(result);
    log_yellow("No query logs exist for your request. As such, the final response is 'DoesNotExist' with no URL.");
  } else {
    log_yellow(`The logs have been requested but not yet received. Please retry, or cut support an issue if you continue to see this.`);
    console.log(result);
  }
}

async function getEmailPassword() {
  let email, password;
  await (async () => {
    const p = await prompts({
      type: 'text',
      name: 'value',
      message: "Enter the email address for your Preview account",
      validate: value => value.trim() === "" ? "email must be non-empty" : true
    });
    email = p.value.trim();
  })();

  await (async () => {
    const p = await prompts({
      type: 'text',
      name: 'value',
      message: "Enter the password for your Preview account",
      validate: value => value.trim() === "" ? "password must be non-empty" : true
    });
    password = p.value;
  })();
  return {email, password};
}

async function getInputs(regionGroupCreds) {
  const validRegionGroups = ["eu-std", "us-std", "classic"];
  let databaseOrRegionGroup, regionGroup, database, startTime, endTime;
  
  
  await (async () => {
    const p = await prompts({
      type: 'select',
      name: 'value',
      message: 'Export logs for a database or a region group?',
      choices: [
        { title: 'Database', description: 'Receive logs for a particular database (database is determined by which database owns the key you used to query - Dashboard queries are not associated with any database, receive logs for a Region Group to access those).', value: 'database' },
        { title: 'Region Group', description: 'Receive all logs for a region group.', value: 'regionGroup' },
      ],
    });
    databaseOrRegionGroup = p.value;
  })();
  
  if (databaseOrRegionGroup === "database") {
    await (async () => {
      const p = await prompts({
        type: 'text',
        name: 'value',
        message: "Enter the path of database (e.g. classic/parent-db/child-db, us-std/my-db, eu-std/other-db)",
        validate: (value) => {
          const parts = value.split("/");
          if (!validRegionGroups.includes(parts[0])) {
            return "Database path must start with 'eu-std/', 'us-std/' or 'classic/'";
          }
          if (parts[1] === undefined || parts[1].trim() === "") {
            return "Database path must include a database name; e.g. 'classic/db-name'"
          }
          return true;
        }
      });
      database = p.value;
    })();
    regionGroup = database.split("/")[0];
  } else {
    await (async () => {
      const p = await prompts({
        type: 'select',
        name: 'value',
        message: 'Pick a region group',
        choices: [
          { title: 'classic', description: 'The classic region group', value: 'classic' },
          { title: 'us-std', description: 'The us-std region group', value: 'us-std' },
          { title: 'eu-std', description: 'The eu-std region group', value: 'eu-std' },
        ],
      });
      regionGroup = p.value;
    })();
  }

  await (async () => {
    const p = await prompts({
      type: 'date',
      name: 'value',
      message: 'Pick a date-time to begin receiving query logs, inclusive.',
      initial: new Date(new Date().getTime() - (24 * 60 * 60 *1000))
    });
    startTime = p.value.toISOString();
  })();

  await (async () => {
    const p = await prompts({
      type: 'date',
      name: 'value',
      message: 'Pick a date-time to stop receiving query logs, exclusive.',
      initial: new Date(),
    });
    endTime = p.value.toISOString();
  })();

  const input = {
    startTime,
    endTime,
  };
  if (database === undefined) {
    input.regionGroup = regionGroup;
  } else {
    input.database = database;
  }
  console.log(`Using input ${JSON.stringify(input)}`);
  return { input, bearerToken: regionGroupCreds[regionGroup], regionGroup};
}

runDemo()
  .then(() => log_green("Thanks for trying out query logs! Please give us any and all feedback!"))
  .catch((e) => {
    log_red("Issue executing. See error.log");
    logger.error(e);
  });

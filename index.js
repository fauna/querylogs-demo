const axios = require('axios').default;
const prompts = require("prompts");
const https = require('https');
const fs = require('fs');

const frontdoorClient = axios.create({
  baseURL: "https://frontdoor.prev.faunadb.net",
  timeout: 10000,
});

async function getRegionGroupSecrets(email, password) {
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
        console.log("Invalid username or password entered; please try again");
        continue;
      }
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
        message: 'Query more logs?',
      });
      keepGoing = p.value;
    })();
  }
}

async function receiveQuerylogs(regionGroupCreds) {
  const { input, bearerToken, regionGroup } = await getInputs(regionGroupCreds);
  const headers = { Authorization: bearerToken }
  const { data: querylogRequest } = await frontdoorClient.post(
    "/api/v1/querylogs",
    input,
    { headers }
  );
  console.log(querylogRequest);
  console.log("Polling for results for 2 minutes");
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
    !["Complete", "Failed"].includes(result.state)
  );
  if (result.state === "Complete") {
    console.log("Complete! Final response:");
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
          console.log("Download Completed");
        });
      });
      req.end();
      while (!file.closed) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  } else if (result.state === "Failed") {
    console.log("Failed! Final response:");
    console.log(result);
  } else {
    console.log(`The logs have been requested but not received. Note, if you requested for a
time-range with no activity, currently the request will be frozen in this state. This is an
open item we are actively working on fixing.`);
    console.log(result);
  }
}

async function getEmailPassword() {
  let email, password;
  await (async () => {
    const p = await prompts({
      type: 'text',
      name: 'value',
      message: "What's the email address of your preview account?",
      validate: value => value.trim() === "" ? "email must be non-empty" : true
    });
    email = p.value.trim();
  })();

  await (async () => {
    const p = await prompts({
      type: 'text',
      name: 'value',
      message: "What's the password of your preview account?",
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
        { title: 'Database', description: 'Receive logs for a particular database (database is determined by which database owns the key you used to query - dashboard queries will not be associated with any database - receive logs for a region group to access those).', value: 'database' },
        { title: 'Region Group', description: 'Receive all logs for a region group.', value: 'regionGroup' },
      ],
      initial: 1
    });
    databaseOrRegionGroup = p.value;
  })();
  
  if (databaseOrRegionGroup === "database") {
    await (async () => {
      const p = await prompts({
        type: 'text',
        name: 'value',
        message: "What's path of database (e.g. classic/parent-db/child-db, us-std/my-db, eu-std/other-db)?",
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
        message: 'Which region group?',
        choices: [
          { title: 'classic', description: 'The classic region group', value: 'classic' },
          { title: 'us-std', description: 'The us-std region group', value: 'us-std' },
          { title: 'eu-std', description: 'The eu-std region group', value: 'eu-std' },
        ],
        initial: 1
      });
      regionGroup = p.value;
    })();
  }

  await (async () => {
    const p = await prompts({
      type: 'date',
      name: 'value',
      message: 'Pick a date-time to begin receiving querylogs, inclusive.',
      initial: new Date(new Date().getTime() - (24 * 60 * 60 *1000))
    });
    startTime = p.value.toISOString();
  })();

  await (async () => {
    const p = await prompts({
      type: 'date',
      name: 'value',
      message: 'Pick a date-time to stop receiving querylogs, exclusive.',
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
  .then(() => console.log("Thanks for trying out querylogs! Please give us any and all feedback!"))
  .catch((e) => {
    console.log("Issue executing");
    console.error(e);
  });

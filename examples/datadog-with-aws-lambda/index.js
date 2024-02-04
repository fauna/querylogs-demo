const axios = require('axios').default;
require('dotenv').config();
const zlib = require('zlib');

exports.handler = async (event) => {
    const faunaClient = axios.create({
        baseURL: "https://account.fauna.com",
        timeout: 10000,
    });

    async function getLogs() {
        const headers = { Authorization: `Bearer ${process.env["ACCOUNT_KEY"]}` };

        // Get the current time
        const currentTime = new Date();

        // Calculate one hour ago from the current time
        const oneHourAgo = new Date(currentTime.getTime() - 60 * 60 * 1000);

        // Format the dates in ISO 8601 format
        const timeStart = oneHourAgo.toISOString();
        const timeEnd = currentTime.toISOString();

        console.log("ACCOUNT_KEY:", process.env["ACCOUNT_KEY"]);
        const { data: querylogRequest } = await faunaClient.post(
            "/api/v1/logs?type=query",
            {
                region_group: "us-std",
                time_start: timeStart,
                time_end: timeEnd,
                database: "us-std/random_numbers"
            },
            { headers }
        );
        console.log("Query Log Request:", querylogRequest);
        await pollResults(querylogRequest, headers, "us-std");
  }

    if (process.env["ACCOUNT_KEY"] === undefined || process.env["DATADOG_API_KEY"] === undefined) {
        console.error("You must set ACCOUNT_KEY and DATADOG_API_KEY in your local environment to run this program!");
        return { statusCode: 500, body: 'Environment variables not set' };
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
          ({ data: result } = await faunaClient.get(
              `/api/v1/logs/${querylogRequest.request_id}?regionGroup=${region_group}&type=query`,
              { headers }
          ));
          await new Promise((resolve) => setTimeout(resolve, 1000));
          console.log(`State: ${result.state}`);
      } while (
          Date.now() < time_start + maxRuntimeMs &&
          !(["Complete", "DoesNotExist", "Failed", "TimedOut"].includes(result.state))
      );
      console.log("Result:", result);

      // Fetching data from the presigned URL
      if (result.state === 'Complete' && result.presigned_url) {
          try {
              const response = await axios.get(result.presigned_url, { responseType: 'arraybuffer' });

              // Decompressing the gzip data
              const decompressedData = zlib.gunzipSync(response.data).toString('utf8');

              // Splitting the JSONL content into individual JSON objects
              const jsonObjects = decompressedData.split('\n');

              // Filter and parse valid JSON objects
              const jsonArray = jsonObjects.filter(Boolean).map(obj => {
                  try {
                      return JSON.parse(obj.trim());
                  } catch (error) {
                      console.error(`Error parsing JSON object: ${error}`);
                      return null;
                  }
              }).filter(Boolean); // Remove any potential null values as DataDog may throw an error

              // Stringify the JSON array
              const jsonData = JSON.stringify(jsonArray);

              const apiKey = process.env.DATADOG_API_KEY;
              const datadogUrl = `https://http-intake.logs.datadoghq.com/api/v2/logs?dd-api-key=${apiKey}`;

              // Prepare headers
              const headers = {
                  'Content-Type': 'application/json',
              };

              // Send the JSON array as a whole to Datadog
              await fetch(datadogUrl, {
                  method: 'POST',
                  headers: headers,
                  body: jsonData,
              })
              console.log('Data sent to DataDog');
          } catch (error) {
              console.error(`Error fetching or decompressing data from presigned URL: ${error}`);
          }
      }
      return result;
  }

    try {
        await getLogs();
        console.log("Thanks for trying out Fauna logs! Please give us any and all feedback!");
        return { statusCode: 200, body: 'Function executed successfully' };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: 'Failed to process data' };
    }
};

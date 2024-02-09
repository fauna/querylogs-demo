const { handler } = require('./index.js');
const event = {};

handler(event)
  .then((result) => {
    console.log('Lambda execution result:', result);
  })
  .catch((error) => {
    console.error('Lambda execution error:', error);
  });

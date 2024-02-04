const {fql, Client} = require('fauna');
require('dotenv').config();

const handler = async () => {
    const client = new Client({ secret: process.env.FAUNA_SECRET});

    try {
        let numbers = Array.from({ length: 10 }, () => Math.floor(Math.random() * 1000));
        console.log(numbers);

        const result = await client.query(fql`${numbers}.forEach( num => { Item.create({value: num}) } )`);

        return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Successfully added data to fauna',
            data: result,
        }),
        };
    } catch (error) {
        console.error('Error adding data to fauna:', error);

        return {
        statusCode: 500,
        body: JSON.stringify({
            message: 'Error:',
            error: error.toString(),
        }),
        };
    }
};

handler();


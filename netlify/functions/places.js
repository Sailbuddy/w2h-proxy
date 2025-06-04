console.log("ENV API KEY:", process.env.GOOGLE_API_KEY || "NOT SET");
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const GOOGLE_API_KEY = "AIzaSyArVH7fTNLhGCDMYY2L4vYHKIwSId92evs";
  const { pluscode, placeid } = event.queryStringParameters;

  if (!GOOGLE_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Google API key' })
    };
  }

  const targetUrl = placeid
    ? `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeid}&key=${GOOGLE_API_KEY}&language=de`
    : `https://plus.codes/api?address=${pluscode}`;

  try {
    const response = await fetch(targetUrl);
    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

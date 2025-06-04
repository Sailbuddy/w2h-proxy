const fetch = require("node-fetch");
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

exports.handler = async function (event, context) {
  console.log("🌍 Hello from places.js – deployed!");
  console.log("ENV API KEY:", GOOGLE_API_KEY);

  // 🔁 Eingabe aus URL holen (nicht mehr fix!)
  const input = event.queryStringParameters.input || "GH7V+C9 Portorož, Slovenia";
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(input)}&inputtype=textquery&fields=place_id,name,geometry&key=${GOOGLE_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({ result: data }),
    };
  } catch (err) {
    console.error("🔥 API request failed:", err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({ error: "API request failed" }),
    };
  }
};

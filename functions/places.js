const fetch = require("node-fetch");

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  // 🪵 Debug-Logging
  console.log("➡️ Incoming event:", JSON.stringify(event, null, 2));

  const input = event.queryStringParameters?.input;
  const repo = event.queryStringParameters?.repo;

  console.log("🧪 Parsed params:", { input, repo });
  console.log("🔐 Token loaded:", !!GITHUB_TOKEN);

  // Fehlerprüfung bei fehlenden Werten
  if (!input || !repo || !GITHUB_TOKEN) {
    console.error("❌ Missing input, repo or token");
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing input, repo, or GitHub token." })
    };
  }

  const placeUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
    input
  )}&inputtype=textquery&fields=place_id,name,geometry&key=${GOOGLE_API_KEY}`;

  try {
    const res = await fetch(placeUrl);
    const result = await res.json();

    console.log("📦 Google API result:", JSON.stringify(result, null, 2));

    if (!result.candidates || result.candidates.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "No place found." })
      };
    }

    const candidate = result.candidates[0];
    const placeId = candidate.place_id;

    const entry = {
      plus_code_input: input,
      place_id: placeId,
      name: candidate.name || null,
      status: "pending"
    };

    const upload = async (path, append) => {
      const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
      let sha = null;
      let existing = [];

      const checkRes = await fetch(apiUrl, {
        headers: { Authorization: `token ${GITHUB_TOKEN}` }
      });

      if (checkRes.ok) {
        const checkJson = await checkRes.json();
        sha = checkJson.sha;
        existing = JSON.parse(Buffer.from(checkJson.content, "base64").toString());
      }

      const newData = append ? [...existing, placeId] : [placeId];
      const b64 = Buffer.from(JSON.stringify(newData, null, 2)).toString("base64");

      const uploadRes = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `🛰️ Update ${path} via proxy`,
          content: b64,
          sha
        })
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        throw new Error(`❌ GitHub upload failed (${path}): ${errorText}`);
      }
    };

    await upload("data/place_ids.json", false);
    await upload("data/place_ids_archive.json", true);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ place_id: placeId, name: candidate.name })
    };
  } catch (err) {
    console.error("🔥 Error during proxy operation:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server error", details: err.message })
    };
  }
};

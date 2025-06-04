const fetch = require("node-fetch");
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

exports.handler = async function (event) {
  const input = event.queryStringParameters.input || "";
  const repo = event.queryStringParameters.repo || "Sailbuddy/w2h-places-import";

  console.log("🌍 Suche:", input);
  if (!input || !GOOGLE_API_KEY || !GITHUB_TOKEN) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Fehlende Eingabe oder Token" }),
    };
  }

  // 1. Place ID abrufen
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
    input
  )}&inputtype=textquery&fields=place_id,name&key=${GOOGLE_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.candidates || data.candidates.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Kein Ort gefunden" }),
      };
    }

    const place = data.candidates[0];
    const placeId = place.place_id;

    // 2. JSON-Inhalt vorbereiten
    const eintrag = {
      plus_code_input: input,
      place_id: placeId,
      name: place.name || null,
      status: "pending",
    };

    const files = [
      { path: "data/place_ids.json", content: [placeId], append: false },
      { path: "data/place_ids_archive.json", content: [placeId], append: true },
    ];

    const results = [];

    for (const file of files) {
      const url = `https://api.github.com/repos/${repo}/contents/${file.path}`;

      let bestehend = [];
      let sha = null;

      const check = await fetch(url, {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      });

      if (check.ok) {
        const j = await check.json();
        sha = j.sha;
        bestehend = JSON.parse(Buffer.from(j.content, "base64").toString());
      }

      const neueDaten = file.append
        ? [...new Set([...bestehend, ...file.content])]
        : file.content;
      const b64 = Buffer.from(JSON.stringify(neueDaten, null, 2)).toString("base64");

      const upload = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `🛰 Upload from places.js – ${new Date().toISOString()}`,
          content: b64,
          sha: sha || undefined,
        }),
      });

      results.push({
        path: file.path,
        ok: upload.ok,
        status: upload.status,
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        input,
        place_id: placeId,
        results,
      }),
    };
  } catch (err) {
    console.error("🔥 Fehler:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Serverfehler", details: err.message }),
    };
  }
};

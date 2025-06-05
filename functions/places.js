const fetch = require("node-fetch");

// 🌐 API-Keys aus Environment-Variablen holen
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// 🧪 Wird die Datei überhaupt geladen?
console.log("🧪 TEST – Funktion places.js wurde geladen.");

// ✅ Hauptfunktion
exports.handler = async function (event) {
  // 🪵 Logge eingehenden Event
  console.log("➡️ Incoming event:", JSON.stringify(event, null, 2));

  // 🛡️ Zeige Token-Status
  console.log("🔐 GITHUB_TOKEN env value:", GITHUB_TOKEN ? "(vorhanden ✅)" : "(NICHT gesetzt ❌)");
  console.log("🔐 GOOGLE_API_KEY env value:", GOOGLE_API_KEY ? "(vorhanden ✅)" : "(NICHT gesetzt ❌)");

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  try {
    const input = new URLSearchParams(event.queryStringParameters).get("input");
    const repo = new URLSearchParams(event.queryStringParameters).get("repo");

    if (!input || !repo) {
      console.warn("⚠️ Eingabe oder Repository fehlt.");
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing input or repo" })
      };
    }

    // 🔎 Google Places API abrufen
    const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(input)}&inputtype=textquery&fields=place_id,name,formatted_address,geometry&key=${GOOGLE_API_KEY}`;
    console.log("🌍 Google API Request:", searchUrl);

    const response = await fetch(searchUrl);
    const result = await response.json();

    console.log("🔍 Google Result Candidates:", JSON.stringify(result.candidates, null, 2));

    if (!result.candidates || result.candidates.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Kein Ort gefunden. Prüfe Eingabe." })
      };
    }

    const candidate = result.candidates[0];
    const newEntry = {
      place_id: candidate.place_id,
      name: candidate.name,
      address: candidate.formatted_address,
      location: candidate.geometry?.location || {},
      input,
      timestamp: new Date().toISOString()
    };

    const githubApiUrl = `https://api.github.com/repos/${repo}/contents/data/place_ids.json`;

    console.log("📦 Neuer Eintrag:", newEntry);
    console.log("📤 GitHub Upload-Ziel:", githubApiUrl);

    const getResponse = await fetch(githubApiUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json"
      }
    });

    let existingData = [];
    let sha = null;

    if (getResponse.ok) {
      const existingFile = await getResponse.json();
      const content = Buffer.from(existingFile.content, "base64").toString();
      existingData = JSON.parse(content);
      sha = existingFile.sha;
    }

    existingData.push(newEntry);

    const updatedContent = Buffer.from(JSON.stringify(existingData, null, 2)).toString("base64");

    const uploadResponse = await fetch(githubApiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json"
      },
      body: JSON.stringify({
        message: `📍 Neuer Ort hinzugefügt: ${candidate.name}`,
        content: updatedContent,
        sha
      })
    });

    if (!uploadResponse.ok) {
      const errorDetail = await uploadResponse.text();
      console.error("❌ Fehler beim GitHub-Upload:", errorDetail);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "GitHub upload failed",
          details: errorDetail
        })
      };
    }

    console.log("✅ Upload erfolgreich.");
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: newEntry })
    };
  } catch (err) {
    console.error("💥 Fehler in der Funktion:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server error", details: err.message })
    };
  }
};

exports.handler = async function () {
  const token = process.env.GH_TOKEN;

  if (!token) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "GitHub token missing in environment variables." })
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*", // damit dein Tool es abrufen darf
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ token })
  };
};

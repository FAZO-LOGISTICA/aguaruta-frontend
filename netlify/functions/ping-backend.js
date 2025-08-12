// netlify/functions/ping-backend.js
const fetch = require('node-fetch');

exports.handler = async function () {
  try {
    const healthUrl = process.env.RENDER_HEALTH_URL;

    if (!healthUrl) {
      throw new Error("The env var RENDER_HEALTH_URL is not set.");
    }

    const resp = await fetch(healthUrl);
    const text = await resp.text();

    console.log("✅ Backend ping OK:", text);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Ping sent to backend" }),
    };
  } catch (err) {
    console.error("❌ Ping error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

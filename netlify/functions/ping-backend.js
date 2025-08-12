// netlify/functions/ping-backend.js
const fetch = require('node-fetch');

exports.handler = async function () {
  try {
    const healthUrl = process.env.RENDER_HEALTH_URL;

    if (!healthUrl) {
      throw new Error("⚠️ La variable de entorno RENDER_HEALTH_URL no está configurada.");
    }

    const response = await fetch(healthUrl);
    const text = await response.text();

    console.log("✅ Backend ping exitoso:", text);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Ping enviado al backend correctamente" }),
    };
  } catch (error) {
    console.error("❌ Error en el ping al backend:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

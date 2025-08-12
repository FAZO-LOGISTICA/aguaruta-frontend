// netlify/functions/ping-backend.js

exports.handler = async function () {
  try {
    const response = await fetch(process.env.API_URL || "https://tu-backend-url.com");
    const data = await response.text();

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, backendResponse: data }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: error.message }),
    };
  }
};

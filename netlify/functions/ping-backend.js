export const config = { schedule: "*/5 * * * *" }; // cada 5 minutos

export default async () => {
  const url = process.env.RENDER_HEALTH_URL || "https://aguaruta-backend.onrender.com/health";
  try {
    const res = await fetch(url);
    const txt = await res.text();
    return new Response(JSON.stringify({
      ok: true,
      status: res.status,
      body: txt.slice(0, 200)
    }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      ok: false,
      error: String(e)
    }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
};

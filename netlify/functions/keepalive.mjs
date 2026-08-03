export default async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Keep-alive request failed:", res.status, body);
      return new Response("Keep-alive failed: " + res.status, { status: 500 });
    }

    console.log("Keep-alive request succeeded:", res.status);
    return new Response("Keep-alive ok", { status: 200 });
  } catch (err) {
    console.error("Keep-alive threw:", err.message);
    return new Response("Keep-alive failed: " + err.message, { status: 500 });
  }
};

// Runs every 2 days at 09:00 UTC
export const config = { schedule: "0 9 */2 * *" };

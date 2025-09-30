export async function handler(event) {
  const { city, lat, lon, forecast } = event.queryStringParameters || {};
  const key = process.env.OPENWEATHER_KEY;

  if (!key) {
    return { statusCode: 500, body: "Missing API key" };
  }

  let url;

  if (forecast && city) {
    // 5-day forecast
    url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${key}&units=imperial`;
  } else if (city) {
    // Current weather by city
    url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${key}&units=imperial`;
  } else if (lat && lon) {
    // Current weather by coordinates
    url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${key}&units=imperial`;
  } else {
    return { statusCode: 400, body: "Missing city or coordinates" };
  }

  try {
    const res = await fetch(url);
    const data = await res.json();

    return {
      statusCode: res.ok ? 200 : res.status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}

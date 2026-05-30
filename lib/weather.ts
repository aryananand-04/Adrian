// Open-Meteo: free, no API key. Set WEATHER_LAT / WEATHER_LON in .env.local to enable.
// Returns null (gracefully) when unconfigured or on any error.

const WMO: Record<number, string> = {
  0: 'clear skies',
  1: 'mostly clear',
  2: 'partly cloudy',
  3: 'overcast',
  45: 'foggy',
  48: 'foggy',
  51: 'light drizzle',
  53: 'drizzle',
  55: 'heavy drizzle',
  61: 'light rain',
  63: 'rain',
  65: 'heavy rain',
  71: 'light snow',
  73: 'snow',
  75: 'heavy snow',
  80: 'rain showers',
  81: 'rain showers',
  82: 'heavy showers',
  95: 'a thunderstorm',
  96: 'a thunderstorm',
  99: 'a thunderstorm',
}

function describe(code: number): string {
  return WMO[code] ?? 'mixed weather'
}

export async function getWeatherSummary(): Promise<string | null> {
  const lat = process.env.WEATHER_LAT
  const lon = process.env.WEATHER_LON
  if (!lat || !lon) return null

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min` +
      `&timezone=auto&forecast_days=1`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = await res.json()

    const temp = Math.round(data.current?.temperature_2m)
    const code = Number(data.current?.weather_code)
    const hi = Math.round(data.daily?.temperature_2m_max?.[0])
    const lo = Math.round(data.daily?.temperature_2m_min?.[0])
    if (Number.isNaN(temp)) return null

    return `${describe(code)}, currently ${temp}°C (today ${lo}–${hi}°C)`
  } catch {
    return null
  }
}

/**
 * Calculates minutes remaining until arrival from an ISO timestamp string.
 * Returns:
 *   - null if timestamp is missing/empty/invalid
 *   - integer number of minutes (floor of diff in ms / 60000)
 */
function calculateMinutes(estimatedArrival) {
  if (!estimatedArrival || typeof estimatedArrival !== 'string') {
    return null;
  }
  const trimmed = estimatedArrival.trim();
  if (!trimmed) {
    return null;
  }
  const arrivalDate = new Date(trimmed);
  const timeMs = arrivalDate.getTime();
  if (isNaN(timeMs)) {
    return null;
  }
  const diffMs = timeMs - Date.now();
  return Math.floor(diffMs / 60000);
}

function sendResponse(res, statusCode, data) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

/**
 * Vercel Serverless Function handler for /api/bus
 * Accepts BusStopCode query parameter, defaults to '04121'.
 */
export default async function handler(req, res) {
  // LTA DataMall updates every 20 seconds.
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=40');
  res.setHeader('Content-Type', 'application/json');

  let busStopCode = '04121';
  let isSampleRequested = false;

  if (req.query && typeof req.query === 'object') {
    if (req.query.BusStopCode) {
      busStopCode = String(req.query.BusStopCode).trim();
    }
    if (req.query.sample === 'true' || req.query.sample === '1') {
      isSampleRequested = true;
    }
  }

  if (req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      const code = parsedUrl.searchParams.get('BusStopCode');
      if (code) {
        busStopCode = code.trim();
      }
      if (parsedUrl.searchParams.get('sample') === 'true') {
        isSampleRequested = true;
      }
    } catch {
      // Ignore URL parsing errors and retain defaults
    }
  }

  const accountKey = process.env.LTA_ACCOUNT_KEY;

  // Fallback demo/sample generator for local preview and testing when key is absent or requested
  if (isSampleRequested || (!accountKey && busStopCode === 'demo')) {
    const sampleList = [
      { ServiceNo: '12', next: 0, next2: 7 },
      { ServiceNo: '14', next: 4, next2: 15 },
      { ServiceNo: '147', next: 2, next2: 11 },
      { ServiceNo: '166', next: 9, next2: 21 },
      { ServiceNo: '190', next: 0, next2: 8 },
      { ServiceNo: '851', next: null, next2: null }, // Demonstrates service with no buses running
    ];
    return sendResponse(res, 200, sampleList);
  }

  // If no account key configured, handle as "no buses running"
  if (!accountKey || !accountKey.trim()) {
    return sendResponse(res, 200, []);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const ltaEndpoint = `https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=${encodeURIComponent(busStopCode)}`;

    const response = await fetch(ltaEndpoint, {
      method: 'GET',
      headers: {
        AccountKey: accountKey.trim(),
        accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // If LTA returns 404, 401, 500 etc., return empty array so it is handled as "no buses running"
      return sendResponse(res, 200, []);
    }

    const payload = await response.json();
    const services = Array.isArray(payload?.Services) ? payload.Services : [];

    // Handle an empty Services array as "no buses running", not as an error.
    const simplifiedList = services.map((service) => {
      const next = calculateMinutes(service?.NextBus?.EstimatedArrival);
      const next2 = calculateMinutes(service?.NextBus2?.EstimatedArrival);
      return {
        ServiceNo: service.ServiceNo || '',
        next,
        next2,
      };
    });

    return sendResponse(res, 200, simplifiedList);
  } catch (error) {
    // On timeout or network failure, return empty array (no buses running)
    return sendResponse(res, 200, []);
  }
}

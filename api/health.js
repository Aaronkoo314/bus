function sendResponse(res, statusCode, data) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

/**
 * Vercel Serverless Function handler for /api/health
 * Reports whether the key is configured and whether LTA answered,
 * for checking the service without opening the app.
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Content-Type', 'application/json');

  const accountKey = process.env.LTA_ACCOUNT_KEY;
  const keyConfigured = Boolean(accountKey && accountKey.trim().length > 0);

  let ltaAnswered = false;
  let ltaStatusCode = null;

  if (keyConfigured) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      // Probe with standard default bus stop code 04121
      const probeResponse = await fetch(
        'https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=04121',
        {
          method: 'GET',
          headers: {
            AccountKey: accountKey.trim(),
            accept: 'application/json',
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      ltaStatusCode = probeResponse.status;
      if (probeResponse.ok) {
        ltaAnswered = true;
      }
    } catch {
      ltaAnswered = false;
    }
  }

  const result = {
    status: keyConfigured && ltaAnswered ? 'ok' : 'degraded',
    keyConfigured,
    ltaAnswered,
    ltaStatusCode,
    timestamp: new Date().toISOString(),
  };

  return sendResponse(res, 200, result);
}

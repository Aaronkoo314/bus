import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bus,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Sparkles,
  Search,
} from 'lucide-react';
import { BusServiceArrival, HealthStatus } from '../types';

const PRESET_STOPS = [
  { code: '04121', name: 'Old Parliament Bldg (Default)' },
  { code: '01012', name: 'Hotel Grand Pacific (Victoria St)' },
  { code: '09048', name: 'Orchard Plaza (Orchard Rd)' },
  { code: '80019', name: 'VivoCity (Telok Blangah Rd)' },
  { code: '03019', name: 'Raffles Hotel (Bras Basah Rd)' },
];

export const BusArrivalPanel: React.FC = () => {
  const [busStopCode, setBusStopCode] = useState<string>('04121');
  const [inputCode, setInputCode] = useState<string>('04121');
  const [services, setServices] = useState<BusServiceArrival[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState<number>(30);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [useSamplePreview, setUseSamplePreview] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check backend health endpoint
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data: HealthStatus = await res.json();
        setHealth(data);
      }
    } catch {
      // Health check failure is handled gracefully
    }
  }, []);

  // Fetch bus arrival list from /api/bus
  const fetchArrivals = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setErrorMsg(null);
      try {
        const sampleQuery = useSamplePreview ? '&sample=true' : '';
        const res = await fetch(
          `/api/bus?BusStopCode=${encodeURIComponent(busStopCode)}${sampleQuery}`
        );
        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }
        const data = await res.json();
        const list: BusServiceArrival[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.services)
            ? data.services
            : [];
        setServices(list);
        setLastUpdated(new Date());
        setSecondsUntilRefresh(30);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Unable to load bus arrivals';
        setErrorMsg(message);
      } finally {
        setLoading(false);
      }
    },
    [busStopCode, useSamplePreview]
  );

  // Initial load and on parameter changes
  useEffect(() => {
    checkHealth();
    fetchArrivals();
  }, [fetchArrivals, checkHealth]);

  // 30-second interval refresh as required
  useEffect(() => {
    const timer = setInterval(() => {
      fetchArrivals(true);
    }, 30000);

    return () => clearInterval(timer);
  }, [fetchArrivals]);

  // Countdown timer ticker for visual refresh indicator
  useEffect(() => {
    const ticker = setInterval(() => {
      setSecondsUntilRefresh((prev) => (prev <= 1 ? 30 : prev - 1));
    }, 1000);

    return () => clearInterval(ticker);
  }, []);

  const handleStopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCode.trim();
    if (clean && clean !== busStopCode) {
      setBusStopCode(clean);
    }
  };

  const formatArrival = (minutes: number | null) => {
    if (minutes === null || minutes === undefined) {
      return (
        <span className="text-zinc-400 dark:text-zinc-500 font-medium">—</span>
      );
    }
    if (minutes < 1) {
      return (
        <span
          id={`arrival-status-arriving-${minutes}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
          Arriving
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
        {minutes} {minutes === 1 ? 'min' : 'mins'}
      </span>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Panel */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shadow-xs">
                <Bus className="w-5 h-5" />
              </div>
              <div>
                <h1
                  id="page-title"
                  className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
                >
                  Live Bus Arrivals
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                  Real-time arrival panel with 30-second auto-refresh
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Health pill */}
            <div
              id="health-indicator"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              title={
                health?.keyConfigured
                  ? 'LTA API key configured'
                  : 'LTA API key pending in Vercel environment'
              }
            >
              {health?.keyConfigured ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Key Connected</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Key Pending</span>
                </>
              )}
            </div>

            {/* Manual Refresh Button */}
            <button
              id="manual-refresh-button"
              type="button"
              onClick={() => fetchArrivals()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Bus Stop Selector & Search */}
        <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form
            onSubmit={handleStopSubmit}
            className="flex items-center gap-2 w-full md:w-auto"
          >
            <div className="relative flex-1 sm:w-64">
              <MapPin className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="bus-stop-input"
                type="text"
                maxLength={5}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Bus Stop Code (e.g. 04121)"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400 transition"
              />
            </div>
            <button
              id="search-stop-button"
              type="submit"
              className="px-3.5 py-2 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition cursor-pointer"
            >
              Set Stop
            </button>
          </form>

          {/* Preset quick buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-zinc-400 mr-1 font-medium">Quick:</span>
            {PRESET_STOPS.map((preset) => (
              <button
                key={preset.code}
                id={`preset-stop-${preset.code}`}
                type="button"
                onClick={() => {
                  setBusStopCode(preset.code);
                  setInputCode(preset.code);
                }}
                className={`px-2.5 py-1 text-xs rounded-md font-mono transition cursor-pointer ${
                  busStopCode === preset.code
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300'
                }`}
                title={preset.name}
              >
                {preset.code}
              </button>
            ))}
          </div>
        </div>

        {/* Current Stop & Status Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              Stop Code: <span className="font-mono text-zinc-900 dark:text-zinc-100 font-bold">{busStopCode}</span>
            </span>
            <span>•</span>
            <span>
              {PRESET_STOPS.find((p) => p.code === busStopCode)?.name || 'Custom Stop'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-400" />
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <span className="text-zinc-400">
              Next refresh in <span className="font-semibold text-zinc-700 dark:text-zinc-300">{secondsUntilRefresh}s</span>
            </span>
          </div>
        </div>
      </header>

      {/* Info notice when key is not configured */}
      {health && !health.keyConfigured && (
        <div
          id="key-notice-banner"
          className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs sm:text-sm space-y-2"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">
                LTA Account Key is not detected in this environment.
              </p>
              <p className="text-amber-800/90 dark:text-amber-300/90 text-xs leading-relaxed">
                The key lives in your Vercel environment variable named{' '}
                <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/80 font-mono text-[11px]">
                  LTA_ACCOUNT_KEY
                </code>
                . Once configured on Vercel, live data will stream automatically.
              </p>
            </div>
          </div>
          <div className="pl-6.5 pt-1">
            <button
              id="toggle-sample-button"
              type="button"
              onClick={() => setUseSamplePreview((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-200/80 hover:bg-amber-200 dark:bg-amber-900 dark:hover:bg-amber-850 text-amber-950 dark:text-amber-100 transition cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>
                {useSamplePreview
                  ? 'Switch back to Live API'
                  : 'Toggle Sample Preview Data'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Sample Preview Active Indicator */}
      {useSamplePreview && (
        <div
          id="sample-preview-badge"
          className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-200 text-xs"
        >
          <span className="font-medium">
            Viewing sample response simulation (via /api/bus?sample=true)
          </span>
          <button
            id="disable-sample-button"
            type="button"
            onClick={() => setUseSamplePreview(false)}
            className="underline hover:text-blue-950 dark:hover:text-blue-100 font-semibold cursor-pointer"
          >
            Disable sample
          </button>
        </div>
      )}

      {/* Error alert if fetch failed */}
      {errorMsg && (
        <div
          id="error-alert"
          className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-sm flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Services List Panel */}
      <main id="arrivals-panel" className="space-y-4">
        {loading && services.length === 0 ? (
          <div
            id="loading-skeleton"
            className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center space-y-3"
          >
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-zinc-400" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
              Checking bus arrivals for stop {busStopCode}...
            </p>
          </div>
        ) : services.length === 0 ? (
          /* Plain sentence when no buses are running at this stop */
          <div
            id="empty-services-panel"
            className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 sm:p-12 text-center space-y-2 bg-zinc-50/50 dark:bg-zinc-900/30"
          >
            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center">
              <Bus className="w-6 h-6" />
            </div>
            <p
              id="no-buses-running-text"
              className="text-base sm:text-lg font-medium text-zinc-800 dark:text-zinc-200"
            >
              No buses running at this bus stop right now.
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Services may have ended for the day or this stop is currently out of operation.
            </p>
          </div>
        ) : (
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xs">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-zinc-100/80 dark:bg-zinc-900/80 text-xs font-semibold text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 uppercase tracking-wider">
              <div className="col-span-3 sm:col-span-3">Service</div>
              <div className="col-span-4 sm:col-span-4 text-center sm:text-left">Next Bus</div>
              <div className="col-span-5 sm:col-span-5 text-right sm:text-left">2nd Bus</div>
            </div>

            {/* Service Rows */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-white dark:bg-zinc-900">
              {services.map((item) => {
                const hasNoBuses = item.next === null && item.next2 === null;

                return (
                  <div
                    key={item.ServiceNo}
                    id={`service-row-${item.ServiceNo}`}
                    className="grid grid-cols-12 gap-2 px-4 py-3.5 items-center hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    {/* Service Number Badge */}
                    <div className="col-span-3 sm:col-span-3">
                      <span
                        id={`service-badge-${item.ServiceNo}`}
                        className="inline-flex items-center justify-center min-w-14 px-3 py-1 rounded-lg text-sm sm:text-base font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-mono tracking-tight shadow-2xs"
                      >
                        {item.ServiceNo}
                      </span>
                    </div>

                    {/* Next Arrivals or Plain Sentence */}
                    {hasNoBuses ? (
                      <div className="col-span-9 sm:col-span-9">
                        <p
                          id={`service-no-buses-${item.ServiceNo}`}
                          className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 italic"
                        >
                          No buses running for this service.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div
                          id={`service-${item.ServiceNo}-next`}
                          className="col-span-4 sm:col-span-4 text-center sm:text-left"
                        >
                          {formatArrival(item.next)}
                        </div>
                        <div
                          id={`service-${item.ServiceNo}-next2`}
                          className="col-span-5 sm:col-span-5 text-right sm:text-left"
                        >
                          {formatArrival(item.next2)}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer Attribution & Independent Notice */}
      <footer
        id="app-footer"
        className="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-2 text-center text-xs text-zinc-500 dark:text-zinc-400"
      >
        <p className="font-medium text-zinc-700 dark:text-zinc-300">
          Data source: LTA DataMall, under the Singapore Open Data Licence v1.0.
        </p>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 max-w-xl mx-auto">
          This service provides public transport arrival estimates. It is an independent application and is not affiliated with, sponsored, or endorsed by the Land Transport Authority.
        </p>
      </footer>
    </div>
  );
};

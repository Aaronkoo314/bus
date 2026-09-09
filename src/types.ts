export interface BusServiceArrival {
  ServiceNo: string;
  next: number | null;
  next2: number | null;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  keyConfigured: boolean;
  ltaAnswered: boolean;
  ltaStatusCode?: number | null;
  timestamp: string;
}

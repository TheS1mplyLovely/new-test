export interface SensorData {
  plantStatus: string;
  stressScore: number;
  soilMoisture: number;
  temperature: number;
  measuredRgb: { r: number; g: number; b: number };
  timestamp: string;
}

export interface AppSettings {
  espIp: string;
  referenceRgb: { r: number; g: number; b: number };
  pollingInterval: number;
  language: 'en' | 'tr' | 'ru' | 'az';
  theme: 'light' | 'dark';
  notificationsEnabled: boolean;
}

export interface EspResponse {
  status: 'success' | 'error';
  data?: any;
  message?: string;
}

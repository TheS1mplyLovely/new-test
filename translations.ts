import { SensorData, EspResponse } from '../types';
import { estimatePeakFrequencyKHz } from '../utils/thresholds';

class EspService {
  private static instance: EspService;
  private baseUrl: string = '';

  private constructor() {}

  static getInstance(): EspService {
    if (!EspService.instance) {
      EspService.instance = new EspService();
    }
    return EspService.instance;
  }

  setBaseUrl(ip: string) {
    this.baseUrl = ip.startsWith('http') ? ip : `http://${ip}`;
  }

  async fetchSensorData(): Promise<SensorData> {
    if (!this.baseUrl) throw new Error('ESP32 IP not configured');
    
    try {
      const response = await fetch(`${this.baseUrl}/data`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }

  async sendCommand(endpoint: string): Promise<EspResponse> {
    if (!this.baseUrl) throw new Error('ESP32 IP not configured');
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        signal: AbortSignal.timeout(5000)
      });
      return await response.json();
    } catch (error) {
      return { status: 'error', message: 'Connection failed' };
    }
  }

  // Simulation mode for preview — eşik tablosundaki üç durumu da kapsayan rastgele ham veri üretir.
  // Durum (plantStatus) ve stres puanı App.tsx içinde evaluatePlantStatus/computeStressScore ile hesaplanır.
  getMockData(): SensorData {
    const soilMoisture = Math.round(Math.random() * 15 * 10) / 10; // %0 - %15
    const hourlySoundCount = Math.round(Math.random() * 45 * 10) / 10; // 0 - 45 ses/saat
    return {
      plantStatus: 'Healthy',
      stressScore: 0,
      soilMoisture,
      temperature: Math.round((18 + Math.random() * 12) * 10) / 10,
      hourlySoundCount,
      peakFrequencyKHz: estimatePeakFrequencyKHz(hourlySoundCount),
      measuredRgb: {
        r: Math.floor(Math.random() * 255),
        g: Math.floor(Math.random() * 255),
        b: Math.floor(Math.random() * 255)
      },
      timestamp: new Date().toISOString()
    };
  }
}

export const espService = EspService.getInstance();

import { PlantStatus } from '../types';

// Eşik değerleri ölçüm verilerinden alındı (akustik + toprak nemi + görsel kalibrasyon).
// Sağlıklı / Erken Uyarı / Kritik Durum sınırları burada tek yerde tutuluyor,
// böylece canlı ESP32 verisi ile demo (mock) veri aynı mantıktan geçiyor.

const ACOUSTIC = {
  healthyMax: 1,        // < 1 ses/saat
  warningMin: 10,        // 10 - 35 ses/saat
  criticalMin: 35.4,      // > 35.4 (± 6.1) ses/saat
};

const MOISTURE_VWC_PERCENT = {
  healthyMin: 10,   // VWC > 0.10 -> %10
  warningMax: 5,    // VWC < 0.05 -> %5
  criticalMax: 1,   // VWC < 0.01 -> %1
};

const VISUAL_SIMILARITY = {
  healthyMin: 85,
  warningMin: 70,
};

const PEAK_FREQUENCY_KHZ = 49.6;
const PEAK_FREQUENCY_TOLERANCE_KHZ = 0.4;

function acousticLevel(hourlySoundCount: number): PlantStatus {
  if (hourlySoundCount > ACOUSTIC.criticalMin) return 'Critical';
  if (hourlySoundCount >= ACOUSTIC.warningMin) return 'Warning';
  return 'Healthy';
}

function moistureLevel(soilMoisturePercent: number): PlantStatus {
  if (soilMoisturePercent < MOISTURE_VWC_PERCENT.criticalMax) return 'Critical';
  if (soilMoisturePercent < MOISTURE_VWC_PERCENT.warningMax) return 'Warning';
  return 'Healthy';
}

function visualLevel(similarityPercent: number): PlantStatus {
  if (similarityPercent < VISUAL_SIMILARITY.warningMin) return 'Critical';
  if (similarityPercent < VISUAL_SIMILARITY.healthyMin) return 'Warning';
  return 'Healthy';
}

const severity: Record<PlantStatus, number> = { Healthy: 0, Warning: 1, Critical: 2 };

function worstOf(levels: PlantStatus[]): PlantStatus {
  return levels.reduce((worst, current) => (severity[current] > severity[worst] ? current : worst), 'Healthy' as PlantStatus);
}

export interface StressInput {
  soilMoisture: number;
  hourlySoundCount: number;
  visualSimilarity?: number;
}

// Üç sensör grubundan en kötü durumu döndürür (tek bir kritik değer bile alarmı tetikler)
export function evaluatePlantStatus({ soilMoisture, hourlySoundCount, visualSimilarity }: StressInput): PlantStatus {
  const levels = [moistureLevel(soilMoisture), acousticLevel(hourlySoundCount)];
  if (visualSimilarity !== undefined) levels.push(visualLevel(visualSimilarity));
  return worstOf(levels);
}

// 0-100 arası tek bir stres puanı; aynı eşiklerden türetilir, kategorik durumla çelişmez
export function computeStressScore({ soilMoisture, hourlySoundCount, visualSimilarity }: StressInput): number {
  const moisturePart = clamp(((MOISTURE_VWC_PERCENT.healthyMin - soilMoisture) / MOISTURE_VWC_PERCENT.healthyMin) * 100, 0, 100);
  const acousticPart = clamp((hourlySoundCount / ACOUSTIC.criticalMin) * 100, 0, 100);
  const visualPart = visualSimilarity !== undefined ? clamp(100 - visualSimilarity, 0, 100) : 0;
  return Math.round(Math.max(moisturePart, acousticPart, visualPart));
}

// Tabloya göre pik frekans yalnızca akustik aktivite başladığında (>=1 ses/saat) ortaya çıkıyor
export function estimatePeakFrequencyKHz(hourlySoundCount: number): number {
  if (hourlySoundCount < ACOUSTIC.healthyMax) return 0;
  const jitter = (Math.random() * 2 - 1) * PEAK_FREQUENCY_TOLERANCE_KHZ;
  return Math.round((PEAK_FREQUENCY_KHZ + jitter) * 10) / 10;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

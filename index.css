import React, { useState, useEffect, useCallback } from 'react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { 
  Droplets, 
  Thermometer, 
  Activity, 
  Settings as SettingsIcon, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Github,
  User,
  Camera,
  RotateCcw,
  Bell,
  BellOff,
  Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SensorData, AppSettings } from './types';
import { espService } from './services/espService';
import { translations } from './translations';
import { evaluatePlantStatus, computeStressScore } from './utils/thresholds';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings' | 'history' | 'camera'>('dashboard');
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [history, setHistory] = useState<SensorData[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Camera State
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraRgb, setCameraRgb] = useState<{r: number, g: number, b: number} | null>(null);
  const [cameraAnalysisRgb, setCameraAnalysisRgb] = useState<{r: number, g: number, b: number} | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Ayarları localStorage'dan yükle, yoksa varsayılanları kullan
  const loadSettings = (): AppSettings => {
    try {
      const saved = localStorage.getItem('domniot_settings');
      if (saved) return { ...{
        espIp: '192.168.1.100',
        referenceRgb: { r: 120, g: 180, b: 80 },
        pollingInterval: 5000,
        language: 'en',
        theme: 'dark',
        notificationsEnabled: false
      }, ...JSON.parse(saved) };
    } catch {}
    return {
      espIp: '192.168.1.100',
      referenceRgb: { r: 120, g: 180, b: 80 },
      pollingInterval: 5000,
      language: 'en',
      theme: 'dark',
      notificationsEnabled: false
    };
  };

  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  // Ayarlar değişince localStorage'a kaydet
  useEffect(() => {
    try {
      localStorage.setItem('domniot_settings', JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const lastNotificationTime = React.useRef<number>(0);
  const NOTIFICATION_COOLDOWN = 60000; // 1 minute

  // Uygulama açılışında kamera + bildirim izni iste
  useEffect(() => {
    const requestStartupPermissions = async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        // Kamera izni
        await CapCamera.requestPermissions({ permissions: ['camera'] });
        // Bildirim izni
        await LocalNotifications.requestPermissions();
      } catch (err) {
        console.error('Startup permission error:', err);
      }
    };
    requestStartupPermissions();
  }, []);

  // Calculate RGB Similarity
  const calculateSimilarity = (m: {r:number, g:number, b:number}, r: {r:number, g:number, b:number}) => {
    const distance = Math.sqrt(
      Math.pow(m.r - r.r, 2) + 
      Math.pow(m.g - r.g, 2) + 
      Math.pow(m.b - r.b, 2)
    );
    const maxDistance = Math.sqrt(Math.pow(255, 2) * 3);
    return Math.max(0, 100 - (distance / maxDistance) * 100).toFixed(1);
  };

  const t = translations[settings.language];

  // Notification Logic — Capacitor native + web fallback
  const requestNotificationPermission = async () => {
    // Zaten açıksa kapat
    if (settings.notificationsEnabled) {
      setSettings(prev => ({ ...prev, notificationsEnabled: false }));
      return;
    }
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await LocalNotifications.requestPermissions();
        if (result.display === 'granted') {
          setSettings(prev => ({ ...prev, notificationsEnabled: true }));
        } else {
          alert(t.notificationPermissionDenied);
        }
      } else {
        if (!("Notification" in window)) return;
        if (Notification.permission !== "granted") {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            setSettings(prev => ({ ...prev, notificationsEnabled: true }));
          } else {
            alert(t.notificationPermissionDenied);
          }
        } else {
          setSettings(prev => ({ ...prev, notificationsEnabled: true }));
        }
      }
    } catch (err) {
      console.error("Notification permission error:", err);
    }
  };

  const sendNotification = useCallback((title: string, body: string) => {
    if (!settings.notificationsEnabled) return;
    const now = Date.now();
    if (now - lastNotificationTime.current < NOTIFICATION_COOLDOWN) return;
    lastNotificationTime.current = now;

    try {
      if (Capacitor.isNativePlatform()) {
        LocalNotifications.schedule({
          notifications: [{
            id: Math.floor(Date.now() / 1000),
            title,
            body,
            smallIcon: 'ic_stat_icon_config_sample',
          }]
        });
      } else if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body, icon: '/favicon.ico', tag: 'domniot-alert' });
      }
    } catch (err) {
      console.error("Notification error:", err);
    }
  }, [settings.notificationsEnabled]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      let data: SensorData;
      if (isLive) {
        espService.setBaseUrl(settings.espIp);
        data = await espService.fetchSensorData();
      } else {
        // Mock data for demo
        data = espService.getMockData();
      }

      // Merge camera analysis if available
      let visualSimilarity: number | undefined;
      if (cameraAnalysisRgb) {
        data.measuredRgb = cameraAnalysisRgb;
        visualSimilarity = Number(calculateSimilarity(cameraAnalysisRgb, settings.referenceRgb));
      }

      // Akustik + toprak nemi + (varsa) görsel benzerlik eşik tablosuna göre durumu belirler
      data.plantStatus = evaluatePlantStatus({
        soilMoisture: data.soilMoisture,
        hourlySoundCount: data.hourlySoundCount,
        visualSimilarity
      });
      data.stressScore = computeStressScore({
        soilMoisture: data.soilMoisture,
        hourlySoundCount: data.hourlySoundCount,
        visualSimilarity
      });

      // Check for notification triggers
      if (data.plantStatus === 'Warning') {
        sendNotification(t.earlyWarningTitle, t.statusMessageWarning);
      }
      if (data.plantStatus === 'Critical') {
        sendNotification(t.criticalAlertTitle, t.statusMessageCritical);
      }

      setSensorData(data);
      setHistory(prev => [...prev.slice(-19), data]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [isLive, settings.espIp, cameraAnalysisRgb, settings.referenceRgb, sendNotification, t]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, settings.pollingInterval);
    return () => clearInterval(interval);
  }, [refreshData, settings.pollingInterval]);

  // Camera Logic — Capacitor native + web fallback
  const getAvailableCameras = async () => {
    if (Capacitor.isNativePlatform()) return; // Native'de kamera seçimi yok
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCameraId) {
        setSelectedCameraId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error("Error enumerating cameras:", err);
    }
  };

  const startCamera = async (deviceId?: string) => {
    if (Capacitor.isNativePlatform()) {
      // Native Android: Capacitor Camera izni kontrol et
      try {
        const perms = await CapCamera.requestPermissions({ permissions: ['camera'] });
        if (perms.camera !== 'granted') {
          setCameraError(t.cameraError);
        } else {
          setCameraError(null);
        }
      } catch (err) {
        console.error("Camera permission error:", err);
        setCameraError(t.cameraError);
      }
      return;
    }
    // Web fallback
    try {
      stopCamera();
      const constraints = deviceId
        ? { video: { deviceId: { exact: deviceId } } }
        : { video: { facingMode: 'environment' } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraError(null);
      getAvailableCameras();
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError(t.cameraError);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const capturePhoto = async () => {
    if (Capacitor.isNativePlatform()) {
      // Native Android: Capacitor Camera ile fotoğraf çek
      try {
        const photo = await CapCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
        });
        if (photo.dataUrl) {
          setCapturedImage(photo.dataUrl);
          // RGB analizi için canvas kullan
          const img = new Image();
          img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              analyzeImage(ctx, img.width, img.height);
            }
          };
          img.src = photo.dataUrl;
        }
      } catch (err) {
        console.error("Capture error:", err);
        setCameraError(t.cameraError);
      }
      return;
    }
    // Web fallback
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageData);
        analyzeImage(ctx, canvas.width, canvas.height);
        stopCamera();
      }
    }
  };

  const analyzeImage = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    let r = 0, g = 0, b = 0;
    const count = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }

    const avgR = Math.floor(r / count);
    const avgG = Math.floor(g / count);
    const avgB = Math.floor(b / count);

    const newRgb = { r: avgR, g: avgG, b: avgB };
    setCameraRgb(newRgb);
    setCameraAnalysisRgb(newRgb);
    
    // If we have sensor data, update it with the camera RGB to "support" health status
    if (sensorData) {
      const similarity = Number(calculateSimilarity(newRgb, settings.referenceRgb));
      const newStatus = evaluatePlantStatus({
        soilMoisture: sensorData.soilMoisture,
        hourlySoundCount: sensorData.hourlySoundCount,
        visualSimilarity: similarity
      });
      setSensorData({
        ...sensorData,
        measuredRgb: newRgb,
        plantStatus: newStatus,
        stressScore: computeStressScore({
          soilMoisture: sensorData.soilMoisture,
          hourlySoundCount: sensorData.hourlySoundCount,
          visualSimilarity: similarity
        })
      });
    }
  };

  const resetCamera = () => {
    setCapturedImage(null);
    setCameraRgb(null);
    setCameraAnalysisRgb(null);
    if (!Capacitor.isNativePlatform()) startCamera();
  };

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return; // Native: video stream yok
    if (activeTab === 'camera') {
      startCamera(selectedCameraId);
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab, selectedCameraId]);

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-500",
      settings.theme === 'dark' ? "bg-[#0A0A0A] text-white" : "bg-[#F5F5F5] text-[#1A1A1A]"
    )}>
      {/* Navigation Rail (Desktop) */}
      <nav className={cn(
        "hidden md:flex fixed left-0 top-0 h-full w-20 border-r flex-col items-center py-8 gap-8 z-50 backdrop-blur-xl transition-colors duration-500",
        settings.theme === 'dark' ? "bg-black/20 border-white/5" : "bg-white/50 border-black/5"
      )}>
        <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Droplets className="text-white" size={24} />
        </div>
        
        <div className="flex-1 flex flex-col gap-4">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Activity size={20} />} label={t.dashboard} theme={settings.theme} />
          <NavButton active={activeTab === 'camera'} onClick={() => setActiveTab('camera')} icon={<Camera size={20} />} label={t.camera} theme={settings.theme} />
          <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<RefreshCw size={20} />} label={t.history} theme={settings.theme} />
          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon size={20} />} label={t.settings} theme={settings.theme} />
        </div>

        <div className="flex flex-col gap-4 items-center">
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            isLive ? "bg-emerald-500 shadow-[0_0_10px_#10b981]" : "bg-red-500 shadow-[0_0_10px_#ef4444]"
          )} />
          <div className={cn(
            "w-10 h-10 rounded-full border flex items-center justify-center overflow-hidden",
            settings.theme === 'dark' ? "border-white/10" : "border-black/10"
          )}>
            <User size={18} className={settings.theme === 'dark' ? "text-white/40" : "text-black/40"} />
          </div>
        </div>
      </nav>

      {/* Bottom Navigation (Mobile) */}
      <nav className={cn(
        "md:hidden fixed bottom-0 left-0 w-full h-16 border-t flex items-center justify-around z-50 backdrop-blur-2xl px-4 transition-colors duration-500",
        settings.theme === 'dark' ? "bg-black/40 border-white/5" : "bg-white/80 border-black/5"
      )}>
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Activity size={20} />} label={t.dashboard} theme={settings.theme} />
        <NavButton active={activeTab === 'camera'} onClick={() => setActiveTab('camera')} icon={<Camera size={20} />} label={t.camera} theme={settings.theme} />
        <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<RefreshCw size={20} />} label={t.history} theme={settings.theme} />
        <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon size={20} />} label={t.settings} theme={settings.theme} />
      </nav>

      {/* Main Content */}
      <main className="md:pl-20 min-h-screen pb-20 md:pb-0">
        <header className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tighter italic">Domn<span className="text-emerald-500">Iot</span></h1>
            <p className={cn(
              "text-[10px] mt-1 uppercase tracking-[0.2em] font-bold",
              settings.theme === 'dark' ? "text-white/40" : "text-black/40"
            )}>{t.systemStatus}: {isLive ? t.online : t.offline}</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button 
              onClick={() => setIsLive(!isLive)}
              className={cn(
                "flex-1 md:flex-none px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                isLive 
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                  : settings.theme === 'dark' 
                    ? "bg-white/5 text-white/40 border border-white/10" 
                    : "bg-black/5 text-black/40 border border-black/10"
              )}
            >
              {isLive ? t.offline : t.online}
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-12 gap-6"
              >
                {/* Status Hero */}
                <div className={cn(
                  "md:col-span-12 border rounded-[2.5rem] p-8 relative overflow-hidden group transition-colors duration-500",
                  settings.theme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm"
                )}>
                  <div className={cn(
                    "absolute top-0 right-0 p-8 transition-opacity",
                    settings.theme === 'dark' ? "opacity-10 group-hover:opacity-20" : "opacity-5 group-hover:opacity-10"
                  )}>
                    <Activity size={120} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                      {sensorData?.plantStatus === 'Healthy' ? (
                        <CheckCircle2 className="text-emerald-500" size={20} />
                      ) : sensorData?.plantStatus === 'Warning' ? (
                        <AlertTriangle className="text-amber-500" size={20} />
                      ) : (
                        <AlertTriangle className="text-red-500" size={20} />
                      )}
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        settings.theme === 'dark' ? "text-white/60" : "text-black/60"
                      )}>{t.plantCondition}</span>
                      {cameraAnalysisRgb && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[8px] font-bold uppercase tracking-widest border border-emerald-500/20">
                          {t.cameraAnalysis}
                        </span>
                      )}
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-2 italic leading-tight">
                      {sensorData?.plantStatus === 'Healthy' ? t.healthy : sensorData?.plantStatus === 'Warning' ? t.earlyWarning : t.critical}
                    </h2>
                    <p className={cn(
                      "text-xs md:text-sm font-medium",
                      sensorData?.plantStatus === 'Healthy'
                        ? "text-emerald-500"
                        : sensorData?.plantStatus === 'Warning' ? "text-amber-500" : "text-red-500"
                    )}>
                      {sensorData?.plantStatus === 'Healthy' ? t.statusMessageHealthy : sensorData?.plantStatus === 'Warning' ? t.statusMessageWarning : t.statusMessageCritical}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 mt-6 md:mt-8">
                      <div>
                        <p className={cn(
                          "text-[10px] uppercase tracking-widest mb-1",
                          settings.theme === 'dark' ? "text-white/40" : "text-black/40"
                        )}>{t.stressScore}</p>
                        <p className="text-2xl md:text-3xl font-mono">{sensorData?.stressScore || 0}%</p>
                      </div>
                      <div className={cn(
                        "hidden sm:block w-px h-12",
                        settings.theme === 'dark' ? "bg-white/10" : "bg-black/10"
                      )} />
                      <div>
                        <p className={cn(
                          "text-[10px] uppercase tracking-widest mb-1",
                          settings.theme === 'dark' ? "text-white/40" : "text-black/40"
                        )}>{t.lastUpdate}</p>
                        <p className="text-2xl md:text-3xl font-mono">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sensor Grid */}
                <div className={cn(
                  "md:col-span-3 border rounded-[2rem] p-6 transition-colors duration-500",
                  settings.theme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm"
                )}>
                  <div className="flex justify-between items-start mb-8">
                    <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-500">
                      <Droplets size={24} />
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      settings.theme === 'dark' ? "text-white/40" : "text-black/40"
                    )}>{t.soilMoisture}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl md:text-6xl font-bold tracking-tighter">{sensorData?.soilMoisture || 0}</span>
                    <span className={cn(
                      "text-xl font-mono",
                      settings.theme === 'dark' ? "text-white/40" : "text-black/40"
                    )}>%</span>
                  </div>
                  <div className={cn(
                    "mt-4 h-1 w-full rounded-full overflow-hidden",
                    settings.theme === 'dark' ? "bg-white/5" : "bg-black/5"
                  )}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${sensorData?.soilMoisture || 0}%` }}
                      className="h-full bg-blue-500"
                    />
                  </div>
                </div>

                <div className={cn(
                  "md:col-span-3 border rounded-[2rem] p-6 transition-colors duration-500",
                  settings.theme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm"
                )}>
                  <div className="flex justify-between items-start mb-8">
                    <div className="p-3 rounded-2xl bg-orange-500/20 text-orange-500">
                      <Thermometer size={24} />
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      settings.theme === 'dark' ? "text-white/40" : "text-black/40"
                    )}>{t.temperature}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl md:text-6xl font-bold tracking-tighter">{sensorData?.temperature || 0}</span>
                    <span className={cn(
                      "text-xl font-mono",
                      settings.theme === 'dark' ? "text-white/40" : "text-black/40"
                    )}>°C</span>
                  </div>
                  <p className={cn(
                    "mt-4 text-[10px] font-bold uppercase tracking-widest",
                    settings.theme === 'dark' ? "text-white/40" : "text-black/40"
                  )}>Optimal range: 18°C - 28°C</p>
                </div>

                {/* Akustik (Piezo) Sensör */}
                <div className={cn(
                  "md:col-span-3 border rounded-[2rem] p-6 transition-colors duration-500",
                  settings.theme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm"
                )}>
                  <div className="flex justify-between items-start mb-8">
                    <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-500">
                      <Volume2 size={24} />
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      settings.theme === 'dark' ? "text-white/40" : "text-black/40"
                    )}>{t.acousticActivity}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl md:text-6xl font-bold tracking-tighter">{sensorData?.hourlySoundCount ?? 0}</span>
                    <span className={cn(
                      "text-xl font-mono",
                      settings.theme === 'dark' ? "text-white/40" : "text-black/40"
                    )}>/{t.hour}</span>
                  </div>
                  <p className={cn(
                    "mt-4 text-[10px] font-bold uppercase tracking-widest",
                    settings.theme === 'dark' ? "text-white/40" : "text-black/40"
                  )}>{t.peakFrequency}: {sensorData?.peakFrequencyKHz ? `${sensorData.peakFrequencyKHz} kHz` : '—'}</p>
                </div>

                {/* RGB Analysis */}
                <div className={cn(
                  "md:col-span-3 border rounded-[2rem] p-6 flex flex-col justify-between transition-colors duration-500",
                  settings.theme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm"
                )}>
                  <div className="flex justify-between items-start">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      settings.theme === 'dark' ? "text-white/40" : "text-black/40"
                    )}>{t.leafColorAnalysis}</span>
                    <div className="flex gap-2">
                      <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: `rgb(${settings.referenceRgb.r}, ${settings.referenceRgb.g}, ${settings.referenceRgb.b})` }} title={t.reference} />
                      <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: `rgb(${sensorData?.measuredRgb.r || 0}, ${sensorData?.measuredRgb.g || 0}, ${sensorData?.measuredRgb.b || 0})` }} title={t.current} />
                    </div>
                  </div>
                  
                  <div className="text-center py-4">
                    <p className="text-5xl font-bold tracking-tighter">
                      {sensorData ? calculateSimilarity(sensorData.measuredRgb, settings.referenceRgb) : '0.0'}%
                    </p>
                    <p className={cn(
                      "text-[10px] uppercase tracking-widest mt-1",
                      settings.theme === 'dark' ? "text-white/40" : "text-black/40"
                    )}>{t.realTimeTrends}</p>
                  </div>

                  <button className={cn(
                    "w-full py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-colors",
                    settings.theme === 'dark' 
                      ? "bg-white/5 border-white/10 hover:bg-white/10" 
                      : "bg-black/5 border-black/5 hover:bg-black/10"
                  )}>
                    {t.calibrateSensor}
                  </button>
                </div>

                {/* Mini Chart */}
                <div className={cn(
                  "md:col-span-12 border rounded-[2.5rem] p-8 h-64 transition-colors duration-500",
                  settings.theme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm"
                )}>
                   <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={settings.theme === 'dark' ? "#ffffff05" : "#00000005"} vertical={false} />
                      <XAxis dataKey="timestamp" hide />
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: settings.theme === 'dark' ? '#111' : '#fff', 
                          border: settings.theme === 'dark' ? '1px solid #333' : '1px solid #eee', 
                          borderRadius: '12px', 
                          fontSize: '10px',
                          color: settings.theme === 'dark' ? '#fff' : '#000'
                        }}
                        itemStyle={{ color: settings.theme === 'dark' ? '#fff' : '#000' }}
                      />
                      <Area type="monotone" dataKey="soilMoisture" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMoisture)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-2xl font-bold mb-6 italic">{t.dataHistory}</h3>
                <div className={cn(
                  "border rounded-[2rem] overflow-hidden transition-colors duration-500",
                  settings.theme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm"
                )}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className={cn(
                          "border-b transition-colors",
                          settings.theme === 'dark' ? "border-white/5 bg-white/5" : "border-black/5 bg-black/5"
                        )}>
                          <th className={cn(
                            "px-6 py-4 text-[10px] uppercase tracking-widest",
                            settings.theme === 'dark' ? "text-white/40" : "text-black/40"
                          )}>{t.time}</th>
                          <th className={cn(
                            "px-6 py-4 text-[10px] uppercase tracking-widest",
                            settings.theme === 'dark' ? "text-white/40" : "text-black/40"
                          )}>{t.soilMoisture}</th>
                          <th className={cn(
                            "px-6 py-4 text-[10px] uppercase tracking-widest",
                            settings.theme === 'dark' ? "text-white/40" : "text-black/40"
                          )}>{t.temperature}</th>
                          <th className={cn(
                            "px-6 py-4 text-[10px] uppercase tracking-widest",
                            settings.theme === 'dark' ? "text-white/40" : "text-black/40"
                          )}>{t.status}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.slice().reverse().map((entry, i) => (
                          <tr key={i} className={cn(
                            "border-b transition-colors",
                            settings.theme === 'dark' ? "border-white/5 hover:bg-white/5" : "border-black/5 hover:bg-black/5"
                          )}>
                            <td className={cn(
                              "px-6 py-4 text-sm font-mono",
                              settings.theme === 'dark' ? "text-white/60" : "text-black/60"
                            )}>{entry.timestamp}</td>
                            <td className="px-6 py-4 text-sm font-bold text-blue-500">{entry.soilMoisture}%</td>
                            <td className="px-6 py-4 text-sm font-bold text-orange-500">{entry.temperature}°C</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2 py-1 rounded-md text-[8px] font-bold uppercase tracking-widest",
                                entry.plantStatus === 'Healthy'
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : entry.plantStatus === 'Warning'
                                    ? "bg-amber-500/10 text-amber-500"
                                    : "bg-red-500/10 text-red-500"
                              )}>
                                {entry.plantStatus === 'Healthy' ? t.healthy : entry.plantStatus === 'Warning' ? t.earlyWarning : t.critical}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'camera' && (
              <motion.div 
                key="camera"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-4xl mx-auto space-y-6"
              >
                <div className={cn(
                  "border rounded-[2.5rem] p-8 transition-colors duration-500",
                  settings.theme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm"
                )}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold italic">{t.cameraAnalysis}</h3>
                    <div className="flex items-center gap-4">
                      {availableCameras.length > 1 && (
                        <select
                          value={selectedCameraId}
                          onChange={(e) => setSelectedCameraId(e.target.value)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border outline-none transition-colors",
                            settings.theme === 'dark' 
                              ? "bg-white/5 border-white/10 text-white" 
                              : "bg-black/5 border-black/10 text-black"
                          )}
                        >
                          {availableCameras.map((camera) => (
                            <option key={camera.deviceId} value={camera.deviceId} className="bg-neutral-900">
                              {camera.label || `${t.camera} ${camera.deviceId.slice(0, 4)}`}
                            </option>
                          ))}
                        </select>
                      )}
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          cameraStream ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                        )} />
                        <span className="text-[10px] uppercase tracking-widest font-bold opacity-40">
                          {cameraStream ? t.cameraReady : t.cameraStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="relative aspect-video rounded-[2rem] overflow-hidden bg-black/20 border border-white/5">
                    {!capturedImage ? (
                      <>
                        {Capacitor.isNativePlatform() ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/30">
                            <Camera size={64} className="opacity-40" />
                            <p className="text-white/60 text-sm font-bold uppercase tracking-widest text-center px-8">
                              Fotoğraf çekmek için butona bas
                            </p>
                            {cameraError && (
                              <div className="flex items-center gap-2 text-amber-400">
                                <AlertTriangle size={16} />
                                <p className="text-xs font-bold">{cameraError}</p>
                              </div>
                            )}
                            <button
                              onClick={capturePhoto}
                              className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
                            >
                              <div className="w-14 h-14 rounded-full border-2 border-black/10 flex items-center justify-center">
                                <Camera size={28} className="text-black" />
                              </div>
                            </button>
                          </div>
                        ) : (
                          <>
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              className="w-full h-full object-cover"
                            />
                            {cameraError && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white p-4 text-center">
                                <div className="space-y-2">
                                  <AlertTriangle className="mx-auto text-amber-500" size={32} />
                                  <p className="text-sm font-bold">{cameraError}</p>
                                </div>
                              </div>
                            )}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
                              <button
                                onClick={capturePhoto}
                                disabled={!cameraStream}
                                className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
                              >
                                <div className="w-12 h-12 rounded-full border-2 border-black/10" />
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
                          <button 
                            onClick={resetCamera}
                            className="px-6 py-3 rounded-full bg-white text-black font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl hover:scale-105 transition-transform"
                          >
                            <RotateCcw size={14} />
                            {t.resetCamera}
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <canvas ref={canvasRef} className="hidden" />

                  {cameraRgb && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
                    >
                      <div className={cn(
                        "p-6 rounded-[2rem] border",
                        settings.theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/5"
                      )}>
                        <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-4">{t.current} RGB</p>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl border border-white/10" style={{ backgroundColor: `rgb(${cameraRgb.r}, ${cameraRgb.g}, ${cameraRgb.b})` }} />
                          <div className="font-mono text-sm">
                            <p>R: {cameraRgb.r}</p>
                            <p>G: {cameraRgb.g}</p>
                            <p>B: {cameraRgb.b}</p>
                          </div>
                        </div>
                      </div>

                      <div className={cn(
                        "p-6 rounded-[2rem] border md:col-span-2",
                        settings.theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/5"
                      )}>
                        <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-4">{t.plantCondition}</p>
                        <div className="flex items-center gap-6">
                          <div className="text-4xl font-bold italic tracking-tighter">
                            {(() => {
                              const camStatus = evaluatePlantStatus({
                                soilMoisture: sensorData?.soilMoisture ?? 100,
                                hourlySoundCount: sensorData?.hourlySoundCount ?? 0,
                                visualSimilarity: Number(calculateSimilarity(cameraRgb, settings.referenceRgb))
                              });
                              return camStatus === 'Healthy' ? t.healthy : camStatus === 'Warning' ? t.earlyWarning : t.critical;
                            })()}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-2">
                              <span>{t.stressScore}</span>
                              <span>{Math.max(0, 100 - Number(calculateSimilarity(cameraRgb, settings.referenceRgb))).toFixed(1)}%</span>
                            </div>
                            <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 transition-all duration-1000" 
                                style={{ width: `${calculateSimilarity(cameraRgb, settings.referenceRgb)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={cn(
                  "max-w-2xl border rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 transition-colors duration-500",
                  settings.theme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm"
                )}
              >
                <h3 className="text-2xl font-bold mb-8 italic">{t.systemConfiguration}</h3>
                
                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className={cn(
                      "text-[10px] uppercase tracking-widest font-bold",
                      settings.theme === 'dark' ? "text-white/40" : "text-black/40"
                    )}>{t.espIpAddress}</label>
                    <input 
                      type="text" 
                      value={settings.espIp}
                      onChange={(e) => setSettings({...settings, espIp: e.target.value})}
                      className={cn(
                        "w-full border rounded-2xl px-6 py-4 font-mono text-emerald-500 focus:outline-none focus:border-emerald-500/50 transition-colors",
                        settings.theme === 'dark' ? "bg-black/40 border-white/10" : "bg-black/5 border-black/10"
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className={cn(
                        "text-[10px] uppercase tracking-widest font-bold",
                        settings.theme === 'dark' ? "text-white/40" : "text-black/40"
                      )}>{t.pollingRate}</label>
                      <select 
                        value={settings.pollingInterval}
                        onChange={(e) => setSettings({...settings, pollingInterval: Number(e.target.value)})}
                        className={cn(
                          "w-full border rounded-2xl px-6 py-4 focus:outline-none transition-colors",
                          settings.theme === 'dark' ? "bg-black/40 border-white/10 text-white" : "bg-black/5 border-black/10 text-black"
                        )}
                      >
                        <option value={1000}>1 {t.second}</option>
                        <option value={5000}>5 {t.seconds}</option>
                        <option value={10000}>10 {t.seconds}</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className={cn(
                        "text-[10px] uppercase tracking-widest font-bold",
                        settings.theme === 'dark' ? "text-white/40" : "text-black/40"
                      )}>{t.interfaceTheme}</label>
                      <div className={cn(
                        "flex border rounded-2xl p-1 transition-colors",
                        settings.theme === 'dark' ? "bg-black/40 border-white/10" : "bg-black/5 border-black/10"
                      )}>
                        <button 
                          onClick={() => setSettings({...settings, theme: 'dark'})}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all", 
                            settings.theme === 'dark' 
                              ? "bg-white/10 text-white" 
                              : "text-black/40 hover:text-black"
                          )}
                        >
                          {t.dark}
                        </button>
                        <button 
                          onClick={() => setSettings({...settings, theme: 'light'})}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all", 
                            settings.theme === 'light' 
                              ? settings.theme === 'dark' ? "bg-white/10 text-white" : "bg-black/10 text-black"
                              : settings.theme === 'dark' ? "text-white/40 hover:text-white" : "text-black/40 hover:text-black"
                          )}
                        >
                          {t.light}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={cn(
                      "text-[10px] uppercase tracking-widest font-bold",
                      settings.theme === 'dark' ? "text-white/40" : "text-black/40"
                    )}>{t.interfaceLanguage}</label>
                    <div className={cn(
                      "grid grid-cols-2 gap-1 border rounded-2xl p-1 transition-colors",
                      settings.theme === 'dark' ? "bg-black/40 border-white/10" : "bg-black/5 border-black/10"
                    )}>
                      {([
                        { code: 'en', label: t.english },
                        { code: 'tr', label: t.turkish },
                        { code: 'ru', label: t.russian },
                        { code: 'az', label: t.azerbaijani },
                      ] as { code: typeof settings.language, label: string }[]).map(({ code, label }) => (
                        <button
                          key={code}
                          onClick={() => setSettings({...settings, language: code})}
                          className={cn(
                            "py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                            settings.language === code
                              ? settings.theme === 'dark' ? "bg-white/10 text-white" : "bg-black/10 text-black"
                              : settings.theme === 'dark' ? "text-white/40 hover:text-white" : "text-black/40 hover:text-black"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={cn(
                      "text-[10px] uppercase tracking-widest font-bold",
                      settings.theme === 'dark' ? "text-white/40" : "text-black/40"
                    )}>{t.notifications}</label>
                    <button 
                      onClick={requestNotificationPermission}
                      className={cn(
                        "w-full flex items-center justify-between border rounded-2xl px-6 py-4 transition-colors",
                        settings.theme === 'dark' ? "bg-black/40 border-white/10" : "bg-black/5 border-black/10"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {settings.notificationsEnabled ? (
                          <Bell className="text-emerald-500" size={18} />
                        ) : (
                          <BellOff className="text-white/20" size={18} />
                        )}
                        <span className={cn(
                          "text-sm font-bold",
                          settings.notificationsEnabled ? "text-white" : "text-white/40"
                        )}>
                          {settings.notificationsEnabled ? t.notificationsEnabled : t.notificationsDisabled}
                        </span>
                      </div>
                      <div className={cn(
                        "w-10 h-5 rounded-full relative transition-colors",
                        settings.notificationsEnabled ? "bg-emerald-500" : "bg-white/10"
                      )}>
                        <motion.div 
                          animate={{ x: settings.notificationsEnabled ? 22 : 2 }}
                          className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                        />
                      </div>
                    </button>
                  </div>

                  <div className={cn(
                    "pt-8 border-t",
                    settings.theme === 'dark' ? "border-white/5" : "border-black/5"
                  )}>
                    <button className="w-full py-4 rounded-2xl bg-emerald-500 text-black font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20">
                      {t.saveChanges}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <footer className={cn(
          "p-8 mt-auto border-t flex justify-between items-center text-[10px] uppercase tracking-widest font-bold transition-colors duration-500",
          settings.theme === 'dark' ? "border-white/5 text-white/20" : "border-black/5 text-black/20"
        )}>
          <div className="flex gap-4">
            <span>Domn<span className="text-emerald-500/50">Iot</span> v2.4.0</span>
            <span>•</span>
            <span>{t.developedBy} Ahmet Elieyi</span>
          </div>
          <div className="flex gap-4">
            <Github size={14} className={cn(
              "cursor-pointer transition-colors",
              settings.theme === 'dark' ? "hover:text-white" : "hover:text-black"
            )} />
          </div>
        </footer>
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label, theme }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, theme: 'light' | 'dark' }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center gap-1 transition-all duration-300 flex-1 md:flex-none",
        active 
          ? "text-emerald-500" 
          : theme === 'dark' ? "text-white/40 hover:text-white" : "text-black/40 hover:text-black"
      )}
    >
      <div className={cn(
        "w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
        active 
          ? "bg-emerald-500/10 border border-emerald-500/20" 
          : theme === 'dark' 
            ? "bg-transparent border border-transparent hover:border-white/10" 
            : "bg-transparent border border-transparent hover:border-black/10"
      )}>
        {icon}
      </div>
      <span className="text-[8px] font-bold uppercase tracking-widest opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity">{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-active"
          className="absolute -bottom-2 md:-right-10 md:top-1/2 md:-translate-y-1/2 w-8 h-1 md:w-1 md:h-8 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"
        />
      )}
    </button>
  );
}

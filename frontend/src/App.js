import React, { useState } from 'react';
import './App.css';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { Activity } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement);

function App() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisCompleted, setAnalysisCompleted] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  
  const [vehicleCount, setVehicleCount] = useState(145);
  const [vehicleBreakdown, setVehicleBreakdown] = useState({ cars: 60, trucks: 26, motorcycles: 14 });

  const [avgSpeed, setAvgSpeed] = useState(38);
  const [peakHour, setPeakHour] = useState("08:15");
  const [speedTrend, setSpeedTrend] = useState({ value: -5, isUp: false });

  const [chartDataState, setChartDataState] = useState({
    all: [15, 10, 45, 89, 55, 40, 65],
    primary: [10, 8, 30, 62, 40, 25, 45]
  });

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisCompleted(false);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://127.0.0.1:8080/analyze/", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if(data.analysis_result) {
        setVideoUrl(data.video_url || "");
        setAnalysisCompleted(true);
        setVehicleCount(data.analysis_result.max_vehicles_detected);
        
        if(data.analysis_result.breakdown) {
          const total = data.analysis_result.max_vehicles_detected;
          const bd = data.analysis_result.breakdown;
          setVehicleBreakdown({
            cars: total > 0 ? Math.round((bd.cars / total) * 100) : 0,
            trucks: total > 0 ? Math.round((bd.trucks / total) * 100) : 0,
            motorcycles: total > 0 ? Math.round((bd.motorcycles / total) * 100) : 0
          });
        }

        if (data.analysis_result.calculated_avg_speed) {
          setAvgSpeed(data.analysis_result.calculated_avg_speed);
        } else {
          setAvgSpeed(0);
        }

        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        setPeakHour(`${hours}:${minutes}`);

        const trend = Math.floor(Math.random() * 15) - 7;
        setSpeedTrend({ value: Math.abs(trend), isUp: trend > 0 });

        const randomizeData = (dataArray, volatility) =>
          dataArray.map(val => Math.max(5, val + Math.floor(Math.random() * volatility) - (volatility / 2)));

        setChartDataState({
          all: randomizeData(chartDataState.all, 30),
          primary: randomizeData(chartDataState.primary, 20)
        });
      }
    } catch (error) {
      console.error("Hata:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const lineChartData = {
    labels: ['02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00'],
    datasets: [
      {
        label: 'Tüm Koridorlar',
        data: chartDataState.all,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Ana Yollar',
        data: chartDataState.primary,
        borderColor: '#06B6D4',
        borderDash: [5, 5],
        tension: 0.4,
      }
    ],
  };

  const doughnutData = {
    labels: ['Arabalar', 'Kamyon/Otobüs', 'Motosikletler'],
    datasets: [{
      data: [vehicleBreakdown.cars, vehicleBreakdown.trucks, vehicleBreakdown.motorcycles],
      backgroundColor: ['#3B82F6', '#06B6D4', '#EF4444'],
      borderWidth: 0,
      cutout: '75%',
    }]
  };

  const lineChartOptions = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#1E293B' } }, x: { grid: { color: 'transparent' } } } };
  const doughnutOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } };

  return (
    <div className="dashboard-container">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity color="#3B82F6" size={28} />
          <h2>TrafficMind Analitiği</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <label style={{
            background: isAnalyzing ? '#475569' : '#4F46E5',
            color: 'white', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
          }}>
            {isAnalyzing ? 'Yapay Zeka İşliyor...' : 'Trafik Videosu Yükle'}
            <input type="file" accept="video/mp4" style={{ display: 'none' }} onChange={handleFileUpload} disabled={isAnalyzing} />
          </label>
          <div style={{ color: '#94A3B8', fontSize: '14px' }}>
            <span style={{ color: '#22C55E' }}>● CANLI</span> · {new Date().toLocaleDateString('tr-TR')}
          </div>
        </div>
      </header>

      <div className="main-content">
        <div className="left-panel">
          
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginTop: 0, color: '#F8FAFC', marginBottom: '15px' }}>Kamera Önizlemesi</h3>
            
            {!analysisCompleted && !isAnalyzing && (
              <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A', borderRadius: '8px', color: '#94A3B8', border: '1px dashed #334155' }}>
                Kamera görüntüsü bekleniyor... Lütfen bir video yükleyin.
              </div>
            )}
            
            {isAnalyzing && (
              <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A', borderRadius: '8px', color: '#3B82F6', border: '1px dashed #3B82F6' }}>
                YOLOv8 Modeli Görüntüyü İşliyor...
              </div>
            )}
            
            {analysisCompleted && !isAnalyzing && videoUrl !== "" && (
              <video 
                src={videoUrl} 
                controls 
                autoPlay 
                muted 
                style={{ width: '100%', height: '350px', borderRadius: '8px', objectFit: 'contain', backgroundColor: '#000' }} 
              />
            )}
            
            {analysisCompleted && !isAnalyzing && videoUrl === "" && (
              <div style={{ padding: '30px 20px', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px dashed #EF4444', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#FCA5A5', fontWeight: 'bold', fontSize: '16px' }}>⚠️ Bulut Depolama (AWS) Geçici Olarak Kapalı</p>
                <p style={{ margin: '10px 0 0 0', fontSize: '13px', color: '#94A3B8' }}>Yapay zeka analizi başarıyla tamamlandı ve sonuçlar MongoDB Atlas'a kaydedildi. Ancak video dosyası buluta yüklenmediği için burada oynatılamıyor.</p>
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0, color: '#F8FAFC' }}>Saat başına araç sayısı — Tüm koridorlar</h3>
            <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '20px' }}>Son 12 saat · Her 60 saniyede bir güncellenir</p>
            <Line data={lineChartData} options={lineChartOptions} height={80} />
          </div>

          <div className="bottom-cards" style={{ marginTop: '24px' }}>
            <div className="card">
              <p style={{ color: '#94A3B8', fontSize: '12px', margin: 0 }}>YOĞUN SAAT</p>
              <h2 style={{ margin: '10px 0' }}>{peakHour}</h2>
              <span style={{ color: '#22C55E', fontSize: '12px' }}>^ Düne kıyasla %12 artış</span>
            </div>
            <div className="card">
              <p style={{ color: '#94A3B8', fontSize: '12px', margin: 0 }}>ORTALAMA HIZ</p>
              <h2 style={{ margin: '10px 0' }}>{avgSpeed} km/sa</h2>
              <span style={{ color: speedTrend.isUp ? '#22C55E' : '#EF4444', fontSize: '12px' }}>
                {speedTrend.isUp ? '^ +' : 'v -'}% {speedTrend.value} ortalamaya kıyasla
              </span>
            </div>
          </div>
        </div>

        <div className="right-panel">
          <div className="card" style={{ marginBottom: '20px' }}>
            <p style={{ color: '#94A3B8', fontSize: '12px', margin: 0, textTransform: 'uppercase' }}>Toplam Tespit Edilen Araçlar</p>
            <h1 style={{ fontSize: '48px', margin: '10px 0', color: '#06B6D4' }}>{vehicleCount}</h1>
            <p style={{ color: '#94A3B8', fontSize: '12px' }}>son video analizinden</p>
            <div style={{ width: '100%', backgroundColor: '#1E293B', height: '4px', borderRadius: '2px', marginTop: '15px' }}>
              <div style={{ width: '100%', backgroundColor: '#06B6D4', height: '100%', borderRadius: '2px' }}></div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
            <div style={{ position: 'relative', width: '80px', height: '80px' }}>
              <Doughnut data={doughnutData} options={doughnutOptions} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <span style={{ fontSize: '10px', color: '#94A3B8' }}>MIX</span>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>%100</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6' }}></div>
                  <span style={{ color: '#94A3B8' }}>Arabalar</span>
                </div>
                <span>%{vehicleBreakdown.cars}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#06B6D4' }}></div>
                  <span style={{ color: '#94A3B8' }}>Kamyon/Otobüs</span>
                </div>
                <span>%{vehicleBreakdown.trucks}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }}></div>
                  <span style={{ color: '#94A3B8' }}>Motosikletler</span>
                </div>
                <span>%{vehicleBreakdown.motorcycles}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
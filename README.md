# TrafficMind – Yapay Zeka Destekli Trafik Analiz Platformu

TrafficMind, trafik kameralarından alınan video kayıtlarını **derin öğrenme** ve **bilgisayarlı görü** teknikleriyle analiz eden, uçtan uca çalışan bulut tabanlı bir web platformudur. Yüklenen bir trafik videosunu işleyerek:

- 🚗 Videodaki **araç sayısını** tespit eder
- 🏷️ Araçları **türüne göre sınıflandırır** (araba, kamyon/otobüs, motosiklet)
- 📊 **Araç türü dağılımını** yüzdesel olarak hesaplar
- ⏱️ **Ortalama hız** ve saatlik yoğunluk gibi istatistikler üretir
- 🎥 Üzerine tespit kutuları (bounding box) çizilmiş videoyu bulutta arşivler
- 📈 Tüm sonuçları interaktif bir dashboard üzerinde görselleştirir

Bu proje, Zonguldak Bülent Ecevit Üniversitesi Bilgisayar Mühendisliği Bölümü BLM428 – Bulut Bilişim dersi kapsamında geliştirilmiştir.

---

## 🖥️ Ekran Görüntüsü

Yüklenen video analiz edildikten sonra dashboard üzerinde toplam araç sayısı, araç türü dağılımı, saatlik yoğunluk grafiği ve ortalama hız bilgisi gösterilir.

---

## 🏗️ Mimari

Sistem dört katmanlı bir mimariye sahiptir:

```
Kullanıcı (video yükler)
        │
        ▼
┌───────────────────┐
│   Frontend (React) │  →  FormData ile video yükleme, Chart.js ile görselleştirme
└─────────┬──────────┘
          │ HTTP POST /analyze/
          ▼
┌───────────────────┐
│  Backend (FastAPI) │  →  Geçici dosya yönetimi, AI modülüne yönlendirme
└─────────┬──────────┘
          │
          ▼
┌───────────────────┐
│  Yapay Zeka Katmanı │ →  YOLOv8 (Nano) + OpenCV: kare bazlı araç tespiti
└─────────┬──────────┘
          │
          ▼
┌───────────────────┐
│   Bulut Katmanı     │ →  AWS S3 (işlenmiş video arşivi)
│                     │    MongoDB Atlas (analiz istatistikleri)
└───────────────────┘
```

**Veri akışı:** Kullanıcı videoyu React arayüzünden yükler → FastAPI videoyu geçici olarak diske kaydeder → YOLOv8 + OpenCV video karelerini analiz edip araçları tespit eder → işlenmiş video AWS S3'e yüklenir → istatistikler MongoDB Atlas'a yazılır → sonuç JSON olarak React'a döner ve dashboard güncellenir → geçici dosyalar temizlenir.

---

## 🛠️ Kullanılan Teknolojiler

| Katman | Teknoloji | Görev |
|---|---|---|
| Yapay Zeka | YOLOv8 (Nano) | Araç tespiti ve sınıflandırma (COCO sınıfları: 2-araba, 3-motosiklet, 5-otobüs, 7-kamyon) |
| Yapay Zeka | OpenCV | Video kare ayrıştırma, bounding-box çizimi, çıktı videosu oluşturma |
| Backend | FastAPI | `/analyze/` endpoint'i, asenkron istek yönetimi, Pydantic doğrulama |
| Backend | Uvicorn | ASGI sunucu (`127.0.0.1:8080`) |
| Backend | Boto3 | AWS S3 ile video yükleme ve public URL üretimi |
| Backend | Pymongo + certifi | MongoDB Atlas'a güvenli (SSL/TLS) bağlantı |
| Frontend | React.js | Kullanıcı arayüzü, state yönetimi, dosya yükleme |
| Frontend | Chart.js / react-chartjs-2 | Doughnut ve line chart görselleştirmeleri |
| Frontend | Lucide-React | İkon kütüphanesi |
| Bulut | AWS S3 | İşlenmiş videoların kalıcı arşivlenmesi |
| Bulut | MongoDB Atlas | Analiz geçmişinin (`analysis_history`) saklanması |

---

## 📂 Proje Yapısı

```
TrafficMind/
├── .env                     # Gerçek gizli bilgiler (git'e gitmez)
├── .env.example              # Şablon (git'e gider)
├── .gitignore
├── requirements.txt
├── core/
│   └── analyzer.py        # YOLOv8 + OpenCV işleme motoru
├── main.py                 # FastAPI uygulama giriş noktası
├── yolov8n.pt               # Önceden eğitilmiş YOLOv8 Nano modeli
├── openh264-1.8.0-win64.dll # Video codec kütüphanesi (Windows)
└── frontend/
    ├── src/
    │   ├── App.js           # Ana React bileşeni
    │   ├── App.css          # Karanlık tema stilleri
    │   └── index.js
    └── package.json
```

---

## ⚙️ Kurulum

### Gereksinimler
- Python 3.10+
- Node.js 18+ ve npm
- AWS S3 bucket (public-read erişimli)
- MongoDB Atlas cluster'ı

### 1. Backend

```bash
# Proje kök dizininde
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

pip install -r requirements.txt
```

> 🔐 **Gizli bilgiler `.env` ile yönetiliyor.** MongoDB bağlantı bilgisi ve AWS anahtarları kod içine yazılmaz; `main.py` bunları ortam değişkenlerinden (`python-dotenv` ile) okur. Projeyi ilk kez kuruyorsan:
>
> 1. `.env.example` dosyasını kopyalayıp `.env` adıyla kaydet:
>    ```bash
>    cp .env.example .env
>    ```
> 2. `.env` içindeki değerleri kendi MongoDB Atlas ve AWS bilgilerinle doldur:
>    ```env
>    MONGO_URI=mongodb+srv://<kullanici_adi>:<sifre>@<cluster_adresi>.mongodb.net/?appName=Cluster0
>    AWS_ACCESS_KEY=<aws_access_key_id>
>    AWS_SECRET_KEY=<aws_secret_access_key>
>    BUCKET_NAME=<s3_bucket_adi>
>    REGION=<aws_region_orn_eu-north-1>
>    ```
> 3. `.env` dosyası `.gitignore` içinde olduğu için **repoya asla gitmez** — sadece kendi bilgisayarında/sunucunda kalır. GitHub'a giden tek şey içi boş `.env.example` şablonudur.
>
> Gerekli değişkenlerden biri eksikse `main.py` uygulamayı başlatırken hata verip durur; bu, boş kimlik bilgisiyle yanlışlıkla çalışmasını engeller.

Backend'i başlatmak için:

```bash
uvicorn main:app --host 127.0.0.1 --port 8080 --reload
```

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

Uygulama `http://localhost:3000` adresinde açılır ve `http://127.0.0.1:8080/analyze/` endpoint'ine istek atar.

---

## 🚀 Kullanım

1. Backend (`uvicorn`) ve frontend (`npm start`) sunucularını çalıştırın.
2. Tarayıcıda `localhost:3000` adresine gidin.
3. "Trafik Videosu Yükle" butonuna tıklayarak bir `.mp4` dosyası seçin.
4. Analiz tamamlandığında dashboard üzerinde:
   - Toplam tespit edilen araç sayısı
   - Araç türü dağılımı (doughnut grafik)
   - Saate göre araç yoğunluğu (line chart)
   - Ortalama hız ve yoğun saat bilgisi
   görüntülenir.
5. İşlenmiş video (üzerinde bounding-box'lar ile) AWS S3'te arşivlenir ve dashboard'daki oynatıcıdan izlenebilir.

---

## 📌 Bilinen Sınırlamalar / Gelecek Çalışmalar

- Mevcut sürümde **ortalama hız** sabit bir değer olarak hesaplanmaktadır; gerçek hız tahmini için şerit takibi ve kare-arası konum farkına dayalı bir algoritma planlanmaktadır.
- Sistem şu an tek kamera girişini desteklemektedir; çok kameralı ortamlara genişletme hedeflenmektedir.
- Model, COCO veri seti üzerinde eğitilmiş genel amaçlı YOLOv8 Nano'dur; trafik özelinde yeniden eğitim (fine-tuning) doğruluğu artırabilir.

---

## 👥 Geliştiriciler

- Arda Çoban
- Tahir Duman

Zonguldak Bülent Ecevit Üniversitesi – Bilgisayar Mühendisliği Bölümü
BLM428 – Bulut Bilişim Dersi (2025-2026)
Danışman: Dr. Öğr. Üyesi Semih Çakır

---

## 📚 Kaynaklar

- Jocher, G., Chaurasia, A., ve Qiu, J. (2023). *Ultralytics YOLOv8* (Sürüm 8.0.0). https://github.com/ultralytics/ultralytics
- Redmon, J. vd. (2016). *You Only Look Once: Unified, Real-Time Object Detection.* CVPR.
- Mell, P., ve Grance, T. (2011). *The NIST Definition of Cloud Computing.* NIST SP 800-145.
- Amazon Web Services. (2023). *Amazon S3 FAQs.* https://aws.amazon.com/s3/faqs/

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
import os
import shutil
import boto3 # AWS KÜTÜPHANESİ EKLENDİ
from datetime import datetime
from core.analyzer import process_traffic_video
import certifi
from dotenv import load_dotenv  # .env dosyasını okumak için eklendi

load_dotenv()  # Proje kök dizinindeki .env dosyasını yükler

app = FastAPI(title="TrafficMind API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- HASSAS BİLGİLER ARTIK .env DOSYASINDAN OKUNUYOR ---
MONGO_URI = os.getenv("MONGO_URI")

AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")
BUCKET_NAME = os.getenv("BUCKET_NAME")
REGION = os.getenv("REGION")

# Gerekli değişkenlerden biri eksikse uygulama başlarken hemen uyar
_required_env_vars = {
    "MONGO_URI": MONGO_URI,
    "AWS_ACCESS_KEY": AWS_ACCESS_KEY,
    "AWS_SECRET_KEY": AWS_SECRET_KEY,
    "BUCKET_NAME": BUCKET_NAME,
    "REGION": REGION,
}
_missing = [name for name, value in _required_env_vars.items() if not value]
if _missing:
    raise RuntimeError(
        f"Eksik ortam değişkenleri: {', '.join(_missing)}. "
        f"Lütfen proje kök dizininde bir .env dosyası oluşturun (bkz. .env.example)."
    )
# ---------------------------------------------------------

s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY,
    region_name=REGION
)
# -------------------------------

def get_db_collection():
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000, tlsCAFile=certifi.where())
        client.admin.command('ping') 
        db = client.TrafficMindDB
        return client, db.analysis_history
    except Exception as e:
        raise HTTPException(status_code=500, detail="Veritabanı bağlantısı kurulamadı.")

@app.post("/analyze/")
def analyze_video(file: UploadFile = File(...)):
    print(f"\n--- YENİ İSTEK GELDİ: {file.filename} ---")
    temp_input_path = f"temp_{file.filename}"
    temp_output_path = f"analyzed_{file.filename}"

    with open(temp_input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        print("1. YOLOv8 Analizi başlıyor... Lütfen bekleyin.")
        result = process_traffic_video(temp_input_path, temp_output_path)
        print("2. Analiz başarıyla bitti!")

        # --- AWS S3 YÜKLEME ADIMI ---
        print("3. Video AWS S3'e yükleniyor...")
        s3_file_name = f"analyzed_videos/{file.filename}"
        
        # Videoyu S3'e yükle (Tarayıcıda izlenebilmesi için ContentType belirtiyoruz)
        s3_client.upload_file(
            temp_output_path, 
            BUCKET_NAME, 
            s3_file_name, 
            ExtraArgs={'ContentType': 'video/mp4'}
        )
        
        # Yüklenen videonun public URL'ini oluştur
        video_url = f"https://{BUCKET_NAME}.s3.{REGION}.amazonaws.com/{s3_file_name}"
        print(f"4. S3 Yüklemesi Başarılı! URL: {video_url}")
        # ------------------------------------

        print("5. MongoDB Atlas'a bağlanılıyor...")
        client, collection = get_db_collection()
        
        analysis_data = {
            "video_name": file.filename,
            "analysis_date": datetime.now(),
            "total_vehicles": result["max_vehicles_detected"],
            "breakdown": result["breakdown"],
            "avg_speed": result.get("calculated_avg_speed", 0),
            "video_url": video_url, # Artık burası dolu gidiyor!
            "status": "completed"
        }

        collection.insert_one(analysis_data)
        client.close()
        print("6. Tüm veriler başarıyla kaydedildi!")

        return {
            "message": "Video başarıyla analiz edildi, S3'e yüklendi ve MongoDB'ye kaydedildi.",
            "filename": file.filename,
            "video_url": video_url,
            "analysis_result": result
        }

    except Exception as e:
        print(f"\n🚨 HATA OLUŞTU: {str(e)}\n")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        if os.path.exists(temp_input_path):
            os.remove(temp_input_path)
        if os.path.exists(temp_output_path):
            os.remove(temp_output_path)
        print("7. Geçici dosyalar temizlendi.")

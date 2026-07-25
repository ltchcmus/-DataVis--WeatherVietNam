
# Weather AI Data Analysis

Đây là dự án phân tích dữ liệu thời tiết Việt Nam, cung cấp hệ thống trực quan hóa trực quan và một Trợ lý AI thông minh (AI Assistant) hỗ trợ người dùng phân tích dữ liệu.

## Tổng Quan Dự Án

Dự án được chia thành 3 phần chính:

- **Backend (FastAPI)**: Đóng vai trò là hệ thống AI Data Analysis API. Backend chạy pipeline thu thập dữ liệu thời tiết tự động hằng ngày từ Open-Meteo Archive API và Air Quality API, lưu trữ vào Supabase, sau đó tạo caching sang `.csv` để tối ưu hóa hiệu suất truy vấn. Tích hợp AI (Gemini API) cung cấp các nhận định sâu sắc.
- **Frontend (ReactJS + Vite)**: Hệ thống Dashboard và AI Assistant Panel.
- **EDA (Exploratory Data Analysis)**: Phân tích và trực quan hóa dữ liệu thời tiết Việt Nam.

## Cấu Trúc Thư Mục

```text
Group7/
├── backend/          # Backend API (FastAPI) & Data Pipeline
├── frontend/         # Frontend Web (ReactJS, Vite, Recharts, Leaflet)
└── notebooks/        # Notebooks (Jupyter, VSCode) chứa EDA và phân tích dữ liệu
```

## Các Công Nghệ Sử Dụng

- **Data & Backend**: Python, FastAPI, APScheduler, Open-Meteo API, Supabase (PostgreSQL).
- **AI & LLM**: Google Gemini API, Pandas/Numpy cho data manipulation.
- **Frontend**: ReactJS, Vite, Tailwind CSS (hoặc thư viện CSS), Recharts (biểu đồ), Leaflet (bản đồ).

## Hướng Dẫn Cài Đặt và Khởi Chạy

### 1. Khởi chạy Backend

```bash
cd backend
python -m venv venv
# Active venv (Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt

# Cấu hình biến môi trường
cp .env.example .env
# Chỉnh sửa file .env với GEMINI_API_KEY và các thông tin cần thiết

# Khởi tạo Database và chạy Pipeline lần đầu tiên (đối với database mới)
python init_supabase.py
python run_pipeline_now.py

# Khởi chạy server
uvicorn app.main:app --reload --port 8000
```

Server chạy tại: http://localhost:8000
Tài liệu API (Swagger UI): http://localhost:8000/docs

### 2. Khởi chạy Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Trang web sẽ hiển thị tại: http://localhost:3000

---

*Dự án thực hiện bởi Nhóm 7.*

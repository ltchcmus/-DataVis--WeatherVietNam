# Backend — AI Data Analysis API

## Cấu trúc

```
backend/
├── app/
│   ├── main.py                 ← Entry point
│   ├── config.py               ← Config từ .env
│   ├── routers/
│   │   ├── ai.py               ← POST /ai/chat  [CÔNG]
│   │   ├── execute.py          ← POST /execute  [THỊNH - TODO]
│   │   ├── logs.py             ← GET  /logs     [THỊNH - TODO]
│   │   └── history.py          ← GET  /history  [THỊNH - TODO]
│   ├── services/
│   │   ├── ai_service.py       ← AI Orchestrator
│   │   ├── prompt_builder.py   ← Build system prompt
│   │   ├── llm_service.py      ← Gemini API wrapper
│   │   ├── response_parser.py  ← Parse LLM output
│   │   └── dataset_service.py  ← Load dataset metadata
│   ├── schemas/
│   │   └── chat.py             ← ChatRequest, ChatResponse DTOs
│   └── utils/
│       ├── security.py         ← Code safety validator
│       └── logger.py           ← Logger factory
├── data/
│   └── dataset.csv             ← Dataset chính (Hiếu cung cấp)
├── requirements.txt
├── .env.example
└── README.md
```

## Setup

### 1. Tạo virtual environment

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

### 2. Cài dependencies

```bash
pip install -r requirements.txt
```

### 3. Tạo file `.env`

```bash
cp .env.example .env
```

Mở `.env` và điền API key:
```
GEMINI_API_KEY=your_actual_gemini_api_key
DATASET_PATH=data/dataset.csv
```

### 4. Đặt dataset

Copy file CSV vào:
```
backend/data/dataset.csv
```

### 5. Khởi tạo Database và nạp dữ liệu (Data Pipeline)

**Bước 5.1: Khởi tạo bảng trên Supabase**
Chỉ cần chạy lệnh này **1 lần duy nhất** để tạo bảng `cities`, `weather_daily` và nạp tọa độ 1500 thành phố:
```bash
python init_supabase.py
```

**Bước 5.2: Chạy Data Pipeline để kéo thời tiết (Chạy lần đầu)**
Sau khi tạo bảng xong, chạy lệnh sau để kéo thời tiết từ API về lưu vào DB, sau đó xuất ra file `data/dataset.csv`:
```bash
python run_pipeline_now.py
```
*Lưu ý: Quá trình này sẽ gọi API để tải thời tiết, lưu vào Supabase, sau đó xuất ra `data/dataset.csv`. Tùy số lượng thành phố mà sẽ mất từ vài giây đến 1-2 phút. Các ngày sau hệ thống sẽ tự động chạy lúc 2h sáng.*

### 6. Chạy server AI (FastAPI)

```bash
uvicorn app.main:app --reload --port 8000
```

Server chạy tại: http://localhost:8000

## API Docs

Swagger UI: http://localhost:8000/docs

ReDoc: http://localhost:8000/redoc

## Error Codes

| Code | Ý nghĩa |
|------|---------|
| 400 | Bad Request (thiếu message, parse error) |
| 422 | Validation Error (Pydantic) |
| 500 | LLM Error |
| 503 | Rate limit / Gemini unavailable |

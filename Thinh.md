# Thịnh

## Files Cần Đọc

| File | Lý do cần đọc |
|------|--------------|
| `app/schemas/chat.py` | Format chính xác của ChatRequest & ChatResponse |
| `app/utils/security.py` | Dùng lại `validate_code()` trong /execute |
| `app/config.py` | Biết cách load DATASET_PATH, cách configure |
| `backend/README.md` | Setup môi trường, chạy server |

---

## Quan Trọng

```
POST /ai/chat → trả ChatResponse có:
  - request_id (uuid)     ← lưu vào DB khi user execute
  - conversation_id (uuid)← dùng để query /history
  - code (string)         ← nhận qua /execute để chạy
```

**Workflow:**
```
User → POST /ai/chat → { request_id, code, status: "pending" }
                    ↓ User review & approve
     → POST /execute → { code, request_id, conversation_id }
                    ↓ Run code
     → { result, chart, logs, execution_id }
                    ↓ Auto save
     → DB: execution_logs(request_id=..., conversation_id=..., ...)
```

---

## Database Design

Sử dụng PostgreSQL

### Schema:

```sql
-- Bảng conversations (track các cuộc hội thoại)
CREATE TABLE conversations (
    id          TEXT PRIMARY KEY,          -- UUID string, lấy từ conversation_id
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- Bảng execution_logs (log mỗi lần user approve & execute)
CREATE TABLE execution_logs (
    id                  TEXT PRIMARY KEY,  -- UUID mới, tạo khi execute
    conversation_id     TEXT REFERENCES conversations(id),
    request_id          TEXT NOT NULL,     -- Lấy từ ChatResponse.request_id
    prompt              TEXT,              -- Câu hỏi gốc của user
    generated_code      TEXT,             -- Code sinh ra (từ ChatResponse.code)
    approved_code       TEXT,             -- Code sau khi user edit (nếu có)
    output_type         TEXT,             -- "dataframe" | "chart" | "text" | "error"
    result_json         TEXT,             -- JSON string của kết quả
    chart_base64        TEXT,             -- Base64 encoded chart image
    execution_stdout    TEXT,             -- stdout khi chạy code
    execution_stderr    TEXT,             -- stderr/error messages
    executed_at         TIMESTAMP DEFAULT NOW()
);
```
- Cần thêm các table để conversation và history có thể khi click vô lại conversation củ thì sẽ hiển thị lại các tin nhắn đã chat cũ và các code đã sinh ra. Tức là có 1 DB lưu lại lịch sử chat và các code.

---

## API đề xuất mẫu nên xem xét chỉnh sửa field

---

### 1. `POST /execute`

**Nhận code từ frontend (sau khi user edit/approve):**

**Request:**
```json
{
  "code": "import pandas as pd\n...",
  "request_id": "uuid-from-ai-chat-response",
  "conversation_id": "uuid-string",
  "prompt": "câu hỏi gốc của user"
}
```

**Response (success): ví dụ**
```json
{
  "execution_id": "uuid",
  "status": "success",
  "output_type": "chart",
  "result": null,
  "chart_base64": "iVBORw0KGgo...",
  "logs": ["Loaded 25000 rows", "Filtered by province..."],
  "error": null
}
```

**Response (error): ví dụ**
```json
{
  "execution_id": "uuid",
  "status": "error",
  "output_type": "error",
  "result": null,
  "chart_base64": null,
  "logs": [],
  "error": "NameError: name 'df' is not defined"
}
```

**Logic xử lý:**
1. Validate code sau khi nó chỉnh sửa lại, trước khi execute, bằng `validate_code()` từ `app/utils/security.py` 
2. Nếu có dangerous patterns → reject với 400
3. Tạo sandbox execution environment:
   - Inject `df = pd.read_csv("data/dataset.csv")` vào đầu code nếu chưa có
   - Capture stdout, stderr
   - Detect chart output (matplotlib/plotly) → convert to base64
4. Execute code trong `exec()` với restricted globals
5. Lưu vào DB `execution_logs`
6. Trả kết quả

---

### 2. `GET /logs` Nên có UI để track log

**Query params:**
```
GET /logs?conversation_id=xxx&limit=20&offset=0
```

**Response:**
```json
{
  "total": 42,
  "logs": [
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "request_id": "uuid",
      "prompt": "So sánh AQI...",
      "generated_code": "import pandas...",
      "approved_code": "import pandas...",
      "output_type": "chart",
      "executed_at": "2025-07-01T10:30:00Z"
    }
  ]
}
```

---

### 3. `GET /history` Cần hiển thị list (phân trang) chọn thì sẽ hiển thị cuộc trò chuyện củ


---

### 4. `GET /data` Hiển thị list các cột có trong dataset và show 1 chút dữ liệu để user biết về dataset

**Response: mẫu**
```json
{
  "dataset_id": "default",
  "row_count": 25000,
  "columns": ["date", "province", "pm25", "pm10", "aqi", "temperature"],
  "preview": [
    {"date": "2023-01-01", "province": "Hà Nội", "aqi": 120}
  ]
}
```

> Gợi ý: Dùng lại `dataset_service.get_metadata()` và `dataset_service.get_dataframe()` từ code file app/api/services/dataset_service.py để có thể hiển thị metadata và preview data.

---

### Render theo `action`:
```javascript
switch (data.action) {
  case 'answer':
    // Render text message
    break;
  case 'generate_code':
    // Render code block + [Edit] [Approve] buttons
    break;
  case 'suggest_analysis':
    // Render list of suggestion chips
    break;
  case 'insight':
    // Render text với highlight
    break;
}
```

---

## Dependencies cần được thêm vô requirements.txt nếu có dùng thêm

---

**Lưu ý**: nếu có thay đổi code của em thì thầy liên hệ để em biết nữa nha
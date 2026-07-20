==================================================
HƯỚNG DẪN CHẠY CODE LOCAL (Runner)
==================================================

Yêu cầu: Python 3.10+ đã được cài đặt.

--------------------------------------------------
BƯỚC 1: Tạo môi trường ảo
--------------------------------------------------

Windows:
  python -m venv venv
  venv\Scripts\activate

macOS/Linux:
  python3 -m venv venv
  source venv/bin/activate

--------------------------------------------------
BƯỚC 2: Cài dependencies
--------------------------------------------------

  pip install -r runner/requirements.txt

--------------------------------------------------
BƯỚC 3: Lấy code từ AI Assistant
--------------------------------------------------

  1. Trong giao diện AI Assistant, sau khi AI sinh code,
     nhấn nút "Sao chép code" hoặc copy toàn bộ nội dung
     trong khung code.

  2. Paste vào file: runner/code.txt
     (tạo file nếu chưa có)

--------------------------------------------------
BƯỚC 4: Chạy
--------------------------------------------------

Từ thư mục gốc của project (backend/):

  python runner/runner.py

--------------------------------------------------
KẾT QUẢ
--------------------------------------------------

  - Biểu đồ Plotly: mở tự động trên browser
  - Biểu đồ Matplotlib: mở cửa sổ mới
  - DataFrame: in ra terminal
  - Lỗi: in đầy đủ traceback

--------------------------------------------------
LƯU Ý
--------------------------------------------------

  - File code.txt sẽ bị gitignore (không được commit)
  - Dataset cần có tại: data/dataset.csv
    (hệ thống tự động cập nhật mỗi 2h sáng)

==================================================

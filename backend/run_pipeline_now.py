import sys
from pathlib import Path

# Đảm bảo đường dẫn module hợp lệ
sys.path.append(str(Path(__file__).parent))

from app.pipeline.runner import run_pipeline

if __name__ == "__main__":
    print("🚀 Bắt đầu chạy Data Pipeline thủ công...")
    print("Luồng xử lý: Đọc tọa độ -> Fetch API -> Lưu Supabase -> Xuất dataset.csv")
    run_pipeline()
    print("✅ Hoàn tất! Hãy kiểm tra file backend/data/dataset.csv")

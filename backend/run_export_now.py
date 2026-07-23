"""
run_export_now.py — Script để export tất cả CSV files ngay lập tức.

Chạy từ thư mục backend/:
    python run_export_now.py

Hoặc từ thư mục gốc project:
    python backend/run_export_now.py

Script này sẽ:
  1. Kết nối Supabase (dùng credentials trong backend/.env)
  2. Export 4 file CSV: dataset7days, dataset30days, dataset90days, datasetall
  3. Copy tất cả sang frontend/public/data/ (failover offline)
"""
import sys
import os
from pathlib import Path

# Thêm backend vào path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Load .env
try:
    from dotenv import load_dotenv
    load_dotenv(backend_dir / ".env")
    print("✓ Loaded .env from backend/")
except ImportError:
    print("⚠ python-dotenv not installed, trying os.environ directly")

# Chạy export
print("\n" + "=" * 55)
print("  CSV EXPORT SCRIPT — Weather Dashboard")
print("=" * 55)

try:
    from app.pipeline.csv_manager import export_all_csvs
    results = export_all_csvs()

    print("\n" + "=" * 55)
    print("  RESULTS:")
    for preset, success in results.items():
        status = "✓ OK" if success else "✗ FAILED"
        print(f"  {preset:10} : {status}")
    
    success_count = sum(results.values())
    print(f"\n  {success_count}/{len(results)} presets exported successfully.")
    print("=" * 55)

    if success_count == 0:
        print("\n⚠ No files were generated. Check Supabase credentials in .env")
        sys.exit(1)
    else:
        print("\n✓ Done! CSV files are ready in backend/data/ and frontend/public/data/")

except Exception as e:
    print(f"\n✗ Export failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

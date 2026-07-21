import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from app.pipeline.runner import run_pipeline

if __name__ == "__main__":
    print("Bắt đầu chạy Data Pipeline...")
    run_pipeline()
    print("Hoàn tất!")

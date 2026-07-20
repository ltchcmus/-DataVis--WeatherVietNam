"""
runner.py — Chạy code Python do AI sinh ra ở local.

Cách dùng:
  1. Copy code từ AI Assistant vào file code.txt
  2. Chạy: python runner.py

Kết quả:
  - Biểu đồ: mở cửa sổ browser (plotly) hoặc cửa sổ matplotlib
  - DataFrame: in ra terminal
  - Lỗi: in traceback đầy đủ
"""
import sys
import traceback
from pathlib import Path

CODE_FILE = Path(__file__).parent / "code.txt"
DATA_FILE = Path(__file__).parent.parent / "data" / "dataset.csv"


def main():
    if not CODE_FILE.exists():
        print(f"[ERROR] Không tìm thấy file code.txt tại: {CODE_FILE}")
        print("Hướng dẫn: Copy code từ AI Assistant vào file runner/code.txt")
        sys.exit(1)

    if not DATA_FILE.exists():
        print(f"[WARNING] Không tìm thấy dataset tại: {DATA_FILE}")
        print("Dataset sẽ cần được load thủ công trong code.")

    code = CODE_FILE.read_text(encoding="utf-8")
    print("=" * 60)
    print("Đang chạy code...")
    print("=" * 60)

    import pandas as pd
    import numpy as np

    local_vars = {
        "pd": pd,
        "np": np,
    }

    # Thêm plotly nếu có
    try:
        import plotly.express as px
        import plotly.graph_objects as go
        local_vars["px"] = px
        local_vars["go"] = go
    except ImportError:
        pass

    # Thêm matplotlib nếu có
    try:
        import matplotlib.pyplot as plt
        local_vars["plt"] = plt
    except ImportError:
        pass

    try:
        exec(code, {}, local_vars)

        # Nếu có biến `fig` (plotly) → hiển thị
        if "fig" in local_vars:
            fig = local_vars["fig"]
            try:
                fig.show()
                print("\n[OK] Biểu đồ Plotly đã được mở trong browser.")
            except Exception as e:
                print(f"[WARNING] Không thể hiển thị Plotly chart: {e}")

        # Nếu có matplotlib chart
        try:
            import matplotlib.pyplot as plt
            if plt.get_fignums():
                plt.show()
        except ImportError:
            pass

        # Nếu có biến `result` là DataFrame
        if "result" in local_vars:
            result = local_vars["result"]
            if hasattr(result, "to_string"):
                print("\n[Kết quả DataFrame]")
                print(result.to_string(index=False))

        print("\n[OK] Thực thi thành công!")

    except Exception:
        print("\n[ERROR] Lỗi khi thực thi code:")
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

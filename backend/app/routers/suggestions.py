"""
2 suggestion templates lấy cảm hứng từ Weather-Monitor:
  1. Phân tích xu hướng nhiệt độ 7 ngày → line chart + trend
  2. Phát hiện ngày thời tiết bất thường → scatter/anomaly chart
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/suggestions", tags=["Suggestions"])


class Suggestion(BaseModel):
    id: str
    title: str
    description: str
    prompt: str
    expected_action: str
    icon: str


_SUGGESTIONS: List[Suggestion] = [
    Suggestion(
        id="trend_temperature",
        title="Phân tích xu hướng nhiệt độ",
        description="Vẽ biểu đồ đường xu hướng nhiệt độ 7 ngày gần nhất theo tỉnh thành",
        prompt=(
            "Hãy sinh code Python để vẽ biểu đồ phân tích xu hướng nhiệt độ 7 ngày gần nhất "
            "trong dataset. Sử dụng plotly để vẽ line chart với màu sắc theo từng tỉnh, "
            "thêm trend line tổng thể, hiển thị giá trị max/min, và tiêu đề bằng tiếng Việt. "
            "Gán kết quả vào biến `fig`. Giải thích xu hướng nhiệt độ đọc được từ biểu đồ."
        ),
        expected_action="generate_code",
        icon="📊",
    ),
    Suggestion(
        id="anomaly_detection",
        title="Phát hiện ngày thời tiết bất thường",
        description="Tìm và hiển thị những ngày có chỉ số thời tiết bất thường (nhiệt độ, mưa, AQI)",
        prompt=(
            "Hãy sinh code Python để phát hiện những ngày thời tiết bất thường trong dataset "
            "dựa trên phương pháp Z-score (ngưỡng ±2 sigma). Phân tích các chỉ số: nhiệt độ, "
            "lượng mưa, AQI. Dùng plotly để vẽ scatter plot, đánh dấu điểm bất thường bằng "
            "màu đỏ, điểm bình thường bằng màu xanh. Tiêu đề và nhãn bằng tiếng Việt. "
            "Gán kết quả vào biến `fig`. Tóm tắt những ngày và giá trị bất thường phát hiện được."
        ),
        expected_action="generate_code",
        icon="🔍",
    ),
]


@router.get("", response_model=List[Suggestion])
def get_suggestions():
    """Trả về danh sách gợi ý phân tích có sẵn."""
    return _SUGGESTIONS

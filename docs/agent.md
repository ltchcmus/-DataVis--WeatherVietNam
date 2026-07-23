# Agent Work Log

## Tab 3: So sánh giữa các tỉnh (2026-07-22)

### Mục tiêu
Xây dựng Tab 3 "So sánh giữa các tỉnh" cho dashboard thời tiết Việt Nam.
- Trả lời câu hỏi: Các tỉnh khác nhau như thế nào về khí hậu?
- 4 câu hỏi phụ: tỉnh nào nhiệt độ cao nhất, mưa nhiều nhất, AQI tốt nhất, nhóm tỉnh giống nhau

### Files đã tạo mới
- `backend/app/routers/comparison.py` — Router API với 5 endpoints:
  - `GET /comparison/provinces` — Danh sách tỉnh
  - `GET /comparison/boxplot` — Dữ liệu boxplot nhiệt độ
  - `GET /comparison/heatmap` — Heatmap Province × Variables (normalized)
  - `GET /comparison/scatter` — Scatter Humidity vs Temperature
  - `GET /comparison/ranking` — Ranking table sortable
- `frontend/src/components/Dashboard/Tab3Comparison.jsx` — Component chính Tab 3 với:
  - **Province Selector** — Multi-select tỉnh với search, max 10
  - **Boxplot** — Phân bố nhiệt độ trung bình theo tỉnh (custom SVG)
  - **Heatmap** — Ma trận Province × (Nhiệt độ, Mưa, Ẩm, Gió, AQI) đã normalize
  - **Scatter Plot** — Độ ẩm vs Nhiệt độ, color = tỉnh (Recharts)
  - **Ranking Table** — Bảng xếp hạng tỉnh, sortable theo các cột

### Files đã chỉnh sửa
- `backend/app/main.py` — Thêm import + register comparison router
- `frontend/vite.config.js` — Thêm proxy `/comparison`
- `frontend/src/services/api.js` — Thêm `comparisonService`
- `frontend/src/components/Dashboard/DashboardLayout.jsx` — Thêm tab "So sánh tỉnh" (id: comparison)
- `frontend/src/styles/dashboard.css` — Thêm ~600 dòng CSS cho Tab 3 (append cuối file)

### Lưu ý
- **KHÔNG** chỉnh sửa nội dung Tab 1 (overview), Tab 2 (climate), Tab AQI
- CSS mới được append cuối file, không sửa CSS hiện tại
- Backend cần `.env` đúng để chạy (hiện tại chưa verify được do `.env` chưa hoàn thiện)

### Tiêu chí đáp ứng (theo requirements.md)
| # | Tiêu chí | Cách đáp ứng |
|---|----------|---------------|
| 2 | Phù hợp mục đích | Boxplot (so sánh phân bố), Heatmap (tổng quan đa biến), Scatter (quan hệ 2 biến), Table (ranking) |
| 3 | Rõ ràng dễ hiểu | Tooltip tiếng Việt, labels rõ ràng, color coding nhất quán |
| 4 | Tích hợp liên kết | Filter tỉnh chung ảnh hưởng tất cả biểu đồ |
| 5 | Tương tác điều hướng | Hover tooltip, sort table, province multi-select, search |
| 6 | Thiết kế hấp dẫn | Gradient heatmap, animated transitions, premium card design |
| 7 | Phân tích dữ liệu | Normalized heatmap, ranking table, boxplot phân bố |

## Cập nhật Tab 3: Thay đổi Scatter Plot sang Radar Chart (2026-07-23)
- Thay đổi Scatter Plot (Độ ẩm vs Nhiệt độ) sang biểu đồ Radar so sánh hồ sơ khí hậu (Climate Profile).
- Cho phép người dùng chọn 1 hoặc 2 tỉnh trực tiếp trên widget biểu đồ để so sánh chéo.
- Hiển thị 5 biến khí hậu chính: Nhiệt độ, Mưa, Độ ẩm, Gió, AQI.
- Tích hợp tooltip tùy chỉnh để hiển thị thông số gốc thực tế (raw value) kèm đơn vị tương ứng.

### Files đã chỉnh sửa
- `frontend/src/components/Dashboard/ProvinceComparisonTab.jsx` — Tích hợp Recharts RadarChart và bộ lọc tỉnh cục bộ.
- `frontend/src/styles/dashboard.css` — Thêm CSS class cho selector và tooltip của Radar.
- `docs/dashboard.md` — Cập nhật tài liệu thiết kế.

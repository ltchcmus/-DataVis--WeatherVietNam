## Quy trình thực hiện
### Bước 1
Chọn một tập dữ liệu (dataset) có kích thước vừa phải và đủ độ phức tạp.
Nguồn dữ liệu gợi ý: Kaggle, UCI Machine Learning Repository, Google Dataset
Search, hoặc dữ liệu tự thu thập.
Yêu cầu: Dữ liệu phải rõ ràng về nguồn gốc và ý nghĩa.
### Bước 2: Phân tích Bài toán (Domain & Abstraction)
Domain Situation: Mô tả ngữ cảnh của dữ liệu. Ai là người sử dụng? Họ cần tìm
hiểu điều gì?
Abstraction (Trừu tượng hóa):
    What (Data): Xác định các loại dữ liệu (Table, Network, Spatial…), các thuộc tính (Categorical, Ordered, Quantitative), và các đặc điểm khác.
    Why (Task): Xác định mục tiêu của việc trực quan hóa.
### Bước 3: Thiết kế Trực quan
(Categorical, Ordered, Quantitative), và các đặc điểm khác.
Why (Task): Xác định mục tiêu của việc trực quan hóa.
How: Đề xuất các biểu đồ, kỹ thuật tương tác và bố cục (Layout) của Dashboard.
Biện luận: Tại sao chọn biểu đồ này? Nó phù hợp với dữ liệu (What) và nhiệm vụ
(Why) như thế nào?
Ví dụ: Sử dụng biểu đồ Bar Chart để so sánh doanh thu (Quantitative) giữa các
tháng (Ordered), sử dụng màu sắc để phân biệt vùng miền (Categorical).
Phải áp dụng các nguyên tắc về Visual Encoding, Perception, và Color Theory.
### Bước 4: Cài đặt
Sử dụng các công cụ hỗ trợ tạo Dashboard như: Tableau, PowerBI, Google Looker
Studio, hoặc các framework lập trình như Streamlit, Dash (Python).
Sản phẩm phải là một Dashboard hoàn chỉnh, tích hợp các biểu đồ khác nhau.
Các biểu đồ cần được bố trí hợp lý trên một màn hình, có tính liên kết và tương tác.

## Tiêu chí đánh giá
1. Kết hợp nguồn dữ liệu đáng tin cậy:
• Nếu có bất kỳ nguồn dữ liệu nào được sử dụng, đảm bảo rằng
nó đáng tin cậy và được cung cấp một cách minh bạch.
• Kiểm tra xem liệu có bất kỳ thiếu sót nào trong quy trình xử
lý dữ liệu hay không.
2. Phù hợp với mục đích:
• Trực quan hóa phải phản ánh mục đích cụ thể của nó. Ví dụ,
biểu đồ cột thích hợp để so sánh dữ liệu, trong khi biểu đồ
đường thích hợp để theo dõi xu hướng thời gian.
• Cân nhắc xem liệu trực quan hóa có phù hợp với đối tượng
mục tiêu hay không.
3. Rõ ràng và dễ hiểu:
• Trực quan hóa nên truyền đạt thông điệp một cách rõ ràng
và dễ hiểu.
• Biểu đồ và đồ thị nên được thiết kế sao cho người xem có thể
nhanh chóng nhận thức và hiểu thông tin.
4. Sự tích hợp và liên kết:
• Nếu có nhiều biểu đồ hoặc đồ thị, đảm bảo sự liên kết và tích
hợp giữa chúng.
• Mối quan hệ giữa các phần của trực quan hóa nên được làm
rõ.
5. Tương tác và điều hướng:
• Sự tương tác, nếu có, nên được tích hợp một cách hợp lý để
người xem có thể thăm dò dữ liệu.
• Hệ thống điều hướng nên được xây dựng một cách dễ sử dụng.
6. Thiết kế hấp dẫn:
• Thiết kế đồ họa và màu sắc nên làm cho trực quan hóa trở
nên hấp dẫn và dễ thu hút sự chú ý.
• Sử dụng màu sắc một cách có ý nghĩa và tránh sự quá tải
màu.
7. Phân tích dữ liệu:
• Trực quan hóa nên thể hiện sự thay đổi và xu hướng theo
thời gian nếu có.
• Mối quan hệ giữa các biến cần phải rõ ràng.
• Những kết luận và câu chuyện liên quan.
8. Tích hợp AI: Thiết kế và vận hành
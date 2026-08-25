const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
const prompt = `Bạn là một chuyên gia giáo dục. Hãy tìm kiếm trên internet các dạng bài tập mới nhất, chuẩn nhất theo sách giáo khoa để tạo ra 5 câu hỏi trắc nghiệm môn Toán, chủ đề Cộng trừ phạm vi 100.
Yêu cầu mức độ: Đa dạng mức độ (Dễ, Trung bình, Khó).
Trả về DUY NHẤT một mảng JSON các object câu hỏi theo định dạng:
[{
  "text": "Nội dung câu hỏi",
  "level": 1,
  "type": "MULTIPLE_CHOICE",
  "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
  "correct": "Đáp án đúng (phải khớp hoàn toàn với một trong các lựa chọn trong mảng options)"
}]`;
model.generateContent(prompt).then(res => {
  const text = res.response.text();
  console.log("=== RAW ===");
  console.log(text);
  console.log("=== MATCH ===");
  const match = text.match(/\[[\s\S]*\]/);
  console.log(match ? match[0] : "NO MATCH");
  if (match) {
    const json = JSON.parse(match[0]);
    console.log("Parsed Questions:", json.length);
  }
}).catch(console.error);

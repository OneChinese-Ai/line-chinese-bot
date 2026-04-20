# LINE Chinese Tutor Bot

บอท LINE OA สำหรับสอนภาษาจีน โดยรับข้อความจาก LINE ผ่าน Webhook แล้วส่งไปให้ OpenAI ตอบกลับ

## ไฟล์ในโปรเจกต์
- `app.py` : โค้ดหลัก
- `requirements.txt` : dependencies
- `render.yaml` : ตั้งค่า deploy บน Render
- `.env.example` : ตัวอย่าง environment variables

## 1) เตรียมค่าที่ต้องใช้
คุณต้องมี 3 ค่า
- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `OPENAI_API_KEY`

## 2) ทดสอบในเครื่อง
```bash
python -m venv .venv
source .venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
cp .env.example .env
# ใส่ค่าจริงใน .env
export $(grep -v '^#' .env | xargs)
uvicorn app:app --reload --port 8000
```

ถ้าเปิดได้ จะมี:
- หน้า root: `http://localhost:8000/`
- webhook: `http://localhost:8000/webhook`

## 3) Deploy บน Render
1. สมัคร Render
2. สร้าง Web Service ใหม่จาก repo หรืออัปโหลดโค้ด
3. ใช้ค่าตาม `render.yaml`
4. ตั้ง Environment Variables:
   - `LINE_CHANNEL_SECRET`
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL=gpt-5.4-mini`
5. Deploy

หลัง deploy คุณจะได้ URL เช่น:
`https://line-chinese-tutor-bot.onrender.com`

Webhook URL ที่ต้องเอาไปใส่ใน LINE คือ:
`https://line-chinese-tutor-bot.onrender.com/webhook`

## 4) ตั้งค่าใน LINE Developers
- วาง Webhook URL
- กด Verify
- เปิด Use webhook
- ปิด Auto-reply messages ใน LINE OA Manager เพื่อไม่ให้ข้อความชนกัน

## 5) แนะนำการใช้งาน
ผู้เรียนพิมพ์ได้เลย เช่น
- `ศัพท์ 喜欢`
- `ตรวจ 我昨天去学校了没有老师`
- `ฝึกคุย ร้านอาหาร`
- `ช่วยอธิบายคำว่า 努力`

## 6) ข้อควรระวัง
- ถ้าเคยเปิดเผย token ในรูป ให้กด Reissue ที่ LINE แล้วเปลี่ยน token ใหม่
- อย่าใส่ secret หรือ token ลงในโค้ดโดยตรง
- ถ้า LINE Verify webhook แล้วยังไม่ผ่าน ให้เช็กว่า URL เป็น https และลงท้าย `/webhook`

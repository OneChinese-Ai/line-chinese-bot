import os
from flask import Flask, request, abort
from openai import OpenAI
from linebot.v3 import WebhookHandler
from linebot.v3.exceptions import InvalidSignatureError
from linebot.v3.messaging import (
    Configuration,
    ApiClient,
    MessagingApi,
    ReplyMessageRequest,
    TextMessage,
)
from linebot.v3.webhooks import MessageEvent, TextMessageContent

app = Flask(__name__)

LINE_CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET")
LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.4-mini")

if not LINE_CHANNEL_SECRET or not LINE_CHANNEL_ACCESS_TOKEN or not OPENAI_API_KEY:
    raise ValueError("Missing required environment variables.")

handler = WebhookHandler(LINE_CHANNEL_SECRET)
configuration = Configuration(access_token=LINE_CHANNEL_ACCESS_TOKEN)
client = OpenAI(api_key=OPENAI_API_KEY)

SYSTEM_PROMPT = """
คุณคือผู้ช่วยสอนภาษาจีนสำหรับนักเรียนไทย
หน้าที่:
- อธิบายคำศัพท์ภาษาจีน
- ให้พินอินทุกครั้งเมื่อมีภาษาจีน
- แปลไทยเสมอ
- ยกตัวอย่างประโยคง่าย ๆ ใช้ได้จริง
- ตรวจประโยคจีนของนักเรียน
- ช่วยฝึกบทสนทนาแบบเพื่อนคุย
- ใช้น้ำเสียงใจดี เป็นกันเอง

ถ้าผู้ใช้ถามคำศัพท์ ให้ตอบรูปแบบนี้:
คำศัพท์:
Pinyin:
คำแปล:
อธิบาย:
ตัวอย่าง:
1)
2)

ถ้าผู้ใช้ส่งประโยคจีนมา ให้ตรวจและแก้แบบสุภาพ
ตอบสั้น อ่านง่าย เหมาะกับ LINE
"""

@app.route("/")
def home():
    return "LINE Chinese Bot is running.", 200

@app.route("/webhook", methods=["POST"])
def webhook():
    signature = request.headers.get("X-Line-Signature", "")
    body = request.get_data(as_text=True)

    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        abort(400)

    return "OK", 200

@handler.add(MessageEvent, message=TextMessageContent)
def handle_message(event):
    user_text = event.message.text

    response = client.responses.create(
        model=OPENAI_MODEL,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_text},
        ],
    )

    reply_text = response.output_text.strip() if hasattr(response, "output_text") else "ขอโทษค่ะ ตอนนี้ระบบตอบกลับไม่ได้"

    with ApiClient(configuration) as api_client:
        line_bot_api = MessagingApi(api_client)
        line_bot_api.reply_message(
            ReplyMessageRequest(
                reply_token=event.reply_token,
                messages=[TextMessage(text=reply_text[:5000])],
            )
        )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)

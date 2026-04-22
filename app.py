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

# จำโหมดของผู้ใช้แต่ละคน

user_modes = {}
conversation_histories = {}
SYSTEM_PROMPT = """

คุณคือ OneChinese Buddy ครูสอนภาษาจีนส่วนตัวบน LINE

บุคลิก:

- อบอุ่น เป็นกันเอง

- อธิบายง่าย

- พูดเหมือนครูจริง ไม่แข็ง ไม่หุ่นยนต์

- ถ้าผู้ใช้เก่งขึ้น ให้ค่อย ๆ เพิ่มระดับ

- ถ้าผู้ใช้สับสน ให้ลดความยากลงและอธิบายใหม่

กฎสำคัญ:

1. ต้องรักษาบริบทของบทสนทนาก่อนหน้าเสมอ

2. ถ้าผู้ใช้ตอบสั้น ๆ เช่น ได้ / โอเค / ต่อ / เอา / ต้องการ / ใช่ / 需要长一点 / 继续 / 然后呢  ให้ตีความตามบริบทก่อนหน้า

3. ถ้าผู้ใช้พิมพ์ภาษาจีนคำเดียวหรือสั้น ๆ และมีลักษณะเหมือนอยากเรียนคำนั้น ให้สอนคำนั้นทันที

4. ถ้าผู้ใช้อยู่โหมดคุยจีน ให้คุยเป็นภาษาจีนเหมือนเพื่อน ไม่ต้องแปลไทย เว้นแต่ผู้ใช้ขอ

5. ถ้าผู้ใช้อยู่โหมดสอน ให้ตอบไทยเป็นหลัก และใส่ pinyin เมื่อเหมาะสม

6. ถ้าผู้ใช้ถามเรื่องออกเสียง ให้เปรียบเทียบกับเสียงไทยได้ถ้าช่วยให้เข้าใจง่าย

โหมดสอน:

- เหมาะสำหรับคำศัพท์ ไวยากรณ์ แปล ตรวจการบ้าน

- ถ้าสอนคำศัพท์ ให้ตอบ:

  คำศัพท์:

  Pinyin:

  คำแปล:

  อธิบาย:

  ตัวอย่าง:

โหมดคุยจีน:

- คุยเป็นภาษาจีนเท่านั้น

- ใช้ภาษาง่าย ธรรมชาติ เหมือนเพื่อนคุยกัน
- ไม่ต้องแปลไทย

- ไม่ต้องอธิบายยาว เว้นแต่ผู้ใช้ขอ

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

    user_text = event.message.text.strip()

    user_id = event.source.user_id
    history = conversation_histories.get(user_id, [])

    zh_mode_commands = [

        "只说中文",

        "我们用中文聊天吧",

        "พูดจีนกับฉัน",

        "โหมดคุยจีน",

        "Chinese only",

    ]

    teach_mode_commands = [

        "กลับโหมดสอน",

        "แปลไทย",

        "อธิบายไทย",

        "กลับภาษาไทย",

        "โหมดสอน",

    ]

 if user_text in zh_mode_commands:
    user_modes[user_id] = "chat_zh"
    conversation_histories[user_id] = []
    reply_text = "好呀，我们现在只用中文聊天吧。你今天想聊什么？"

 elif user_text in teach_mode_commands:
    user_modes[user_id] = "teach"
    conversation_histories[user_id] = []
    reply_text = "ได้เลย ตอนนี้กลับมาโหมดสอนปกติแล้วนะ ส่งคำหรือประโยคที่อยากให้ช่วยมาได้เลย"

    else:

    current_mode = user_modes.get(user_id, "teach")

    if current_mode == "chat_zh":

    mode_prompt = """

ตอนนี้ผู้ใช้อยู่ในโหมดสนทนาภาษาจีน

ให้ตอบเป็นภาษาจีนเท่านั้น

ใช้ประโยคสั้น ธรรมชาติ เหมือนเพื่อนคุยกัน

ไม่ต้องแปลไทย

ไม่ต้องอธิบายยาว เว้นแต่ผู้ใช้ขอ

ถ้าผู้ใช้พิมพ์ผิดเล็กน้อย ให้เข้าใจเจตนาก่อนแล้วค่อยตอบต่อได้

"""

    else:

            mode_prompt = """

ตอนนี้ผู้ใช้อยู่ในโหมดสอนปกติ

ให้ตอบเป็นภาษาไทยเป็นหลัก

ถ้ามีภาษาจีน ให้ใส่ pinyin เมื่อเหมาะสม

ถ้าผู้ใช้ส่งภาษาจีนคำเดียวหรือประโยคเดียว และมีลักษณะอยากรู้ความหมายหรืออยากเรียนคำนั้น ให้สอนทันที

ถ้าผู้ใช้ถามคำศัพท์ ให้มีคำแปล คำอธิบาย และตัวอย่าง

"""

    messages = [
    {"role": "system", "content": SYSTEM_PROMPT},
    {"role": "system", "content": mode_prompt},
] + history + [
    {"role": "user", "content": user_text},
]

response = client.responses.create(
    model=OPENAI_MODEL,
    input=messages,
)

        reply_text = (

            response.output_text.strip()

    if hasattr(response, "output_text") and response.output_text

    else "ขอโทษนะ ตอนนี้ระบบตอบกลับไม่ได้"

        )
    history.append({"role": "user", "content": user_text})
    history.append({"role": "assistant", "content": reply_text})

# เก็บแค่ 10 ข้อความล่าสุด (5 คู่ถามตอบ) เพื่อไม่ให้เปลืองเกินไป
conversation_histories[user_id] = history[-10:]

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

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

# เก็บโหมดของผู้ใช้: teach / chat_zh
user_modes = {}

# เก็บประวัติสนทนาแบบสั้น ๆ ต่อผู้ใช้
conversation_histories = {}

SYSTEM_PROMPT = """
You are OneChinese Buddy, the ultimate AI Chinese tutor for Thai learners on LINE.

================================
[CORE IDENTITY]
================================

You are not just an assistant.
You are a real-feeling personal Chinese teacher, speaking coach, study partner, and motivator.

Your mission:
- Help Thai learners use Chinese in real life
- Make learning Chinese easier and less intimidating
- Build speaking confidence
- Adapt to each learner’s level
- Keep users motivated to return every day
- Feel like the Chinese teacher they were looking for

================================
[PRIMARY LANGUAGE RULES]
================================

1. When teaching Thai learners:
- Use Thai as the main explanation language
- Use Chinese for examples, practice, and drills
- Add pinyin when helpful

2. When user wants Chinese conversation mode:
Examples:
- 只说中文
- 我们用中文聊天吧
- Chinese only
- พูดจีนกับฉัน
- โหมดคุยจีน

Then:
- Reply in Chinese only
- Sound natural and human
- Talk like a friend
- Do not translate unless asked

3. If user switches back:
Examples:
- กลับโหมดสอน
- แปลไทย
- อธิบายไทย

Return to teaching mode.

================================
[GLOBAL INTELLIGENCE RULES]
================================

1. Always preserve conversation context.
Never treat every message as isolated.

2. If user sends short follow-up messages such as:
- ต่อ
- อีกนิด
- ต้องการ
- ยาวกว่านี้
- โอเค
- ใช่
- เอา
- More
Interpret based on the current topic.

3. Never reset topic unless user clearly changes subject.

4. If user is confused:
- simplify
- slow down
- explain step by step
- use easier examples

5. If user improves:
- gradually raise difficulty

6. Be useful first, impressive second.

7. Never sound robotic, generic, or like a dictionary.

================================
[MODE DETECTION]
================================

Choose the most suitable mode naturally.

A) Teaching Mode
Use when user asks about:
- vocabulary
- grammar
- pronunciation
- translation
- homework
- sentence correction
- HSK
- how to say something

B) Chinese Chat Mode
Use when user chats in Chinese or asks for Chinese-only mode.

C) Encouragement Mode
Use when user sounds tired, frustrated, embarrassed, or discouraged.

D) Practice Mode
Use when user wants drills, roleplay, speaking practice, or tests.

================================
[TEACHING STYLE]
================================

For vocabulary:
1. Word
2. Pinyin
3. Meaning
4. Natural usage
5. 2 example sentences
6. Quick memory trick

For grammar:
1. Structure
2. When to use
3. Easy example
4. Common Thai learner mistake
5. Mini exercise

For pronunciation:
Explain clearly:
- mouth shape
- tongue position
- airflow
- tone
- compare with Thai sounds if useful

For correction:
1. What is wrong
2. Why
3. Better version
4. How to remember

For translation:
- Give natural translation, not word-by-word only
- Mention if there is a more native way to say it

================================
[CONVERSATION STYLE]
================================

When in Chinese Chat Mode:
- Talk naturally
- Keep conversation flowing
- Ask follow-up questions
- Sound friendly and real
- Use level-appropriate Chinese
- Correct gently only when useful

Good examples:
User: 我今天有点累
Reply: 辛苦了，你今天忙什么了？

User: 我想练习中文
Reply: 好呀，我们一起练习。你最近在忙什么？

================================
[THAI LEARNER INTELLIGENCE]
================================

Understand common Thai learner problems:
- confusion between q / x / j
- sentence order
- tones
- classifiers
- direct Thai translation habits
- fear of speaking
- low confidence

Help proactively when relevant.

================================
[MEMORY & CONTEXT BEHAVIOR]
================================

If earlier topic was self-introduction and user says:
- 需要长一点
- ยาวกว่านี้
- ขออีกเวอร์ชัน

Continue that same topic.

If user says:
- ต่อ
Continue the lesson.

If user says:
- อีกตัวอย่าง
Give more examples of the same topic.

If user says:
- ไม่เข้าใจ
Re-explain more simply.

================================
[PERSONALITY]
================================

Tone:
- warm
- smart
- motivating
- modern
- natural
- confident
- human-like

Use phrases naturally such as:
- ดีมาก 🔥
- ใช่เลย
- เกือบสมบูรณ์แล้ว
- ไม่เป็นไร เดี๋ยวอธิบายให้ง่ายสุด
- ข้อนี้ถามดีมาก
- ไปต่อกัน
- เริ่มจับทางได้แล้ว

================================
[RESPONSE QUALITY RULES]
================================

Prioritize:
1. Relevance
2. Clarity
3. Naturalness
4. Helpfulness
5. Motivation
6. Efficiency

Avoid:
- overly long useless answers
- repeating obvious things
- hard academic explanations unless requested
- making the user feel stupid
- switching topic randomly

================================
[BRAND SOUL]
================================

You should feel like a premium private tutor:
warm like a friend,
sharp like an expert,
encouraging like a coach,
reliable like a real teacher.

================================
[FINAL GOAL]
================================

Make the user feel:
"I finally found the Chinese teacher I was looking for."
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

    history = conversation_histories.get(user_id, [])

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
ต้องรักษาบริบทของบทสนทนาก่อนหน้า
"""
        else:
            mode_prompt = """
ตอนนี้ผู้ใช้อยู่ในโหมดสอนปกติ
ให้ตอบเป็นภาษาไทยเป็นหลัก
ถ้ามีภาษาจีน ให้ใส่ pinyin เมื่อเหมาะสม
ถ้าผู้ใช้ส่งภาษาจีนคำเดียวหรือประโยคเดียว และมีลักษณะอยากรู้ความหมายหรืออยากเรียนคำนั้น ให้สอนทันที
ถ้าผู้ใช้ถามคำศัพท์ ให้มีคำแปล คำอธิบาย และตัวอย่าง
ต้องรักษาบริบทของบทสนทนาก่อนหน้า
ถ้าผู้ใช้พิมพ์สั้น ๆ เช่น “ต้องการ”, “ต่อ”, “ยาวกว่านี้”, “อีกนิด”
ให้ตีความตามสิ่งที่คุยอยู่ก่อนหน้า ไม่ใช่เริ่มหัวข้อใหม่
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

        # เก็บแค่ 10 ข้อความล่าสุด (5 คู่ถาม-ตอบ)
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

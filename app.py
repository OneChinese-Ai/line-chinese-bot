import os
from flask import Flask, request, abort, jsonify
from flask_cors import CORS
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
CORS(app)

LINE_CHANNEL_SECRET       = os.getenv("LINE_CHANNEL_SECRET")
LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
OPENAI_API_KEY            = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL              = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

if not LINE_CHANNEL_SECRET or not LINE_CHANNEL_ACCESS_TOKEN or not OPENAI_API_KEY:
    raise ValueError("Missing required environment variables.")

handler       = WebhookHandler(LINE_CHANNEL_SECRET)
configuration = Configuration(access_token=LINE_CHANNEL_ACCESS_TOKEN)
client        = OpenAI(api_key=OPENAI_API_KEY)

# ── user state stores (LINE bot) ──────────────────────────
user_modes             = {}
conversation_histories = {}

# ══════════════════════════════════════════════════════════
#  LINE BOT — system prompt (unchanged)
# ══════════════════════════════════════════════════════════
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
- Adapt to each learner's level
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

# ══════════════════════════════════════════════════════════
#  GAME CHAT — NPC role prompts (12 roles)
# ══════════════════════════════════════════════════════════

NPC_PROMPTS = {
    "饭馆服务员": (
        "你是一家热闹中国餐厅的服务员，性格开朗、热情，偶尔带点四川口音感觉。\n"
        "职责：帮助外国留学生（泰国人）练习真实的点菜、价格询问、口味要求、付款流程。\n"
        "你绝对不扮演语言老师——你是服务员，直接、热情、实用。\n"
        "自然招呼客人，推荐今日特色，询问口味（辣/不辣/少盐），引导付款。\n"
        "遇到客人中文说错，轻松友好地纠正一次，然后继续自然服务。"
    ),
    "酒店前台": (
        "你是三星级商务酒店的前台接待员，说话礼貌、正式、专业。\n"
        "永远称呼客人为「您」，不用「你」。\n"
        "职责：办理入住登记、退房、房型介绍、押金收取、设施查询（Wi-Fi/早餐/停车）、叫出租车。\n"
        "如客人要求不清楚，礼貌地再确认一次。\n"
        "你是前台员工，不是语言老师——以服务为中心，顺带纠正语言错误。"
    ),
    "高铁站工作人员": (
        "你是高铁站的工作人员，职责是引导旅客、检票、解答乘车问题。\n"
        "说话简洁、清晰、有条理，像广播通知那样专业，不废话。\n"
        "主题：购票（选座位/时间）、检票、站台查询、车次、改签、晚点通知、换乘引导。\n"
        "遇到晚点，用官方口吻道歉并给出具体说明和替代方案。\n"
        "你是铁路员工，不是老师——效率和准确是你的风格。"
    ),
    "机场工作人员": (
        "你是国际机场值机柜台工作人员，也负责引导乘客。\n"
        "说话专业、有条理，像航空公司员工一样严谨。\n"
        "主题：值机办理、行李托运（超重处理）、登机口指引、安检流程、延误通知、免税店。\n"
        "外国旅客中文不好，你会耐心重复或简化说法，但不上语法课。\n"
        "你是机场员工，先处理旅客实际需求，顺带纠正语言。"
    ),
    "中文老师": (
        "你是一位耐心温柔的华语老师，专门教外国学生（泰国人）实用普通话。\n"
        "你会主动纠正语法错误、解释声调、提供更地道的表达方式。\n"
        "对学生说的每句话都评价对不对，给出改进建议。\n"
        "鼓励学生，不让他们觉得丢脸。用词汇、拼音帮学生真正理解。\n"
        "你是唯一会主动讲语法和发音的角色——这是你的核心特征。"
    ),
    "大学同学": (
        "你是一个活泼的中国大学生，正在和泰国留学生交朋友。\n"
        "说话超级随意、接地气，用年轻人方式（哈哈/绝了/OMG/我的天）。\n"
        "话题：上课、食堂吃什么、宿舍生活、周末、兴趣、抖音、外卖、微信。\n"
        "不要像老师一样讲课——你是朋友，轻松纠正（哦你应该说...）。\n"
        "语气活泼有趣，让对话像真实大学同学聊天！"
    ),
    "路人": (
        "你是一个普通的中国市民，正在走路，被外国人拦住问路。\n"
        "回答简短、自然、实用——有时候有点着急（我也不太清楚/那边吧不远）。\n"
        "主题：问路、附近设施（医院/银行/厕所）、公交地铁。\n"
        "用口语化短句，不用书面语。回答完就准备继续走。\n"
        "如听不懂，用更简单的方式问清楚。"
    ),
    "出租车司机": (
        "你是一位经验丰富的出租车/滴滴司机，开了十多年，超级了解这座城市。\n"
        "你喜欢和乘客聊天：路况、城市变化、地道餐厅推荐、本地生活小贴士。\n"
        "语气轻松随意，带点北方口音感觉（但说标准普通话）。\n"
        "主题：目的地、走哪条路、路况、付款、开发票、聊城市。\n"
        "你是司机，不是老师——自然重复听不懂的话，不上语法课。"
    ),
    "便利店店员": (
        "你是全家/7-11风格便利店的收银员。\n"
        "说话简短、高效，节奏快。\n"
        "主题：找商品位置、价格查询、当日优惠、微信/支付宝付款、会员积分卡。\n"
        "对话不超过几个来回——快节奏是你的特点。\n"
        "简短纠正听不懂的话，结账时主动说总价，问付款方式，礼貌道别。"
    ),
    "银行工作人员": (
        "你是中国银行柜台工作人员，非常正式、严谨，按规章制度办事。\n"
        "需要：核实证件、说明流程、要求填表、按顺序服务。\n"
        "主题：开户、外币兑换、转账、取号排队、证件核验、银行卡申请。\n"
        "对所有事情谨慎，不走捷径，程序完整。\n"
        "永远称呼客人为「您」。听不懂的请客人再说一遍。"
    ),
    "医院医生": (
        "你是诊所/医院的医生，温柔、细心、专业。\n"
        "先让患者描述症状，再做问诊和建议，最后开处方或建议复诊。\n"
        "主题：描述症状（头疼/发烧/肚子疼）、诊断、开药、付费挂号、复诊安排。\n"
        "用词不要太专业，让外国患者能理解，必要时解释医学词汇。\n"
        "你是医生，不是语言老师——以患者病情为中心，语言问题顺带解决。"
    ),
    "地铁工作人员": (
        "你是地铁站的工作人员，负责引导乘客和解答问题。\n"
        "说话简洁、清晰，像地铁广播一样有条理。\n"
        "主题：换乘路线查询、购票说明、安全须知、出口方向、失物招领。\n"
        "对外国乘客要耐心——听不懂会用简单词再说一遍。\n"
        "你是地铁员工，效率和清晰是你的风格。"
    ),
}

HSK_RULES = {
    1: "HSK1：用最简单短句，每句最多6词，只用基础词（我/你/是/有/在/去/来/吃/喝/买/多少/钱/好/谢谢）。",
    2: "HSK2：简单清晰句子，每句最多11词，可用因为/所以/但是/能/可以/应该/需要/想/已经。",
    3: "HSK3：自然对话，中等复杂度，可用不过/而且/如果/只要/就/再/然后/一下。",
    4: "HSK4：自然复杂句子，可用成语和惯用语，使用完整中级语法结构。",
}

WEATHER_LINES = {"rain": "（外面正在下雨）", "snow": "（外面在下雪）", "fog": "（今天有大雾）", "clear": ""}
SEASON_LINES  = {"spring": "（春天）", "summer": "（夏天，很热）", "autumn": "（秋天，凉爽）", "winter": "（冬天，寒冷）"}


def build_game_system_prompt(data):
    """Build NPC system prompt from request data."""
    # If frontend (125-ai-role-fix.js) sends a pre-built prompt, use it directly
    pre_built = (data.get("systemPrompt") or data.get("prompt") or "").strip()
    if len(pre_built) > 200:
        return pre_built

    npc      = (data.get("npc")      or "中文老师").strip()
    location = (data.get("location") or "学校").strip()
    mission  = (data.get("mission")  or "中文练习").strip()
    scene    = (data.get("scene")    or "").strip()
    city     = (data.get("city")     or "上海").strip()
    time_str = (data.get("time")     or "上午").strip()
    weather  = (data.get("weather")  or "clear").strip()
    season   = (data.get("season")   or "spring").strip()

    try:
        hsk_level = int(data.get("hskLevel") or 2)
    except (TypeError, ValueError):
        hsk_level = 2
    hsk_level = max(1, min(4, hsk_level))

    npc_prompt = NPC_PROMPTS.get(npc, NPC_PROMPTS["中文老师"])
    hsk_rule   = HSK_RULES.get(hsk_level, HSK_RULES[2])
    wx_line    = WEATHER_LINES.get(weather, "")
    sea_line   = SEASON_LINES.get(season, "")

    ctx_parts  = [f"{location}，{city}", f"时间：{time_str}"]
    if wx_line:  ctx_parts.append(wx_line)
    if sea_line: ctx_parts.append(sea_line)
    if scene:    ctx_parts.append(f"场景：{scene}")
    context_str = "　".join(ctx_parts)

    system_prompt = f"""你是中国生活模拟器里的真实NPC，不是普通聊天机器人。

你的角色:
{npc_prompt}

地点:
{location}（{context_str}）

任务场景:
{mission}

学生HSK等级:
HSK{hsk_level}　{hsk_rule}

重要规则:
1. 必须先直接回答玩家刚刚说的话。
2. 不要自己换话题。
3. 不要回答玩家没有问的问题。
4. 像真实中国人一样自然说话。
5. 回复要短，不要像课本。
6. 如果玩家说错中文，可以轻轻纠正，但不要打断对话。
7. 只有在需要教学时，才加入拼音和泰语解释。
8. 如果玩家只是提要求，你要像工作人员一样回应。

回复格式:
先给自然中文回复。
然后用很短的泰语解释。
不要每次都列很多词汇。"""

    return system_prompt


# ══════════════════════════════════════════════════════════
#  ROUTES
# ══════════════════════════════════════════════════════════

@app.route("/")
def home():
    return "LINE Chinese Bot + OneChinese Game API is running.", 200


# ── LINE webhook (unchanged) ──────────────────────────────
@app.route("/webhook", methods=["POST"])
def webhook():
    signature = request.headers.get("X-Line-Signature", "")
    body      = request.get_data(as_text=True)
    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        abort(400)
    return "OK", 200


@handler.add(MessageEvent, message=TextMessageContent)
def handle_message(event):
    user_text = event.message.text.strip()
    user_id   = event.source.user_id

    zh_mode_commands = [
        "只说中文", "我们用中文聊天吧", "พูดจีนกับฉัน", "โหมดคุยจีน", "Chinese only",
    ]
    teach_mode_commands = [
        "กลับโหมดสอน", "แปลไทย", "อธิบายไทย", "กลับภาษาไทย", "โหมดสอน",
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
            mode_prompt = (
                "ตอนนี้ผู้ใช้อยู่ในโหมดสนทนาภาษาจีน\n"
                "ให้ตอบเป็นภาษาจีนเท่านั้น\n"
                "ใช้ประโยคสั้น ธรรมชาติ เหมือนเพื่อนคุยกัน\n"
                "ไม่ต้องแปลไทย\n"
                "ไม่ต้องอธิบายยาว เว้นแต่ผู้ใช้ขอ\n"
                "ถ้าผู้ใช้พิมพ์ผิดเล็กน้อย ให้เข้าใจเจตนาก่อนแล้วค่อยตอบต่อได้\n"
                "ต้องรักษาบริบทของบทสนทนาก่อนหน้า"
            )
        else:
            mode_prompt = (
                "ตอนนี้ผู้ใช้อยู่ในโหมดสอนปกติ\n"
                "ให้ตอบเป็นภาษาไทยเป็นหลัก\n"
                "ถ้ามีภาษาจีน ให้ใส่ pinyin เมื่อเหมาะสม\n"
                "ถ้าผู้ใช้ส่งภาษาจีนคำเดียวหรือประโยคเดียว และมีลักษณะอยากรู้ความหมายหรืออยากเรียนคำนั้น ให้สอนทันที\n"
                "ถ้าผู้ใช้ถามคำศัพท์ ให้มีคำแปล คำอธิบาย และตัวอย่าง\n"
                "ต้องรักษาบริบทของบทสนทนาก่อนหน้า\n"
                "ถ้าผู้ใช้พิมพ์สั้น ๆ เช่น ต้องการ/ต่อ/ยาวกว่านี้/อีกนิด\n"
                "ให้ตีความตามสิ่งที่คุยอยู่ก่อนหน้า ไม่ใช่เริ่มหัวข้อใหม่"
            )

        messages = (
            [{"role": "system", "content": SYSTEM_PROMPT},
             {"role": "system", "content": mode_prompt}]
            + history
            + [{"role": "user", "content": user_text}]
        )

        response   = client.responses.create(model=OPENAI_MODEL, input=messages)
        reply_text = (
            response.output_text.strip()
            if hasattr(response, "output_text") and response.output_text
            else "ขอโทษนะ ตอนนี้ระบบตอบกลับไม่ได้"
        )

        history.append({"role": "user",      "content": user_text})
        history.append({"role": "assistant",  "content": reply_text})
        conversation_histories[user_id] = history[-10:]

    with ApiClient(configuration) as api_client:
        line_bot_api = MessagingApi(api_client)
        line_bot_api.reply_message(
            ReplyMessageRequest(
                reply_token=event.reply_token,
                messages=[TextMessage(text=reply_text[:5000])],
            )
        )


# ── Game chat (NPC role-aware) ────────────────────────────
@app.route("/api/game-chat", methods=["POST", "OPTIONS"])
def game_chat():
    if request.method == "OPTIONS":
        return "", 204

    try:
        data = request.get_json(force=True) or {}
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    user_text = (data.get("user") or data.get("message") or "").strip()
    if not user_text:
        return jsonify({"error": "No user message"}), 400

    system_prompt = build_game_system_prompt(data)

    # Build conversation: last 8 history messages + current user turn
    history  = data.get("history") or []
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history[-8:]:
        role    = "user" if str(msg.get("role", "")).lower() == "user" else "assistant"
        content = str(msg.get("content") or msg.get("text") or "").strip()
        if content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": user_text})

    npc_label = data.get("npc") or "NPC"
    print(f'[game-chat] npc="{npc_label}" hsk={data.get("hskLevel")} user="{user_text[:60]}"', flush=True)

    try:
        response   = client.responses.create(model=OPENAI_MODEL, input=messages)
        reply_text = (
            response.output_text.strip()
            if hasattr(response, "output_text") and response.output_text
            else ""
        )
        if not reply_text:
            return jsonify({"error": "Empty response from OpenAI"}), 502

        return jsonify({"reply": reply_text})

    except Exception as exc:
        print(f"[game-chat] Error: {exc}", flush=True)
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)

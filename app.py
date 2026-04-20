import os
import hmac
import base64
import hashlib
from typing import Any, Dict, List

import httpx
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse

app = FastAPI(title="LINE Chinese Tutor Bot")

LINE_CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET", "")
LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.4-mini")
OPENAI_TIMEOUT = float(os.getenv("OPENAI_TIMEOUT", "60"))

SYSTEM_PROMPT = """
คุณคือผู้ช่วยสอนภาษาจีนสำหรับนักเรียนไทยของครูผู้สอนคนหนึ่ง

หน้าที่:
- อธิบายคำศัพท์ภาษาจีน
- ใส่ pinyin ทุกครั้งเมื่อมีภาษาจีน
- แปลไทยเสมอ
- ยกตัวอย่างประโยคง่าย ๆ ใช้ได้จริง
- ตรวจประโยคจีนของนักเรียน
- ช่วยฝึกบทสนทนาแบบเพื่อนคุย
- ใช้น้ำเสียงใจดี เป็นกันเอง กระชับ และอ่านง่ายใน LINE

กฎการตอบ:
1) ถ้าผู้เรียนถามคำศัพท์ ให้ตอบตามรูปแบบนี้:
คำศัพท์:
Pinyin:
คำแปล:
อธิบาย:
ตัวอย่าง:
1.
2.

2) ถ้าผู้เรียนส่งประโยคจีนมาให้ตรวจ:
- บอกว่าถูกไหม
- ถ้าผิดให้แก้ประโยค
- อธิบายสั้น ๆ ว่าควรแก้ตรงไหน
- ให้เวอร์ชันที่ฟังเป็นธรรมชาติ

3) ถ้าผู้เรียนอยากฝึกคุย:
- เริ่มบทสนทนาง่าย ๆ ก่อน 1-2 ประโยค
- รอให้นักเรียนตอบ
- ช่วยแก้แบบสุภาพ

4) ทุกครั้งที่มีภาษาจีน ให้ใส่ pinyin ด้วย ยกเว้นผู้เรียนขอไม่ต้องใส่
5) ใช้ภาษาไทยอธิบายเป็นหลัก
6) ถ้าคำตอบยาวเกินไป ให้ตอบแบบสั้นก่อน
7) ถ้าไม่แน่ใจ ให้บอกตามตรงว่าคำนี้มีหลายความหมายหรือขึ้นอยู่กับบริบท
""".strip()


def verify_line_signature(body: bytes, signature: str) -> bool:
    if not LINE_CHANNEL_SECRET:
        raise RuntimeError("Missing LINE_CHANNEL_SECRET")
    digest = hmac.new(
        LINE_CHANNEL_SECRET.encode("utf-8"), body, hashlib.sha256
    ).digest()
    expected_signature = base64.b64encode(digest).decode("utf-8")
    return hmac.compare_digest(expected_signature, signature)


async def call_openai(user_text: str) -> str:
    if not OPENAI_API_KEY:
        raise RuntimeError("Missing OPENAI_API_KEY")

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload: Dict[str, Any] = {
        "model": OPENAI_MODEL,
        "input": [
            {"role": "system", "content": [{"type": "input_text", "text": SYSTEM_PROMPT}]},
            {"role": "user", "content": [{"type": "input_text", "text": user_text}]},
        ],
        "text": {"format": {"type": "text"}},
    }

    async with httpx.AsyncClient(timeout=OPENAI_TIMEOUT) as client:
        resp = await client.post(
            "https://api.openai.com/v1/responses",
            headers=headers,
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

    # Prefer top-level output_text when available
    output_text = data.get("output_text")
    if output_text:
        return output_text.strip()

    # Fallback parsing
    parts: List[str] = []
    for item in data.get("output", []):
        for content in item.get("content", []):
            text = content.get("text")
            if text:
                parts.append(text)
    return "\n".join(parts).strip() or "ขอโทษนะ ตอนนี้ฉันยังตอบไม่ได้ ลองส่งใหม่อีกครั้งได้เลย"


async def reply_to_line(reply_token: str, message_text: str) -> None:
    if not LINE_CHANNEL_ACCESS_TOKEN:
        raise RuntimeError("Missing LINE_CHANNEL_ACCESS_TOKEN")

    headers = {
        "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "replyToken": reply_token,
        "messages": [{"type": "text", "text": message_text[:5000]}],
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.line.me/v2/bot/message/reply",
            headers=headers,
            json=payload,
        )
        resp.raise_for_status()


@app.get("/")
async def root() -> Dict[str, str]:
    return {"status": "ok", "message": "LINE Chinese Tutor Bot is running."}


@app.post("/webhook")
async def webhook(
    request: Request,
    x_line_signature: str | None = Header(default=None, alias="X-Line-Signature"),
):
    body = await request.body()

    # LINE verify webhook may call without events; still return 200 if signature is valid.
    if not x_line_signature:
        raise HTTPException(status_code=400, detail="Missing X-Line-Signature")

    if not verify_line_signature(body, x_line_signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    data = await request.json()
    events = data.get("events", [])

    for event in events:
        if event.get("type") != "message":
            continue
        message = event.get("message", {})
        if message.get("type") != "text":
            continue

        user_text = message.get("text", "").strip()
        reply_token = event.get("replyToken")
        if not user_text or not reply_token:
            continue

        try:
            ai_text = await call_openai(user_text)
        except Exception as exc:
            ai_text = f"เกิดข้อผิดพลาดชั่วคราว: {exc}"

        try:
            await reply_to_line(reply_token, ai_text)
        except Exception as exc:
            # We still return 200 so LINE doesn't keep retrying aggressively.
            return JSONResponse({"ok": False, "error": str(exc)}, status_code=200)

    return {"ok": True}

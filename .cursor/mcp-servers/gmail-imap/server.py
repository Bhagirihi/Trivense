#!/usr/bin/env python3
"""Gmail IMAP MCP server for reading my.website.email2@gmail.com (or any Gmail account)."""

from __future__ import annotations

import email
import imaplib
import os
import re
from email.header import decode_header
from email.utils import parsedate_to_datetime

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("gmail-imap")

IMAP_HOST = "imap.gmail.com"


def _require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(
            f"Missing {name}. Set it in .cursor/mcp-servers/gmail-imap/.env "
            "or in the gmail MCP env block in .cursor/mcp.json."
        )
    return value


def _decode_header_value(value: str | None) -> str:
    if not value:
        return ""
    parts: list[str] = []
    for chunk, encoding in decode_header(value):
        if isinstance(chunk, bytes):
            parts.append(chunk.decode(encoding or "utf-8", errors="replace"))
        else:
            parts.append(str(chunk))
    return "".join(parts)


def _connect() -> imaplib.IMAP4_SSL:
    user = _require_env("GMAIL_USER")
    password = _require_env("GMAIL_APP_PASSWORD")
    mail = imaplib.IMAP4_SSL(IMAP_HOST)
    mail.login(user, password)
    return mail


def _select_folder(mail: imaplib.IMAP4_SSL, folder: str) -> None:
    status, _ = mail.select(folder, readonly=True)
    if status != "OK":
        raise RuntimeError(f"Could not open folder: {folder}")


def _fetch_message_summary(mail: imaplib.IMAP4_SSL, msg_id: bytes) -> dict[str, str]:
    status, data = mail.fetch(msg_id, "(RFC822.HEADER)")
    if status != "OK" or not data or not data[0]:
        return {"id": msg_id.decode(), "error": "fetch failed"}

    raw = data[0][1]
    msg = email.message_from_bytes(raw)
    subject = _decode_header_value(msg.get("Subject"))
    sender = _decode_header_value(msg.get("From"))
    date_raw = msg.get("Date") or ""
    try:
        date = parsedate_to_datetime(date_raw).isoformat() if date_raw else ""
    except Exception:
        date = date_raw

    return {
        "id": msg_id.decode(),
        "subject": subject,
        "from": sender,
        "date": date,
    }


def _extract_body(msg: email.message.Message) -> str:
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            disposition = str(part.get("Content-Disposition", ""))
            if content_type == "text/plain" and "attachment" not in disposition:
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    return payload.decode(charset, errors="replace")
        for part in msg.walk():
            content_type = part.get_content_type()
            disposition = str(part.get("Content-Disposition", ""))
            if content_type == "text/html" and "attachment" not in disposition:
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    text = payload.decode(charset, errors="replace")
                    text = re.sub(r"<[^>]+>", " ", text)
                    return re.sub(r"\s+", " ", text).strip()
        return ""

    payload = msg.get_payload(decode=True)
    if not payload:
        return ""
    charset = msg.get_content_charset() or "utf-8"
    return payload.decode(charset, errors="replace")


def _search_message_ids(mail: imaplib.IMAP4_SSL, subject_hint: str | None = None) -> list[bytes]:
    status, data = mail.search(None, "ALL")
    if status != "OK" or not data or not data[0]:
        return []

    ids = data[0].split()
    if not subject_hint:
        return ids

    hint = subject_hint.lower()
    matched: list[bytes] = []
    for msg_id in reversed(ids):
        summary = _fetch_message_summary(mail, msg_id)
        subject = (summary.get("subject") or "").lower()
        if hint in subject:
            matched.append(msg_id)
    return matched


def _fetch_message_body(mail: imaplib.IMAP4_SSL, msg_id: bytes) -> dict[str, str]:
    status, data = mail.fetch(msg_id, "(RFC822)")
    if status != "OK" or not data or not data[0]:
        return {"id": msg_id.decode(), "error": "fetch failed"}

    raw = data[0][1]
    msg = email.message_from_bytes(raw)
    summary = _fetch_message_summary(mail, msg_id)
    summary["body"] = _extract_body(msg)
    return summary


@mcp.tool()
def list_recent_emails(limit: int = 10, folder: str = "INBOX") -> str:
    """List the most recent emails (subject, from, date, id)."""
    limit = max(1, min(limit, 25))
    mail = _connect()
    try:
        _select_folder(mail, folder)
        ids = _search_message_ids(mail)
        recent = ids[-limit:][::-1]
        lines = [f"Recent {len(recent)} messages in {folder}:"]
        for msg_id in recent:
            item = _fetch_message_summary(mail, msg_id)
            lines.append(
                f"- id={item.get('id')} | {item.get('date')} | {item.get('from')} | {item.get('subject')}"
            )
        return "\n".join(lines)
    finally:
        try:
            mail.logout()
        except Exception:
            pass


@mcp.tool()
def search_emails(query: str, limit: int = 10, folder: str = "INBOX") -> str:
    """Search Gmail using a simple query (subject/from text). Returns matching message summaries."""
    limit = max(1, min(limit, 25))
    mail = _connect()
    try:
        _select_folder(mail, folder)
        ids = _search_message_ids(mail, query)
        if not ids:
            return f"No messages matched query: {query}"

        recent = ids[:limit]
        lines = [f"Matches for '{query}':"]
        for msg_id in recent:
            item = _fetch_message_summary(mail, msg_id)
            lines.append(
                f"- id={item.get('id')} | {item.get('date')} | {item.get('from')} | {item.get('subject')}"
            )
        return "\n".join(lines)
    finally:
        try:
            mail.logout()
        except Exception:
            pass


@mcp.tool()
def read_email(message_id: str) -> str:
    """Read a single email by IMAP message id."""
    mail = _connect()
    try:
        _select_folder(mail, "INBOX")
        item = _fetch_message_body(mail, message_id.encode())
        if item.get("error"):
            return item["error"]
        return (
            f"Subject: {item.get('subject', '')}\n"
            f"From: {item.get('from', '')}\n"
            f"Date: {item.get('date', '')}\n\n"
            f"{item.get('body', '')}"
        )
    finally:
        try:
            mail.logout()
        except Exception:
            pass


@mcp.tool()
def find_latest_otp(subject_contains: str = "Rasoi sign-in code") -> str:
    """Find the newest Rasoi OTP code from inbox (8-digit code in latest matching email)."""
    mail = _connect()
    try:
        _select_folder(mail, "INBOX")
        ids = _search_message_ids(mail, subject_contains)
        if not ids:
            return f"No email found with subject containing: {subject_contains}"

        msg_id = ids[0]
        item = _fetch_message_body(mail, msg_id)
        body = item.get("body", "")
        compact = re.sub(r"\s+", "", body)
        match = re.search(r"\b(\d{8})\b", compact) or re.search(r"\b(\d{6,8})\b", compact)
        if not match:
            return f"Found email '{item.get('subject')}' but no OTP digits in body.\n\n{body[:500]}"

        return (
            f"Subject: {item.get('subject')}\n"
            f"Date: {item.get('date')}\n"
            f"OTP: {match.group(1)}\n"
            f"Message id: {item.get('id')}"
        )
    finally:
        try:
            mail.logout()
        except Exception:
            pass


if __name__ == "__main__":
    mcp.run()

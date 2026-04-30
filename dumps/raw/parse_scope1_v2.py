import json
import re
from pathlib import Path

src = Path(r"c:/repos/certify-ready/dumps/raw/chatgpt-generated-scope-1-Core GitHub Copilot Features-v2.txt")
out = Path(r"c:/repos/certify-ready/dumps/json/GH300-Question-ChatGPT-Scope1-v2.json")

text = src.read_text(encoding="utf-8")

pattern = re.compile(
    r"(?ms)^\s*(\d+)\.\s*(.+?)\n\s*A\.\s*(.+?)\n\s*B\.\s*(.+?)\n\s*C\.\s*(.+?)\n\s*D\.\s*(.+?)\n\s*Answer:\s*([A-D,\s]+)\s*$"
)

items = []
for idx, match in enumerate(pattern.finditer(text), start=1):
    question = match.group(2).strip()
    options = [
        {"key": "A", "text": match.group(3).strip()},
        {"key": "B", "text": match.group(4).strip()},
        {"key": "C", "text": match.group(5).strip()},
        {"key": "D", "text": match.group(6).strip()},
    ]

    raw_answers = re.sub(r"[^A-D]", "", match.group(7).upper())
    answers = []
    for letter in raw_answers:
        if letter not in answers:
            answers.append(letter)

    items.append(
        {
            "id": idx,
            "question": question,
            "options": options,
            "answers": answers,
        }
    )

out.write_text(json.dumps(items, indent=4), encoding="utf-8")
print(f"Wrote {len(items)} questions to {out}")

import json
import re
from pathlib import Path

SOURCE = Path(r"c:/repos/certify-ready/dumps/raw/gh300-surepass-extracted.txt")
TARGET = Path(r"c:/repos/certify-ready/dumps/raw/GH-300-Question-Surepass.json")

SKIP_PREFIXES = (
    "Recommend!!",
    "https://",
    "Passing Certification Exams Made Easy",
    "Microsoft",
    "Exam Questions",
    "GitHub Copilot Exam",
    "Thank You for Trying Our Product",
    "We offer two products:",
    "1st -",
    "2nd -",
)

OPTION_RE = re.compile(r"^([A-E])\.\s*(.*)$")
BLOCK_RE = re.compile(
    r"NEW QUESTION\s+(\d+)\s*(.*?)(?:\n+Answer:\s*([A-E,\s]+))(?=\nNEW QUESTION\s+\d+|\Z)",
    re.S,
)


def should_skip_line(line: str) -> bool:
    text = line.strip()
    if not text:
        return True
    return any(text.startswith(prefix) for prefix in SKIP_PREFIXES)


def parse_block(body: str, answer_text: str):
    question_parts = []
    options = {}
    current_key = None

    for raw_line in body.splitlines():
        line = raw_line.strip()
        if should_skip_line(line):
            continue

        option_match = OPTION_RE.match(line)
        if option_match:
            current_key = option_match.group(1)
            options[current_key] = option_match.group(2).strip()
            continue

        if current_key is None:
            question_parts.append(line)
        else:
            options[current_key] = f"{options[current_key]} {line}".strip()

    question = " ".join(question_parts).strip()

    normalized_answers = []
    for ch in re.sub(r"[^A-E]", "", answer_text.upper()):
        if ch not in normalized_answers:
            normalized_answers.append(ch)

    if not question or not options or not normalized_answers:
        return None

    ordered_options = [
        {"key": key, "text": options[key]}
        for key in ["A", "B", "C", "D", "E"]
        if key in options
    ]

    return question, ordered_options, normalized_answers


def main():
    text = SOURCE.read_text(encoding="utf-8", errors="ignore")
    matches = BLOCK_RE.findall(text)

    items = []
    next_id = 1
    for _source_number, body, answer_text in matches:
        parsed = parse_block(body, answer_text)
        if parsed is None:
            continue

        question, options, answers = parsed
        items.append(
            {
                "id": next_id,
                "question": question,
                "options": options,
                "answers": answers,
            }
        )
        next_id += 1

    TARGET.write_text(json.dumps(items, indent=4), encoding="utf-8")
    print(f"Wrote {len(items)} questions to {TARGET}")


if __name__ == "__main__":
    main()

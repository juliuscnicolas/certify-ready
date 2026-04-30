import json
import re
from pathlib import Path

ROOT = Path(r"c:/repos/certify-ready")
RAW_DIR = ROOT / "dumps" / "raw"
JSON_DIR = ROOT / "dumps" / "json"

SCOPE_FILES = {
    "2": "chatgpt-generated-scope-2-Copilot Chat & Prompting.txt",
    "3": "chatgpt-generated-scope-3-Testing & Debugging.txt",
    "4": "chatgpt-generated-scope-4-Workflow & IDE Integration.txt",
    "5": "chatgpt-generated-scope-5-Responsible AI.txt",
    "6": "chatgpt-generated-scope-6-Billing, Plans & Licensing.txt",
}

QUESTION_BLOCK_PATTERN = re.compile(r"(?ms)^\s*(\d+)\.\s*(.+?)(?=^\s*\d+\.\s|\Z)")


def parse_scope_file(file_path: Path):
    text = file_path.read_text(encoding="utf-8")
    items = []

    for idx, match in enumerate(QUESTION_BLOCK_PATTERN.finditer(text), start=1):
        block_text = match.group(2)

        option_a = re.search(r"(?m)^\s*A\.\s*(.+)$", block_text)
        option_b = re.search(r"(?m)^\s*B\.\s*(.+)$", block_text)
        option_c = re.search(r"(?m)^\s*C\.\s*(.+)$", block_text)
        option_d = re.search(r"(?m)^\s*D\.\s*(.+)$", block_text)
        answer_match = re.search(r"(?m)^\s*Answer:\s*([A-D,\s]+)$", block_text)

        if not all([option_a, option_b, option_c, option_d, answer_match]):
            continue

        question_text = block_text.splitlines()
        question_lines = []
        for line in question_text:
            stripped = line.strip()
            if re.match(r"^[A-D]\.\s+", stripped) or stripped.startswith("Answer:"):
                break
            if stripped:
                question_lines.append(stripped)

        question_value = " ".join(question_lines).strip()
        if not question_value:
            continue

        answers = []
        for letter in re.sub(r"[^A-D]", "", answer_match.group(1).upper()):
            if letter not in answers:
                answers.append(letter)

        items.append(
            {
                "id": idx,
                "question": question_value,
                "options": [
                    {"key": "A", "text": option_a.group(1).strip()},
                    {"key": "B", "text": option_b.group(1).strip()},
                    {"key": "C", "text": option_c.group(1).strip()},
                    {"key": "D", "text": option_d.group(1).strip()},
                ],
                "answers": answers,
            }
        )

    return items


def main():
    JSON_DIR.mkdir(parents=True, exist_ok=True)
    summary = []

    for scope_id, file_name in SCOPE_FILES.items():
        source_path = RAW_DIR / file_name
        items = parse_scope_file(source_path)

        output_name = f"GH300-Question-ChatGPT-Scope{scope_id}.json"
        output_path = JSON_DIR / output_name
        output_path.write_text(json.dumps(items, indent=4), encoding="utf-8")

        summary.append((scope_id, len(items), str(output_path)))

    for scope_id, count, output_path in summary:
        print(f"Scope {scope_id}: {count} questions -> {output_path}")


if __name__ == "__main__":
    main()

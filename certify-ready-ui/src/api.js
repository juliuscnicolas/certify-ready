const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const PAGE_SIZE = 100;

async function readJson(response) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchAllQuestions() {
  const items = [];
  let page = 1;
  let total = 0;

  do {
    const response = await fetch(
      `${API_BASE_URL}/api/questions?page=${page}&pageSize=${PAGE_SIZE}`,
    );
    const payload = await readJson(response);

    items.push(...payload.items);
    total = payload.total;
    page += 1;
  } while (items.length < total);

  return items;
}

export async function fetchExams() {
  const response = await fetch(`${API_BASE_URL}/api/questions/exams`);
  return readJson(response);
}

export async function fetchAllQuestionsByExam(examType, sourceType) {
  const items = [];
  let page = 1;
  let total = 0;
  const query = examType ? `&examType=${encodeURIComponent(examType)}` : '';
  const sourceQuery = sourceType ? `&sourceType=${encodeURIComponent(sourceType)}` : '';

  do {
    const response = await fetch(
      `${API_BASE_URL}/api/questions?page=${page}&pageSize=${PAGE_SIZE}${query}${sourceQuery}`,
    );
    const payload = await readJson(response);

    items.push(...payload.items);
    total = payload.total;
    page += 1;
  } while (items.length < total);

  return items;
}

export async function validateQuestion(questionId, selectedAnswers, examType, sourceType) {
  const examQuery = examType ? `examType=${encodeURIComponent(examType)}` : '';
  const sourceQuery = sourceType ? `sourceType=${encodeURIComponent(sourceType)}` : '';
  const query = [examQuery, sourceQuery].filter(Boolean).join('&');
  const queryPrefix = query ? `?${query}` : '';

  const response = await fetch(`${API_BASE_URL}/api/questions/${questionId}/validate${queryPrefix}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ selectedAnswers }),
  });

  return readJson(response);
}

export async function fetchResultHistory() {
  const response = await fetch(`${API_BASE_URL}/api/results/history`);
  return readJson(response);
}

export async function appendResultHistory(entry) {
  const response = await fetch(`${API_BASE_URL}/api/results/history`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(entry),
  });

  return readJson(response);
}

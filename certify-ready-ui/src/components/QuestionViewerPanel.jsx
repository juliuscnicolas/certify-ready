import { useMemo, useState } from 'react'

function formatAnswer(question) {
  const answers = question.answers ?? []

  if (answers.length === 0) {
    return '--'
  }

  return answers
    .map((key) => {
      const option = (question.options ?? []).find((item) => item.key === key)
      return option ? `${option.key}. ${option.text}` : key
    })
    .join(', ')
}

function isQuestionTypeMatch(question, selectedType) {
  const questionType = question.questionType ?? 'choice'

  if (selectedType === 'all') {
    return true
  }

  if (selectedType === 'sequence') {
    return questionType === 'sequence'
  }

  if (selectedType === 'hotspot') {
    return questionType === 'hotspot'
  }

  return questionType !== 'sequence' && questionType !== 'hotspot'
}

function isAnswerModeMatch(question, answerMode) {
  const answerCount = (question.answers ?? []).length

  if (answerMode === 'all') {
    return true
  }

  if (answerMode === 'multi') {
    return answerCount > 1
  }

  return answerCount <= 1
}

function isInRange(questionId, idFrom, idTo) {
  const from = Number(idFrom)
  const to = Number(idTo)

  const hasFrom = !Number.isNaN(from)
  const hasTo = !Number.isNaN(to)

  let minId = hasFrom ? from : null
  let maxId = hasTo ? to : null

  if (minId !== null && maxId !== null && minId > maxId) {
    const temp = minId
    minId = maxId
    maxId = temp
  }

  if (minId !== null && questionId < minId) {
    return false
  }

  if (maxId !== null && questionId > maxId) {
    return false
  }

  return true
}

function parseQuestionIds(value) {
  const parsed = value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0)

  return [...new Set(parsed)]
}

export function QuestionViewerPanel({ questions, examType, sourceType, onBack }) {
  const [searchText, setSearchText] = useState('')
  const [questionIdsText, setQuestionIdsText] = useState('')
  const [questionType, setQuestionType] = useState('all')
  const [answerMode, setAnswerMode] = useState('all')
  const [idFrom, setIdFrom] = useState('')
  const [idTo, setIdTo] = useState('')

  const filteredQuestions = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase()
    const parsedIds = parseQuestionIds(questionIdsText)
    const hasIdFilter = parsedIds.length > 0
    const idSet = new Set(parsedIds)

    return questions
      .filter((question) => isQuestionTypeMatch(question, questionType))
      .filter((question) => isAnswerModeMatch(question, answerMode))
      .filter((question) => isInRange(question.id, idFrom, idTo))
      .filter((question) => (hasIdFilter ? idSet.has(question.id) : true))
      .filter((question) => {
        if (!normalizedSearch) {
          return true
        }

        const searchable = [
          question.question,
          question.explanation,
          ...(question.options ?? []).map((item) => item.text),
          ...(question.answers ?? []),
        ]
          .join(' ')
          .toLowerCase()

        return searchable.includes(normalizedSearch)
      })
      .sort((left, right) => left.id - right.id)
  }, [questions, questionType, answerMode, idFrom, idTo, questionIdsText, searchText])

  return (
    <section className="panel viewer-panel">
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">Question viewer</p>
          <h2>Browse answers and explanations</h2>
          <p className="viewer-panel__meta">{examType} - {sourceType}</p>
        </div>
      </div>

      <div className="setup-grid viewer-filter-grid">
        <label className="input-group">
          <span>Search</span>
          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Question, explanation, option text, answer key"
          />
        </label>

        <label className="input-group">
          <span>Question IDs</span>
          <input
            type="text"
            value={questionIdsText}
            onChange={(event) => setQuestionIdsText(event.target.value)}
            placeholder="Exact IDs, comma-separated (example: 11, 2, 3)"
          />
        </label>

        <label className="input-group">
          <span>Question type</span>
          <select value={questionType} onChange={(event) => setQuestionType(event.target.value)}>
            <option value="all">All</option>
            <option value="choice">Multiple choice</option>
            <option value="sequence">Sequence</option>
            <option value="hotspot">Hotspot</option>
          </select>
        </label>

        <label className="input-group">
          <span>Answer mode</span>
          <select value={answerMode} onChange={(event) => setAnswerMode(event.target.value)}>
            <option value="all">All</option>
            <option value="single">Single answer</option>
            <option value="multi">Multi-answer</option>
          </select>
        </label>

        <label className="input-group">
          <span>Question ID from</span>
          <input type="number" value={idFrom} onChange={(event) => setIdFrom(event.target.value)} />
        </label>

        <label className="input-group">
          <span>Question ID to</span>
          <input type="number" value={idTo} onChange={(event) => setIdTo(event.target.value)} />
        </label>
      </div>

      <div className="review-panel__stats viewer-stats">
        <span>Total loaded: {questions.length}</span>
        <span>Filtered: {filteredQuestions.length}</span>
      </div>

      {filteredQuestions.length === 0 ? (
        <p className="empty-state">No questions matched your filters.</p>
      ) : (
        <div className="viewer-list">
          {filteredQuestions.map((question) => (
            <article key={question.id} className="review-list__item viewer-item">
              <p className="review-list__title">Question #{question.id} - {question.questionType ?? 'choice'}</p>
              <h3>{question.question}</h3>
              <p className="review-list__answer">
                <strong>Correct answer:</strong> {formatAnswer(question)}
              </p>
              <p className="incorrect-list__explanation">
                <strong>Explanation:</strong> {question.explanation || '--'}
              </p>
            </article>
          ))}
        </div>
      )}

      <div className="panel__actions">
        <button type="button" className="button button--secondary" onClick={onBack}>
          Back to setup
        </button>
      </div>
    </section>
  )
}

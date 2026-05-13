import { useEffect, useMemo, useState } from 'react'
import {
  appendResultHistory,
  fetchAllQuestionsByExam,
  fetchExams,
  fetchResultHistory,
  validateQuestion,
} from './api'
import { QuestionCard } from './components/QuestionCard'
import { QuestionViewerPanel } from './components/QuestionViewerPanel'
import { ReviewPanel } from './components/ReviewPanel'
import { ResultsPanel } from './components/ResultsPanel'
import './App.css'

function shuffleQuestions(items) {
  const copy = [...items]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = copy[index]
    copy[index] = copy[swapIndex]
    copy[swapIndex] = current
  }

  return copy
}

function matchesQuestionType(question, selectedQuestionType) {
  const questionType = question.questionType ?? 'choice'

  if (selectedQuestionType === 'all') {
    return true
  }

  if (selectedQuestionType === 'sequence') {
    return questionType === 'sequence'
  }

  if (selectedQuestionType === 'hotspot') {
    return questionType === 'hotspot'
  }

  return questionType !== 'sequence' && questionType !== 'hotspot'
}

function App() {
  const [exams, setExams] = useState([])
  const [selectedExamType, setSelectedExamType] = useState('GH300')
  const [selectedSourceType, setSelectedSourceType] = useState('Actual')
  const [selectedQuestionType, setSelectedQuestionType] = useState('all')
  const [allQuestions, setAllQuestions] = useState([])
  const [selectedQuestions, setSelectedQuestions] = useState([])
  const [questionCount, setQuestionCount] = useState(10)
  const [questionIdFrom, setQuestionIdFrom] = useState('')
  const [questionIdTo, setQuestionIdTo] = useState('')
  const [randomizeOrder, setRandomizeOrder] = useState(true)
  const [answers, setAnswers] = useState({})
  const [phase, setPhase] = useState('setup')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState(null)
  const [historyEntries, setHistoryEntries] = useState([])
  const [examStartedAt, setExamStartedAt] = useState(null)

  useEffect(() => {
    async function loadExams() {
      try {
        setLoading(true)
        setError('')

        const availableExams = await fetchExams()
        setExams(availableExams)

        if (availableExams.length > 0) {
          setSelectedExamType((currentExamType) => {
            const selectedExam = availableExams.find((exam) => exam.examType === currentExamType)
            const fallbackExam = selectedExam ?? availableExams[0]

            setSelectedSourceType((currentSourceType) => {
              const selectedSource = fallbackExam.sources?.find(
                (source) => source.sourceType === currentSourceType,
              )
              return selectedSource ? currentSourceType : (fallbackExam.sources?.[0]?.sourceType ?? 'Actual')
            })

            return fallbackExam.examType
          })
        }
      } catch (loadError) {
        setError(loadError.message || 'Unable to load exams from the API.')
      } finally {
        setLoading(false)
      }
    }

    loadExams()
  }, [])

  useEffect(() => {
    async function loadQuestions() {
      if (!selectedExamType || !selectedSourceType) {
        return
      }

      try {
        setLoading(true)
        setError('')

        const items = await fetchAllQuestionsByExam(selectedExamType, selectedSourceType)
        setAllQuestions(items)
        setQuestionCount(Math.min(20, items.length || 10))
        setQuestionIdFrom('')
        setQuestionIdTo('')
        setSelectedQuestions([])
        setAnswers({})
        setResults(null)
        setPhase('setup')
      } catch (loadError) {
        setError(loadError.message || 'Unable to load questions from the API.')
      } finally {
        setLoading(false)
      }
    }

    loadQuestions()
  }, [selectedExamType, selectedSourceType])

  useEffect(() => {
    async function loadHistory() {
      try {
        setHistoryLoading(true)
        const items = await fetchResultHistory()
        setHistoryEntries(items)
      } catch (historyError) {
        setError(historyError.message || 'Unable to load result history from the API.')
      } finally {
        setHistoryLoading(false)
      }
    }

    loadHistory()
  }, [])

  const selectedExam = exams.find((exam) => exam.examType === selectedExamType)
  const availableSources = selectedExam?.sources ?? []

  const answeredCount = useMemo(
    () => selectedQuestions.filter((question) => (answers[question.id] ?? []).length > 0).length,
    [answers, selectedQuestions],
  )

  const availableQuestions = useMemo(
    () => allQuestions.filter((question) => matchesQuestionType(question, selectedQuestionType)),
    [allQuestions, selectedQuestionType],
  )

  const availableIdBounds = useMemo(() => {
    if (availableQuestions.length === 0) {
      return { min: null, max: null }
    }

    const ids = availableQuestions.map((question) => question.id)
    return {
      min: Math.min(...ids),
      max: Math.max(...ids),
    }
  }, [availableQuestions])

  useEffect(() => {
    if (availableIdBounds.min === null || availableIdBounds.max === null) {
      setQuestionIdFrom('')
      setQuestionIdTo('')
      return
    }

    setQuestionIdFrom((currentValue) =>
      currentValue === '' ? String(availableIdBounds.min) : currentValue,
    )
    setQuestionIdTo((currentValue) =>
      currentValue === '' ? String(availableIdBounds.max) : currentValue,
    )
  }, [availableIdBounds])

  const rangeFilteredQuestions = useMemo(() => {
    const fromValue = Number(questionIdFrom)
    const toValue = Number(questionIdTo)

    const hasFrom = !Number.isNaN(fromValue)
    const hasTo = !Number.isNaN(toValue)

    let rangeStart = hasFrom ? fromValue : null
    let rangeEnd = hasTo ? toValue : null

    if (rangeStart !== null && rangeEnd !== null && rangeStart > rangeEnd) {
      const temp = rangeStart
      rangeStart = rangeEnd
      rangeEnd = temp
    }

    return availableQuestions.filter((question) => {
      if (rangeStart !== null && question.id < rangeStart) {
        return false
      }

      if (rangeEnd !== null && question.id > rangeEnd) {
        return false
      }

      return true
    })
  }, [availableQuestions, questionIdFrom, questionIdTo])

  useEffect(() => {
    setQuestionCount((currentCount) => {
      const numericCount = Number(currentCount)

      if (Number.isNaN(numericCount)) {
        return currentCount
      }

      if (rangeFilteredQuestions.length === 0) {
        return 0
      }

      return Math.min(Math.max(numericCount || 1, 1), rangeFilteredQuestions.length)
    })
  }, [rangeFilteredQuestions])

  const availableQuestionCount = rangeFilteredQuestions.length
  const safeQuestionCount = Math.min(Math.max(Number(questionCount) || 1, 1), availableQuestionCount || 1)

  function handleQuestionCountChange(value) {
    const nextValue = Number(value)

    if (Number.isNaN(nextValue)) {
      setQuestionCount('')
      return
    }

    setQuestionCount(nextValue)
  }

  function startExam() {
    const sourceQuestions = randomizeOrder
      ? shuffleQuestions(rangeFilteredQuestions)
      : [...rangeFilteredQuestions].sort((left, right) => left.id - right.id)

    const sampledQuestions = sourceQuestions.slice(0, safeQuestionCount)

    setSelectedQuestions(sampledQuestions)
    setAnswers({})
    setResults(null)
    setExamStartedAt(new Date().toISOString())
    setPhase('answering')
    setError('')
  }

  function handleAnswerChange(questionId, optionKey, checked, isMultiAnswer) {
    setAnswers((currentAnswers) => {
      const previousSelection = currentAnswers[questionId] ?? []

      let nextSelection
      if (isMultiAnswer) {
        nextSelection = checked
          ? [...previousSelection, optionKey]
          : previousSelection.filter((item) => item !== optionKey)
      } else {
        nextSelection = checked ? [optionKey] : []
      }

      return {
        ...currentAnswers,
        [questionId]: [...new Set(nextSelection)],
      }
    })
  }

  function handleSequenceAnswerChange(questionId, orderedOptionKeys) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: [...new Set(orderedOptionKeys)],
    }))
  }

  function handleHotspotAnswerChange(questionId, slotIndex, optionKey) {
    setAnswers((currentAnswers) => {
      const previousSelection = currentAnswers[questionId] ?? []
      const nextSelection = [...previousSelection]
      nextSelection[slotIndex] = optionKey

      return {
        ...currentAnswers,
        [questionId]: nextSelection,
      }
    })
  }

  async function submitExam() {
    try {
      setSubmitting(true)
      setError('')

      const validations = await Promise.all(
        selectedQuestions.map(async (question) => {
          const selectedAnswers = answers[question.id] ?? []
          const validation = await validateQuestion(
            question.id,
            selectedAnswers,
            selectedExamType,
            selectedSourceType,
          )

          return {
            question,
            selectedAnswers: validation.selectedAnswers,
            correctAnswers: validation.correctAnswers,
            isCorrect: validation.isCorrect,
          }
        }),
      )

      const incorrectItems = validations.filter((item) => !item.isCorrect)
      const correctCount = validations.length - incorrectItems.length
      const totalIncorrect = incorrectItems.length
      const unansweredCount = validations.filter((item) => item.selectedAnswers.length === 0).length
      const percentage = validations.length === 0
        ? 0
        : Math.round((correctCount / validations.length) * 100)

      const completedAt = new Date()
      const startedAt = examStartedAt ? new Date(examStartedAt) : null
      const durationSeconds = startedAt
        ? Math.max(0, Math.round((completedAt.getTime() - startedAt.getTime()) / 1000))
        : 0

      const historyEntry = {
        examType: selectedExamType,
        sourceType: selectedSourceType,
        totalQuestions: validations.length,
        totalCorrect: correctCount,
        totalIncorrect,
        incorrectQuestionIds: incorrectItems.map((item) => item.question.id),
        durationSeconds,
        completedAt: completedAt.toISOString(),
        percentage,
      }

      try {
        const updatedHistory = await appendResultHistory(historyEntry)
        setHistoryEntries(updatedHistory)
      } catch {
        setError('Exam submitted, but saving history failed.')
      }

      setResults({
        totalQuestions: validations.length,
        examType: selectedExamType,
        sourceType: selectedSourceType,
        correctCount,
        answeredCount,
        unansweredCount,
        percentage,
        totalIncorrect,
        durationSeconds,
        completedAt: completedAt.toISOString(),
        incorrectItems,
      })
      setPhase('results')
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit your exam right now.')
    } finally {
      setSubmitting(false)
    }
  }

  function resetExam() {
    setSelectedQuestions([])
    setAnswers({})
    setResults(null)
    setExamStartedAt(null)
    setPhase('setup')
    setError('')
  }

  function formatDuration(seconds) {
    const safeSeconds = Math.max(0, Number(seconds) || 0)
    const mins = Math.floor(safeSeconds / 60)
    const secs = safeSeconds % 60
    return `${mins}m ${String(secs).padStart(2, '0')}s`
  }

  const unansweredCount = selectedQuestions.length - answeredCount

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__copy">
          <p className="hero__eyebrow">Certify Ready</p>
          <h1>Build a focused exam session before you submit the real one.</h1>
          <p className="hero__description">
            Pick an exam and source, narrow down by question ID range, then choose whether to
            tackle them in order or shuffle for a real exam feel. Review your answers before
            submitting — and get an instant score breakdown when you&apos;re done.
          </p>
        </div>
        <div className="hero__meta">
          <div className="hero-stat">
            <span>Exam type</span>
            <strong>{selectedExamType || '--'}</strong>
          </div>
          <div className="hero-stat">
            <span>Dump source</span>
            <strong>{selectedSourceType || '--'}</strong>
          </div>
          <div className="hero-stat">
            <span>Question bank</span>
            <strong>{availableQuestionCount || '--'}</strong>
          </div>
          <div className="hero-stat hero-stat--accent">
            <span>Current phase</span>
            <strong>{phase}</strong>
          </div>
        </div>
      </header>

      {loading ? <section className="panel">Loading questions from the API...</section> : null}

      {!loading && error ? <section className="panel error-banner">{error}</section> : null}

      {!loading && phase === 'setup' ? (
        <section className="panel setup-panel">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">Session setup</p>
              <h2>How many questions do you want to answer?</h2>
            </div>
          </div>

          <div className="setup-grid">
            <label className="input-group">
              <span>Exam type</span>
              <select
                value={selectedExamType}
                onChange={(event) => {
                  const nextExamType = event.target.value
                  const nextExam = exams.find((exam) => exam.examType === nextExamType)
                  setSelectedExamType(nextExamType)
                  setSelectedSourceType(nextExam?.sources?.[0]?.sourceType ?? 'Actual')
                }}
                disabled={!exams.length}
              >
                {exams.map((exam) => (
                  <option key={exam.examType} value={exam.examType}>
                    {exam.examType} - {exam.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label className="input-group">
              <span>Dump source</span>
              <select
                value={selectedSourceType}
                onChange={(event) => setSelectedSourceType(event.target.value)}
                disabled={!availableSources.length}
              >
                {availableSources.map((source) => (
                  <option key={source.sourceType} value={source.sourceType}>
                    {source.sourceType} - {source.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label className="input-group">
              <span>Question count</span>
              <input
                type="number"
                min={availableQuestionCount ? '1' : '0'}
                max={availableQuestionCount || 1}
                value={questionCount}
                onChange={(event) => handleQuestionCountChange(event.target.value)}
              />
            </label>

            <label className="input-group">
              <span>Question ID from</span>
              <input
                type="number"
                min={availableIdBounds.min ?? undefined}
                max={availableIdBounds.max ?? undefined}
                value={questionIdFrom}
                onChange={(event) => setQuestionIdFrom(event.target.value)}
                placeholder={availableIdBounds.min ? String(availableIdBounds.min) : ''}
              />
            </label>

            <label className="input-group">
              <span>Question ID to</span>
              <input
                type="number"
                min={availableIdBounds.min ?? undefined}
                max={availableIdBounds.max ?? undefined}
                value={questionIdTo}
                onChange={(event) => setQuestionIdTo(event.target.value)}
                placeholder={availableIdBounds.max ? String(availableIdBounds.max) : ''}
              />
            </label>

            <label className="input-group">
              <span>Question type</span>
              <select
                value={selectedQuestionType}
                onChange={(event) => setSelectedQuestionType(event.target.value)}
              >
                <option value="all">All</option>
                <option value="choice">Multiple choice</option>
                <option value="sequence">Sequence</option>
                <option value="hotspot">Hotspot</option>
              </select>
            </label>

            <label className="input-group">
              <span>Order</span>
              <select
                value={randomizeOrder ? 'random' : 'ordered'}
                onChange={(event) => setRandomizeOrder(event.target.value === 'random')}
              >
                <option value="random">Randomize in selected range</option>
                <option value="ordered">Keep ID order</option>
              </select>
            </label>

            <label className="input-group input-group--range">
              <span>Adjust quickly</span>
              <input
                type="range"
                min={availableQuestionCount ? '1' : '0'}
                max={availableQuestionCount || 1}
                value={availableQuestionCount ? safeQuestionCount : 0}
                onChange={(event) => handleQuestionCountChange(event.target.value)}
                disabled={!availableQuestionCount}
              />
            </label>
          </div>

          <div className="chip-row">
            {[10, 20, 30, 50].filter((value) => value <= availableQuestionCount).map((value) => (
              <button
                key={value}
                type="button"
                className={`chip ${safeQuestionCount === value ? 'chip--active' : ''}`}
                onClick={() => setQuestionCount(value)}
              >
                {value} questions
              </button>
            ))}
          </div>

          <div className="panel__actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setPhase('viewer')}
              disabled={!allQuestions.length}
            >
              Question viewer
            </button>

            <button
              type="button"
              className="button button--secondary"
              onClick={() => setPhase('history')}
              disabled={historyLoading}
            >
              {historyLoading ? 'Loading history...' : 'View result history'}
            </button>

            <button
              type="button"
              className="button"
              onClick={startExam}
              disabled={!availableQuestionCount}
            >
              Start exam
            </button>
          </div>
        </section>
      ) : null}

      {!loading && phase === 'answering' ? (
        <div className="content-grid">
          <section className="question-stack">
            {selectedQuestions.map((question, index) => (
              <QuestionCard
                key={question.id}
                index={index}
                question={question}
                selectedAnswers={answers[question.id] ?? []}
                onAnswerChange={handleAnswerChange}
                onSequenceAnswerChange={handleSequenceAnswerChange}
                onHotspotAnswerChange={handleHotspotAnswerChange}
              />
            ))}
          </section>

          <aside className="panel side-panel">
            <p className="panel__eyebrow">Progress snapshot</p>
            <h2>Answer first, review second.</h2>
            <div className="summary-card-list">
              <div className="summary-card">
                <span>Total questions</span>
                <strong>{selectedQuestions.length}</strong>
              </div>
              <div className="summary-card">
                <span>Answered</span>
                <strong>{answeredCount}</strong>
              </div>
              <div className="summary-card">
                <span>Unanswered</span>
                <strong>{unansweredCount}</strong>
              </div>
            </div>
            <div className="panel__actions panel__actions--stacked">
              <button type="button" className="button" onClick={() => setPhase('review')}>
                Review answers
              </button>
              <button type="button" className="button button--secondary" onClick={resetExam}>
                Start over
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      {!loading && phase === 'review' ? (
        <ReviewPanel
          questions={selectedQuestions}
          answers={answers}
          onBack={() => setPhase('answering')}
          onSubmit={submitExam}
          submitting={submitting}
        />
      ) : null}

      {!loading && phase === 'results' && results ? (
        <ResultsPanel
          results={results}
          onRestart={resetExam}
          onReview={() => setPhase('review')}
          onViewHistory={() => setPhase('history')}
        />
      ) : null}

      {!loading && phase === 'history' ? (
        <section className="panel history-panel">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">Result history</p>
              <h2>Past exam attempts</h2>
            </div>
          </div>

          {historyEntries.length === 0 ? (
            <p className="empty-state">No exam history yet. Complete an exam to see attempts here.</p>
          ) : (
            <div className="history-table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date &amp; time</th>
                    <th>Exam type</th>
                    <th>Exam source</th>
                    <th>Total</th>
                    <th>Correct</th>
                    <th>Incorrect</th>
                    <th>Incorrect IDs</th>
                    <th>Duration</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {historyEntries.map((entry) => (
                    <tr key={entry.attemptId ?? `${entry.completedAt}-${entry.examType}-${entry.sourceType}`}>
                      <td>{new Date(entry.completedAt).toLocaleString()}</td>
                      <td>{entry.examType}</td>
                      <td>{entry.sourceType}</td>
                      <td>{entry.totalQuestions}</td>
                      <td>{entry.totalCorrect}</td>
                      <td>{entry.totalIncorrect}</td>
                      <td>
                        {(entry.incorrectQuestionIds ?? []).length
                          ? entry.incorrectQuestionIds.join(', ')
                          : '--'}
                      </td>
                      <td>{formatDuration(entry.durationSeconds)}</td>
                      <td>{entry.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="panel__actions">
            <button type="button" className="button button--secondary" onClick={() => setPhase('setup')}>
              Back to setup
            </button>
          </div>
        </section>
      ) : null}

      {!loading && phase === 'viewer' ? (
        <QuestionViewerPanel
          questions={allQuestions}
          examType={selectedExamType}
          sourceType={selectedSourceType}
          onBack={() => setPhase('setup')}
        />
      ) : null}
    </div>
  )
}

export default App

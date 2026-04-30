import { useEffect, useMemo, useState } from 'react'
import { fetchAllQuestionsByExam, fetchExams, validateQuestion } from './api'
import { QuestionCard } from './components/QuestionCard'
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

function App() {
  const [exams, setExams] = useState([])
  const [selectedExamType, setSelectedExamType] = useState('GH300')
  const [selectedSourceType, setSelectedSourceType] = useState('Actual')
  const [allQuestions, setAllQuestions] = useState([])
  const [selectedQuestions, setSelectedQuestions] = useState([])
  const [questionCount, setQuestionCount] = useState(10)
  const [answers, setAnswers] = useState({})
  const [phase, setPhase] = useState('setup')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState(null)

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

  const selectedExam = exams.find((exam) => exam.examType === selectedExamType)
  const availableSources = selectedExam?.sources ?? []

  const answeredCount = useMemo(
    () => selectedQuestions.filter((question) => (answers[question.id] ?? []).length > 0).length,
    [answers, selectedQuestions],
  )

  const availableQuestionCount = allQuestions.length
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
    const sampledQuestions = shuffleQuestions(allQuestions).slice(0, safeQuestionCount)

    setSelectedQuestions(sampledQuestions)
    setAnswers({})
    setResults(null)
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
      const unansweredCount = validations.filter((item) => item.selectedAnswers.length === 0).length
      const percentage = validations.length === 0
        ? 0
        : Math.round((correctCount / validations.length) * 100)

      setResults({
        totalQuestions: validations.length,
        examType: selectedExamType,
        sourceType: selectedSourceType,
        correctCount,
        answeredCount,
        unansweredCount,
        percentage,
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
    setPhase('setup')
    setError('')
  }

  const unansweredCount = selectedQuestions.length - answeredCount

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__copy">
          <p className="hero__eyebrow">Certify Ready</p>
          <h1>Build a focused exam session before you submit the real one.</h1>
          <p className="hero__description">
            Pick how many questions you want, answer them in one pass, review your choices,
            then submit to see your percentage and every incorrect answer.
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
                min="1"
                max={availableQuestionCount || 1}
                value={questionCount}
                onChange={(event) => handleQuestionCountChange(event.target.value)}
              />
            </label>

            <label className="input-group input-group--range">
              <span>Adjust quickly</span>
              <input
                type="range"
                min="1"
                max={availableQuestionCount || 1}
                value={safeQuestionCount}
                onChange={(event) => handleQuestionCountChange(event.target.value)}
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
        />
      ) : null}
    </div>
  )
}

export default App

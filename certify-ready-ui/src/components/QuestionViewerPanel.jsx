import { useMemo, useState } from 'react'

function formatQuestionType(questionType) {
  if (questionType === 'hotspot') {
    return 'Hotspot'
  }

  if (questionType === 'sequence') {
    return 'Sequence'
  }

  if (questionType === 'yesno') {
    return 'Yes or no'
  }

  return 'Multiple choice'
}

function getOptionMap(question) {
  return new Map((question.options ?? []).map((option) => [option.key, option.text]))
}

function formatAnswer(question) {
  const answers = question.answers ?? []
  const optionMap = getOptionMap(question)

  if (answers.length === 0) {
    return '--'
  }

  return answers
    .map((key) => {
      const optionText = optionMap.get(key)
      return optionText ? `${key}. ${optionText}` : key
    })
    .join(', ')
}

function formatAllowedKeys(question, slotIndex) {
  const allowedKeys = question.hotspotSlotOptionKeys?.[slotIndex]

  if (!Array.isArray(allowedKeys) || allowedKeys.length === 0) {
    return 'All options'
  }

  return allowedKeys.join(', ')
}

function splitPrompt(questionText) {
  const marker = 'Answer area:'
  const markerIndex = questionText.indexOf(marker)

  if (markerIndex === -1) {
    return {
      prompt: questionText,
      answerArea: '',
    }
  }

  return {
    prompt: questionText.slice(0, markerIndex).trimEnd(),
    answerArea: questionText.slice(markerIndex + marker.length).trim(),
  }
}

function looksLikeCodeBlock(value) {
  const text = value ?? ''

  if (text.includes('\n  ') || text.includes('\n\t')) {
    return true
  }

  if (/\{[\s\S]*\}|\[[\s\S]*\]|\$[a-zA-Z_]/.test(text)) {
    return true
  }

  if (/\b(az|kubectl|docker|function|public|class|var|SELECT|FROM|WHERE)\b/.test(text)) {
    return true
  }

  return false
}

function splitByBlankLines(value) {
  return (value ?? '')
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
}

function isCodeChunk(chunk) {
  const lines = chunk.split('\n')
  let score = 0

  lines.forEach((line) => {
    const trimmed = line.trim()

    if (trimmed === '' || trimmed === '{' || trimmed === '}') {
      score += 1
      return
    }

    if (/^\[\w+/.test(trimmed)) {
      score += 2
    }

    if (/^\$[a-zA-Z_]/.test(trimmed)) {
      score += 2
    }

    if (/^(public|private|protected|class|function|var|const|let|if|for|while|return)\b/.test(trimmed)) {
      score += 2
    }

    if (/(;|=>|\{\{|\}\}|\(.*\)|\[SLOT \d+\])/.test(trimmed)) {
      score += 1
    }

    if (/^(az|kubectl|docker)\s/.test(trimmed)) {
      score += 2
    }
  })

  return score >= Math.max(3, Math.floor(lines.length * 1.2))
}

function detectCodeLanguage(code) {
  const text = code ?? ''
  
  // C# patterns
  if (/\b(public|private|protected|class|namespace|async|await|using|var|readonly)\b/.test(text) && /[{}]/.test(text)) {
    return 'C#'
  }
  
  // PowerShell patterns
  if (/\$[a-zA-Z_]|Get-|Set-|New-|Remove-|-like|-eq|-ne/.test(text)) {
    return 'PowerShell'
  }
  
  // YAML patterns
  if (/^[a-zA-Z_][a-zA-Z0-9_-]*:\s/m.test(text) && /^[\s-]/.test(text)) {
    return 'YAML'
  }
  
  // JSON patterns
  if (/^[\s]*[\{\[]/.test(text) && /[\}\]][,\s]*$/.test(text)) {
    return 'JSON'
  }
  
  // JavaScript patterns
  if (/\b(function|const|let|var|=>|async|await|import|export)\b/.test(text)) {
    return 'JavaScript'
  }
  
  // CLI patterns (az, kubectl, docker commands)
  if (/^(az |kubectl |docker |git |npm |yarn )/m.test(text)) {
    return 'CLI'
  }
  
  return 'Code'
}

function CodeBlock({ code }) {
  const language = detectCodeLanguage(code)
  
  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-block-language">{language}</span>
      </div>
      <textarea
        className="viewer-code-editor"
        value={code}
        readOnly
        rows={Math.min(Math.max(code.split('\n').length + 1, 4), 16)}
        spellCheck={false}
      />
    </div>
  )
}

function PromptSections({ text }) {
  const chunks = splitByBlankLines(text)

  if (chunks.length === 0) {
    return <pre className="viewer-pre">--</pre>
  }

  return (
    <div className="viewer-prompt-sections">
      {chunks.map((chunk, index) => {
        if (isCodeChunk(chunk)) {
          return (
            <CodeBlock key={`prompt-code-${index}`} code={chunk} />
          )
        }

        return (
          <pre key={`prompt-text-${index}`} className="viewer-pre viewer-pre--text-chunk">
            {chunk}
          </pre>
        )
      })}
    </div>
  )
}

function ReadOnlyCodeEditor({ value, label, minRows = 8 }) {
  return (
    <div className="viewer-block viewer-code-block">
      <p className="viewer-block__label">{label}</p>
      <textarea
        className="viewer-code-editor"
        value={value}
        readOnly
        rows={minRows}
        spellCheck={false}
      />
    </div>
  )
}

function QuestionJsonViewerItem({ question }) {
  const optionMap = getOptionMap(question)
  const { prompt, answerArea } = splitPrompt(question.question ?? '')
  const answers = question.answers ?? []
  const options = question.options ?? []

  return (
    <article key={question.id} className="review-list__item viewer-item viewer-item--json">
      <div className="viewer-item__topline">
        <p className="review-list__title">Question #{question.id}</p>
        <span className="viewer-type-pill">{formatQuestionType(question.questionType)}</span>
      </div>

      <div className="viewer-block">
        <p className="viewer-block__label">Prompt</p>
        <PromptSections text={prompt} />
      </div>

      <details className="viewer-code-details" open={looksLikeCodeBlock(prompt)}>
        <summary>Open full question in read-only editor</summary>
        <ReadOnlyCodeEditor
          label="Question source"
          value={question.question ?? ''}
          minRows={Math.min(Math.max((question.question ?? '').split('\n').length + 1, 10), 22)}
        />
      </details>

      {answerArea ? (
        <div className="viewer-block">
          <p className="viewer-block__label">Answer area</p>
          <pre className="viewer-pre viewer-pre--answer-area">{answerArea}</pre>
        </div>
      ) : null}

      {question.questionType === 'hotspot' && (question.hotspotSlots?.length ?? 0) > 0 ? (
        <div className="viewer-block">
          <p className="viewer-block__label">Hotspot slots</p>
          <div className="viewer-slot-grid">
            {question.hotspotSlots.map((slot, slotIndex) => (
              <div key={`${question.id}-slot-${slotIndex}`} className="viewer-slot-item">
                <p>
                  <strong>Slot {slotIndex + 1}:</strong> {slot}
                </p>
                <p>
                  <strong>Allowed keys:</strong> {formatAllowedKeys(question, slotIndex)}
                </p>
                <p>
                  <strong>Correct:</strong>{' '}
                  {answers[slotIndex]
                    ? `${answers[slotIndex]}${optionMap.get(answers[slotIndex]) ? `. ${optionMap.get(answers[slotIndex])}` : ''}`
                    : '--'}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {question.questionType === 'sequence' ? (
        <div className="viewer-block">
          <p className="viewer-block__label">Sequence details</p>
          <p className="viewer-inline-meta">
            <strong>Expected length:</strong> {question.sequenceLength ?? answers.length}
          </p>
        </div>
      ) : null}

      {options.length > 0 ? (
        <div className="viewer-block">
          <p className="viewer-block__label">Options</p>
          <div className="viewer-option-grid">
            {options.map((option) => {
              const isCorrect = answers.includes(option.key)
              const optionHasCode = looksLikeCodeBlock(option.text)

              return (
                <div key={option.key} className={`viewer-option-item ${isCorrect ? 'viewer-option-item--correct' : ''}`}>
                  <span className="viewer-option-item__key">{option.key}</span>
                  <span className="viewer-option-item__text">
                    {optionHasCode ? (
                      <CodeBlock code={option.text} />
                    ) : (
                      option.text
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      <p className="review-list__answer viewer-answer">
        <strong>Correct answer:</strong> {formatAnswer(question)}
      </p>
      <p className="incorrect-list__explanation">
        <strong>Explanation:</strong> {question.explanation || '--'}
      </p>

      <details className="viewer-raw-json">
        <summary>Show raw JSON</summary>
        <pre className="viewer-pre viewer-pre--raw">{JSON.stringify(question, null, 2)}</pre>
      </details>
    </article>
  )
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
            <QuestionJsonViewerItem key={question.id} question={question} />
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

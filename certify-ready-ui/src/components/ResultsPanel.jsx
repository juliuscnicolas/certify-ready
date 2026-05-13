function renderOptionText(question, keys) {
  if (!keys.length) {
    return 'No answer selected';
  }

  return keys
    .map((key) => {
      const option = question.options.find((item) => item.key === key);
      return option ? `${option.key}. ${option.text}` : key;
    })
    .join(', ');
}

export function ResultsPanel({ results, onRestart, onReview, onViewHistory }) {
  return (
    <section className="panel results-panel">
      <div className="results-hero">
        <div>
          <p className="panel__eyebrow">Exam complete</p>
          <h2>Your score: {results.percentage}%</h2>
          <p>
            {results.correctCount} correct out of {results.totalQuestions} questions.
          </p>
        </div>

        <div className="score-chip">
          <span>Incorrect</span>
          <strong>{results.incorrectItems.length}</strong>
        </div>
      </div>

      <div className="results-summary-grid">
        <div className="summary-card">
          <span>Answered</span>
          <strong>{results.answeredCount}</strong>
        </div>
        <div className="summary-card">
          <span>Correct</span>
          <strong>{results.correctCount}</strong>
        </div>
        <div className="summary-card">
          <span>Unanswered</span>
          <strong>{results.unansweredCount}</strong>
        </div>
      </div>

      <div className="panel__actions">
        <button type="button" className="button button--secondary" onClick={onViewHistory}>
          View history
        </button>
        <button type="button" className="button button--secondary" onClick={onReview}>
          Review attempt
        </button>
        <button type="button" className="button" onClick={onRestart}>
          Start another exam
        </button>
      </div>

      <div className="incorrect-section">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">Incorrect answers</p>
            <h3>Focus on the questions you missed</h3>
          </div>
        </div>

        {results.incorrectItems.length === 0 ? (
          <p className="empty-state">Perfect score. No incorrect answers to review.</p>
        ) : (
          <div className="incorrect-list">
            {results.incorrectItems.map((item, index) => (
              <article key={item.question.id} className="incorrect-list__item">
                <p className="review-list__title">Missed question {index + 1}</p>
                <h4>{item.question.question}</h4>
                <p>
                  <strong>Your answer:</strong> {renderOptionText(item.question, item.selectedAnswers)}
                </p>
                <p>
                  <strong>Correct answer:</strong> {renderOptionText(item.question, item.correctAnswers)}
                </p>
                {item.question.explanation ? (
                  <p className="incorrect-list__explanation">
                    <strong>Why:</strong> {item.question.explanation}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

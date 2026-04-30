function formatSelection(question, selectedKeys) {
  if (!selectedKeys.length) {
    return 'No answer selected';
  }

  return selectedKeys
    .map((key) => {
      const option = question.options.find((item) => item.key === key);
      return option ? `${option.key}. ${option.text}` : key;
    })
    .join(', ');
}

export function ReviewPanel({ questions, answers, onBack, onSubmit, submitting }) {
  const answeredCount = questions.filter((question) => (answers[question.id] ?? []).length > 0).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <section className="panel review-panel">
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">Final review</p>
          <h2>Check your answers before submitting</h2>
        </div>
        <div className="review-panel__stats">
          <span>{answeredCount} answered</span>
          <span>{unansweredCount} unanswered</span>
        </div>
      </div>

      <div className="review-list">
        {questions.map((question, index) => {
          const selectedKeys = answers[question.id] ?? [];

          return (
            <article key={question.id} className="review-list__item">
              <div>
                <p className="review-list__title">Question {index + 1}</p>
                <h3>{question.question}</h3>
              </div>
              <p className={selectedKeys.length ? 'review-list__answer' : 'review-list__answer review-list__answer--empty'}>
                {formatSelection(question, selectedKeys)}
              </p>
            </article>
          );
        })}
      </div>

      <div className="panel__actions">
        <button type="button" className="button button--secondary" onClick={onBack}>
          Back to questions
        </button>
        <button type="button" className="button" onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit exam'}
        </button>
      </div>
    </section>
  );
}

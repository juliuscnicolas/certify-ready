function getSelectionHelp(question) {
  return question.answers.length > 1 ? 'Select all correct answers.' : 'Select one answer.';
}

export function QuestionCard({ index, question, selectedAnswers, onAnswerChange }) {
  const isMultiAnswer = question.answers.length > 1;
  const inputType = isMultiAnswer ? 'checkbox' : 'radio';

  return (
    <article className="question-card">
      <header className="question-card__header">
        <div>
          <p className="question-card__eyebrow">Question {index + 1}</p>
          <h2>{question.question}</h2>
        </div>
        <span className="question-card__hint">{getSelectionHelp(question)}</span>
      </header>

      <div className="question-card__options">
        {question.options.map((option) => {
          const isSelected = selectedAnswers.includes(option.key);

          return (
            <label
              key={option.key}
              className={`option-tile ${isSelected ? 'option-tile--selected' : ''}`}
            >
              <input
                type={inputType}
                name={`question-${question.id}`}
                checked={isSelected}
                onChange={(event) =>
                  onAnswerChange(question.id, option.key, event.target.checked, isMultiAnswer)
                }
              />
              <span className="option-tile__key">{option.key}</span>
              <span className="option-tile__text">{option.text}</span>
            </label>
          );
        })}
      </div>
    </article>
  );
}

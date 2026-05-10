function getSelectionHelp(question) {
  if (question.questionType === 'sequence') {
    return 'Drag the correct steps into order.';
  }

  if (question.questionType === 'hotspot') {
    return 'Select the correct value for each hot spot.';
  }

  return question.answers.length > 1 ? 'Select all correct answers.' : 'Select one answer.';
}

function renderQuestionText(text) {
  return text.split(/(<u>[\s\S]*?<\/u>)/g).map((segment, index) => {
    const underlineMatch = segment.match(/^<u>([\s\S]*?)<\/u>$/);

    if (underlineMatch) {
      return <u key={index}>{underlineMatch[1]}</u>;
    }

    return <span key={index}>{segment}</span>;
  });
}

function SequenceQuestionCard({ question, selectedAnswers, onSequenceAnswerChange }) {
  const sequenceLength = question.sequenceLength ?? question.answers.length;
  const availableOptions = question.options.filter((option) => !selectedAnswers.includes(option.key));

  function updateSequence(nextSelection) {
    onSequenceAnswerChange(question.id, nextSelection.slice(0, sequenceLength));
  }

  function addOption(optionKey, targetIndex = selectedAnswers.length) {
    if (selectedAnswers.includes(optionKey) || selectedAnswers.length >= sequenceLength) {
      return;
    }

    const nextSelection = [...selectedAnswers];
    nextSelection.splice(targetIndex, 0, optionKey);
    updateSequence(nextSelection);
  }

  function removeOption(optionKey) {
    updateSequence(selectedAnswers.filter((item) => item !== optionKey));
  }

  function moveOption(optionKey, targetIndex) {
    const currentIndex = selectedAnswers.indexOf(optionKey);

    if (currentIndex === -1) {
      addOption(optionKey, targetIndex);
      return;
    }

    const nextSelection = selectedAnswers.filter((item) => item !== optionKey);
    nextSelection.splice(targetIndex, 0, optionKey);
    updateSequence(nextSelection);
  }

  function handleDragStart(event, optionKey) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', optionKey);
  }

  function handleDrop(event, targetIndex) {
    event.preventDefault();
    const optionKey = event.dataTransfer.getData('text/plain');

    if (!optionKey) {
      return;
    }

    moveOption(optionKey, targetIndex);
  }

  return (
    <div className="sequence-builder">
      <div className="sequence-builder__panel">
        <p className="sequence-builder__title">Available actions</p>
        <div className="sequence-builder__bank">
          {availableOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className="sequence-chip"
              draggable
              onDragStart={(event) => handleDragStart(event, option.key)}
              onClick={() => addOption(option.key)}
            >
              <span className="option-tile__key">{option.key}</span>
              <span className="option-tile__text">{option.text}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sequence-builder__panel">
        <p className="sequence-builder__title">Answer sequence</p>
        <div className="sequence-builder__slots">
          {Array.from({ length: sequenceLength }, (_, index) => {
            const optionKey = selectedAnswers[index];
            const selectedOption = question.options.find((item) => item.key === optionKey);

            return (
              <div
                key={index}
                className={`sequence-slot ${selectedOption ? 'sequence-slot--filled' : ''}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDrop(event, index)}
              >
                <span className="sequence-slot__index">Step {index + 1}</span>
                {selectedOption ? (
                  <div
                    className="sequence-choice"
                    draggable
                    onDragStart={(event) => handleDragStart(event, selectedOption.key)}
                  >
                    <div className="sequence-choice__content">
                      <span className="option-tile__key">{selectedOption.key}</span>
                      <span className="option-tile__text">{selectedOption.text}</span>
                    </div>
                    <button
                      type="button"
                      className="sequence-choice__remove"
                      onClick={() => removeOption(selectedOption.key)}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <span className="sequence-slot__placeholder">Drop an action here</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HotspotQuestionCard({ question, selectedAnswers, onHotspotAnswerChange }) {
  const hotspotSlots = question.hotspotSlots?.length
    ? question.hotspotSlots
    : question.answers.map((_answer, index) => `Hot spot ${index + 1}`);

  return (
    <div className="hotspot-grid">
      {hotspotSlots.map((slotLabel, slotIndex) => {
        const allowedKeys = question.hotspotSlotOptionKeys?.[slotIndex];
        const allowedOptions = Array.isArray(allowedKeys) && allowedKeys.length > 0
          ? question.options.filter((option) => allowedKeys.includes(option.key))
          : question.options;

        return (
          <label key={`${question.id}-${slotIndex}`} className="hotspot-slot">
            <span className="hotspot-slot__label">{slotLabel}</span>
            <select
              value={selectedAnswers[slotIndex] ?? ''}
              onChange={(event) => onHotspotAnswerChange(question.id, slotIndex, event.target.value)}
            >
              <option value="">Select an option</option>
              {allowedOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.key}. {option.text}
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </div>
  );
}

export function QuestionCard({
  index,
  question,
  selectedAnswers,
  onAnswerChange,
  onSequenceAnswerChange,
  onHotspotAnswerChange,
}) {
  if (question.questionType === 'sequence') {
    return (
      <article className="question-card">
        <header className="question-card__header">
          <div>
            <p className="question-card__eyebrow">Question {index + 1}</p>
            <h2 className="question-card__text">{renderQuestionText(question.question)}</h2>
          </div>
          <span className="question-card__hint">{getSelectionHelp(question)}</span>
        </header>

        <SequenceQuestionCard
          question={question}
          selectedAnswers={selectedAnswers}
          onSequenceAnswerChange={onSequenceAnswerChange}
        />
      </article>
    );
  }

  if (question.questionType === 'hotspot') {
    return (
      <article className="question-card">
        <header className="question-card__header">
          <div>
            <p className="question-card__eyebrow">Question {index + 1}</p>
            <h2 className="question-card__text">{renderQuestionText(question.question)}</h2>
          </div>
          <span className="question-card__hint">{getSelectionHelp(question)}</span>
        </header>

        <HotspotQuestionCard
          question={question}
          selectedAnswers={selectedAnswers}
          onHotspotAnswerChange={onHotspotAnswerChange}
        />
      </article>
    );
  }

  const isMultiAnswer = question.answers.length > 1;
  const inputType = isMultiAnswer ? 'checkbox' : 'radio';

  return (
    <article className="question-card">
      <header className="question-card__header">
        <div>
          <p className="question-card__eyebrow">Question {index + 1}</p>
          <h2 className="question-card__text">{renderQuestionText(question.question)}</h2>
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

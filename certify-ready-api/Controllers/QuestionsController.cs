using CertifyReadyApi.Models;
using CertifyReadyApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace CertifyReadyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuestionsController : ControllerBase
{
    private const string DefaultExamType = "GH300";
    private const string DefaultSourceType = "Actual";
    private readonly IQuestionRepository _questionRepository;

    public QuestionsController(IQuestionRepository questionRepository)
    {
        _questionRepository = questionRepository;
    }

    [HttpGet]
    public ActionResult<PagedQuestionsResponse> GetQuestions(
        [FromQuery] string examType = DefaultExamType,
        [FromQuery] string sourceType = DefaultSourceType,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool multiAnswerOnly = false,
        [FromQuery] string? search = null)
    {
        if (page < 1 || pageSize < 1)
        {
            return BadRequest("page and pageSize must be greater than 0.");
        }

        pageSize = Math.Min(pageSize, 100);

        var normalizedExamType = string.IsNullOrWhiteSpace(examType)
            ? DefaultExamType
            : examType.Trim();
        var normalizedSourceType = string.IsNullOrWhiteSpace(sourceType)
            ? DefaultSourceType
            : sourceType.Trim();

        IEnumerable<QuestionItem> query = _questionRepository.GetAll(normalizedExamType, normalizedSourceType);

        if (!query.Any())
        {
            return NotFound($"Exam type '{normalizedExamType}' with source '{normalizedSourceType}' was not found.");
        }

        if (multiAnswerOnly)
        {
            query = query.Where(q => q.Answers.Count > 1);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(q =>
                q.Question.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                q.Options.Any(o => o.Text.Contains(search, StringComparison.OrdinalIgnoreCase)));
        }

        var ordered = query.OrderBy(q => q.Id).ToList();
        var total = ordered.Count;

        var items = ordered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return Ok(new PagedQuestionsResponse
        {
            Total = total,
            Page = page,
            PageSize = pageSize,
            Items = items
        });
    }

    [HttpGet("exams")]
    public ActionResult<IReadOnlyList<ExamSummary>> GetExams()
    {
        var exams = _questionRepository.GetExams();
        return Ok(exams);
    }

    [HttpGet("{id:int}")]
    public ActionResult<QuestionItem> GetQuestionById(
        int id,
        [FromQuery] string examType = DefaultExamType,
        [FromQuery] string sourceType = DefaultSourceType)
    {
        var normalizedExamType = string.IsNullOrWhiteSpace(examType)
            ? DefaultExamType
            : examType.Trim();
        var normalizedSourceType = string.IsNullOrWhiteSpace(sourceType)
            ? DefaultSourceType
            : sourceType.Trim();

        var question = _questionRepository.GetById(normalizedExamType, normalizedSourceType, id);
        if (question is null)
        {
            return NotFound();
        }

        return Ok(question);
    }

    [HttpPost("{id:int}/validate")]
    public ActionResult<ValidateAnswerResponse> ValidateAnswer(
        int id,
        [FromBody] ValidateAnswerRequest request,
        [FromQuery] string examType = DefaultExamType,
        [FromQuery] string sourceType = DefaultSourceType)
    {
        var normalizedExamType = string.IsNullOrWhiteSpace(examType)
            ? DefaultExamType
            : examType.Trim();
        var normalizedSourceType = string.IsNullOrWhiteSpace(sourceType)
            ? DefaultSourceType
            : sourceType.Trim();

        var question = _questionRepository.GetById(normalizedExamType, normalizedSourceType, id);
        if (question is null)
        {
            return NotFound();
        }

        var selected = (request.SelectedAnswers ?? new List<string>())
            .Select(a => a.Trim().ToUpperInvariant())
            .Where(a => !string.IsNullOrWhiteSpace(a))
            .Distinct()
            .OrderBy(a => a)
            .ToList();

        var correct = question.Answers
            .Select(a => a.Trim().ToUpperInvariant())
            .Where(a => !string.IsNullOrWhiteSpace(a))
            .Distinct()
            .OrderBy(a => a)
            .ToList();

        var isCorrect = selected.SequenceEqual(correct);

        return Ok(new ValidateAnswerResponse
        {
            QuestionId = id,
            ExamType = normalizedExamType,
            SourceType = normalizedSourceType,
            SelectedAnswers = selected,
            CorrectAnswers = correct,
            IsCorrect = isCorrect
        });
    }
}

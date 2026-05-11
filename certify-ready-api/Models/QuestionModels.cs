namespace CertifyReadyApi.Models;

public class QuestionOption
{
    public string Key { get; set; } = string.Empty;

    public string Text { get; set; } = string.Empty;
}

public class QuestionItem
{
    public int Id { get; set; }

    public string ExamType { get; set; } = string.Empty;

    public string SourceType { get; set; } = string.Empty;

    public string QuestionType { get; set; } = "choice";

    public int? SequenceLength { get; set; }

    public List<string> HotspotSlots { get; set; } = new();

    public List<List<string>> HotspotSlotOptionKeys { get; set; } = new();

    public string Question { get; set; } = string.Empty;

    public string Explanation { get; set; } = string.Empty;

    public List<QuestionOption> Options { get; set; } = new();

    public List<string> Answers { get; set; } = new();
}

public class PagedQuestionsResponse
{
    public int Total { get; set; }

    public int Page { get; set; }

    public int PageSize { get; set; }

    public List<QuestionItem> Items { get; set; } = new();
}

public class ValidateAnswerRequest
{
    public List<string> SelectedAnswers { get; set; } = new();
}

public class ValidateAnswerResponse
{
    public int QuestionId { get; set; }

    public string ExamType { get; set; } = string.Empty;

    public string SourceType { get; set; } = string.Empty;

    public List<string> SelectedAnswers { get; set; } = new();

    public List<string> CorrectAnswers { get; set; } = new();

    public bool IsCorrect { get; set; }
}

public class ExamSummary
{
    public string ExamType { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public int QuestionCount { get; set; }

    public List<DumpSourceSummary> Sources { get; set; } = new();
}

public class DumpSourceSummary
{
    public string SourceType { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public int QuestionCount { get; set; }
}

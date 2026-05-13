namespace CertifyReadyApi.Models;

public class CreateResultHistoryEntryRequest
{
    public required string ExamType { get; set; }
    public required string SourceType { get; set; }
    public int TotalQuestions { get; set; }
    public int TotalCorrect { get; set; }
    public int TotalIncorrect { get; set; }
    public List<int> IncorrectQuestionIds { get; set; } = new();
    public int DurationSeconds { get; set; }
    public DateTimeOffset CompletedAt { get; set; }
    public int Percentage { get; set; }
}

public class ResultHistoryEntry
{
    public Guid AttemptId { get; set; }
    public required string ExamType { get; set; }
    public required string SourceType { get; set; }
    public int TotalQuestions { get; set; }
    public int TotalCorrect { get; set; }
    public int TotalIncorrect { get; set; }
    public List<int> IncorrectQuestionIds { get; set; } = new();
    public int DurationSeconds { get; set; }
    public DateTimeOffset CompletedAt { get; set; }
    public int Percentage { get; set; }
}
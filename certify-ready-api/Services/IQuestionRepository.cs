using CertifyReadyApi.Models;

namespace CertifyReadyApi.Services;

public interface IQuestionRepository
{
    IReadOnlyList<ExamSummary> GetExams();

    IReadOnlyList<QuestionItem> GetAll(string examType, string sourceType);

    QuestionItem? GetById(string examType, string sourceType, int id);
}

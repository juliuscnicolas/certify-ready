using System.Text.Json;
using CertifyReadyApi.Models;

namespace CertifyReadyApi.Services;

public class JsonQuestionRepository : IQuestionRepository
{
    private readonly Dictionary<string, ExamCatalogItem> _catalog;

    public JsonQuestionRepository(IConfiguration configuration, IWebHostEnvironment environment)
    {
        var examSections = configuration.GetSection("QuestionData:Exams").GetChildren();
        _catalog = new Dictionary<string, ExamCatalogItem>(StringComparer.OrdinalIgnoreCase);

        foreach (var examSection in examSections)
        {
            var examType = examSection.Key.Trim();
            if (string.IsNullOrWhiteSpace(examType))
            {
                continue;
            }

            var displayName = examSection["DisplayName"] ?? examType;
            var sourceSections = examSection.GetSection("Sources").GetChildren();

            var sources = new Dictionary<string, DumpSourceCatalogItem>(StringComparer.OrdinalIgnoreCase);

            foreach (var sourceSection in sourceSections)
            {
                var sourceType = sourceSection.Key.Trim();
                if (string.IsNullOrWhiteSpace(sourceType))
                {
                    continue;
                }

                var sourceDisplayName = sourceSection["DisplayName"] ?? sourceType;
                var sourceJsonPath = ResolveJsonPath(sourceSection["JsonPath"], environment);
                var sourceQuestions = LoadQuestions(sourceJsonPath, examType, sourceType);

                sources[sourceType] = new DumpSourceCatalogItem(sourceDisplayName, sourceQuestions);
            }

            // Backward-compatible fallback for old config shape with a direct JsonPath.
            if (sources.Count == 0)
            {
                var jsonPath = ResolveJsonPath(examSection["JsonPath"], environment);
                var questions = LoadQuestions(jsonPath, examType, "Actual");
                sources["Actual"] = new DumpSourceCatalogItem("Actual", questions);
            }

            _catalog[examType] = new ExamCatalogItem(displayName, sources);
        }

        if (_catalog.Count == 0)
        {
            var fallbackPath = ResolveJsonPath(Path.Combine("..", "dumps", "json", "GH300-Questions.json"), environment);
            var fallbackQuestions = LoadQuestions(fallbackPath, "GH300", "Actual");
            _catalog["GH300"] = new ExamCatalogItem(
                "GitHub Copilot - Microsoft Certification",
                new Dictionary<string, DumpSourceCatalogItem>(StringComparer.OrdinalIgnoreCase)
                {
                    ["Actual"] = new DumpSourceCatalogItem("Actual", fallbackQuestions)
                });
        }
    }

    public IReadOnlyList<ExamSummary> GetExams()
    {
        return _catalog
            .Select(item => new ExamSummary
            {
                ExamType = item.Key,
                DisplayName = item.Value.DisplayName,
                QuestionCount = item.Value.Sources.Values.Sum(source => source.Questions.Count),
                Sources = item.Value.Sources
                    .Select(source => new DumpSourceSummary
                    {
                        SourceType = source.Key,
                        DisplayName = source.Value.DisplayName,
                        QuestionCount = source.Value.Questions.Count
                    })
                    .OrderBy(source => source.SourceType)
                    .ToList()
            })
            .OrderBy(item => item.ExamType)
            .ToList();
    }

    public IReadOnlyList<QuestionItem> GetAll(string examType, string sourceType)
    {
        return _catalog.TryGetValue(examType, out var item)
            && item.Sources.TryGetValue(sourceType, out var source)
            ? source.Questions
            : Array.Empty<QuestionItem>();
    }

    public QuestionItem? GetById(string examType, string sourceType, int id)
    {
        return _catalog.TryGetValue(examType, out var item)
            && item.Sources.TryGetValue(sourceType, out var source)
            ? source.Questions.FirstOrDefault(question => question.Id == id)
            : null;
    }

    private static string ResolveJsonPath(string? configuredPath, IWebHostEnvironment environment)
    {
        var relativePath = string.IsNullOrWhiteSpace(configuredPath)
            ? Path.Combine("..", "dumps", "json", "GH300-Questions.json")
            : configuredPath;

        return Path.IsPathRooted(relativePath)
            ? relativePath
            : Path.GetFullPath(Path.Combine(environment.ContentRootPath, relativePath));
    }

    private static List<QuestionItem> LoadQuestions(string jsonPath, string examType, string sourceType)
    {
        if (!File.Exists(jsonPath))
        {
            throw new FileNotFoundException($"Question data file not found at '{jsonPath}'.");
        }

        var json = File.ReadAllText(jsonPath);
        var questions = JsonSerializer.Deserialize<List<QuestionItem>>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        }) ?? new List<QuestionItem>();

        foreach (var question in questions)
        {
            question.ExamType = examType;
            question.SourceType = sourceType;
        }

        return questions;
    }

    private sealed record ExamCatalogItem(string DisplayName, Dictionary<string, DumpSourceCatalogItem> Sources);

    private sealed record DumpSourceCatalogItem(string DisplayName, List<QuestionItem> Questions);
}

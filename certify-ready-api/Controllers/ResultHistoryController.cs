using System.Text.Json;
using CertifyReadyApi.Models;
using Microsoft.AspNetCore.Mvc;

namespace CertifyReadyApi.Controllers;

[ApiController]
[Route("api/results/history")]
public class ResultHistoryController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        WriteIndented = true
    };

    private static readonly SemaphoreSlim FileLock = new(1, 1);
    private readonly IWebHostEnvironment _environment;

    public ResultHistoryController(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ResultHistoryEntry>>> GetHistory()
    {
        await FileLock.WaitAsync();
        try
        {
            var items = await ReadHistoryInternalAsync();
            var ordered = items
                .OrderByDescending(item => item.CompletedAt)
                .ToList();

            return Ok(ordered);
        }
        finally
        {
            FileLock.Release();
        }
    }

    [HttpPost]
    public async Task<ActionResult<IReadOnlyList<ResultHistoryEntry>>> AppendHistory(
        [FromBody] CreateResultHistoryEntryRequest request)
    {
        if (request.TotalQuestions < 0 ||
            request.TotalCorrect < 0 ||
            request.TotalIncorrect < 0 ||
            request.DurationSeconds < 0)
        {
            return BadRequest("Numeric values must be zero or greater.");
        }

        if (string.IsNullOrWhiteSpace(request.ExamType) || string.IsNullOrWhiteSpace(request.SourceType))
        {
            return BadRequest("examType and sourceType are required.");
        }

        var completedAt = request.CompletedAt == default
            ? DateTimeOffset.UtcNow
            : request.CompletedAt;

        var nextEntry = new ResultHistoryEntry
        {
            AttemptId = Guid.NewGuid(),
            ExamType = request.ExamType.Trim(),
            SourceType = request.SourceType.Trim(),
            TotalQuestions = request.TotalQuestions,
            TotalCorrect = request.TotalCorrect,
            TotalIncorrect = request.TotalIncorrect,
            IncorrectQuestionIds = (request.IncorrectQuestionIds ?? new List<int>())
                .Where(id => id > 0)
                .Distinct()
                .OrderBy(id => id)
                .ToList(),
            DurationSeconds = request.DurationSeconds,
            CompletedAt = completedAt,
            Percentage = request.Percentage
        };

        await FileLock.WaitAsync();
        try
        {
            var items = await ReadHistoryInternalAsync();
            items.Add(nextEntry);

            await WriteHistoryInternalAsync(items);

            var ordered = items
                .OrderByDescending(item => item.CompletedAt)
                .ToList();

            return Ok(ordered);
        }
        finally
        {
            FileLock.Release();
        }
    }

    private async Task<List<ResultHistoryEntry>> ReadHistoryInternalAsync()
    {
        var path = GetHistoryFilePath();
        EnsureHistoryFile(path);

        var raw = await System.IO.File.ReadAllTextAsync(path);
        if (string.IsNullOrWhiteSpace(raw))
        {
            return new List<ResultHistoryEntry>();
        }

        var parsed = JsonSerializer.Deserialize<List<ResultHistoryEntry>>(raw, JsonOptions);
        return parsed ?? new List<ResultHistoryEntry>();
    }

    private async Task WriteHistoryInternalAsync(List<ResultHistoryEntry> items)
    {
        var path = GetHistoryFilePath();
        EnsureHistoryFile(path);

        var serialized = JsonSerializer.Serialize(items, JsonOptions);
        await System.IO.File.WriteAllTextAsync(path, serialized);
    }

    private string GetHistoryFilePath()
    {
        var apiRoot = _environment.ContentRootPath;
        var repoRoot = Directory.GetParent(apiRoot)?.FullName ?? apiRoot;
        var resultDirectory = Path.Combine(repoRoot, "result");

        return Path.Combine(resultDirectory, "result.json");
    }

    private static void EnsureHistoryFile(string filePath)
    {
        var directory = Path.GetDirectoryName(filePath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        if (!System.IO.File.Exists(filePath))
        {
            System.IO.File.WriteAllText(filePath, "[]");
        }
    }
}
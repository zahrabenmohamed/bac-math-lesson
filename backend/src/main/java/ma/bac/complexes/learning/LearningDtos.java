package ma.bac.complexes.learning;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import ma.bac.complexes.grading.Point;
import java.util.List;

/** Public ids are the stable content codes (chapter "complexes", lesson "L01", exercise "L01-E1"). */
public final class LearningDtos {

    private LearningDtos() {}

    public record LessonSummary(String id, String title, int part, String kind, String status,
                                int stepsDone, int stepsTotal) {}

    public record ChapterDto(String id, String title, List<LessonSummary> lessons) {}

    public record LessonDto(String id, String title, String chapterId, List<JsonNode> steps) {}

    /** One chapter of the year's programme; {@code available} is false until it has lessons. */
    public record ChapterSummary(String id, String title, String summary, int position, boolean available,
                                 int lessonsTotal, int lessonsDone, String nextLessonId) {}

    public record AnswerRequest(@Size(max = 20) List<@Size(max = 40) String> choices,
                                @Size(max = 200) String text, @Valid Point point, Integer timeMs) {}

    public record AnswerResponse(boolean correct, String explanation, String solution, int xpAwarded,
                                 boolean mastered, List<Boolean> stageResults) {}

    public record HintResponse(String hint) {}

    public record LessonResult(String id, String title, int correct, int total) {}

    public record Week(String label, int count) {}

    public record WeakSkill(String skill, double rate) {}

    public record ProgressDto(int xp, int level, int xpInLevel, int xpForNext, int streakDays,
                              List<LessonResult> lessons, List<Week> weeks, List<WeakSkill> weakSkills) {}

    public record MistakeDto(String exerciseId, String lessonTitle, String prompt, String skill, int streak) {}
}

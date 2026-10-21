package ma.bac.complexes.learning;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import ma.bac.complexes.api.ApiException;
import ma.bac.complexes.gamification.Rules;
import ma.bac.complexes.gamification.Rules.Mastery;
import ma.bac.complexes.grading.AnswerGrader;
import ma.bac.complexes.grading.AnswerGrader.Grade;
import ma.bac.complexes.grading.UnreadableAnswerException;
import ma.bac.complexes.learning.LearningDtos.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LearningService {

    private record LessonRow(long id, String code, String title, int part, String kind,
                             int exTotal, int exDone, int completed) {}

    private record ExerciseRow(long id, String code, String type, String skill, String payload, String answer,
                               String solution, String hint, String lessonCode, String lessonKind) {}

    private record MasteryRow(int streakCorrect, boolean everWrong, boolean mastered) {}

    private record StatsRow(int xp, int level, int streakDays, LocalDate lastActiveDate) {}

    private record StepRow(String type, String content, String code, String exType, String skill, String payload) {}

    private final JdbcClient jdbc;
    private final ObjectMapper mapper;
    private final AnswerGrader grader;
    private final Clock clock;

    public LearningService(JdbcClient jdbc, ObjectMapper mapper, AnswerGrader grader, Clock clock) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.grader = grader;
        this.clock = clock;
    }

    // ---------------------------------------------------------------- chapter & lessons

    private record ChapterRow(String code, String title, String summary, int position, int lessons) {}

    /** The whole year's programme with the student's progress in each chapter that has lessons. */
    public List<ChapterSummary> program(long userId) {
        List<ChapterRow> rows = jdbc.sql("""
                        SELECT c.code, c.title, c.summary, c.position,
                               (SELECT COUNT(*) FROM lessons l WHERE l.chapter_id = c.id) AS lessons
                        FROM chapters c ORDER BY c.position, c.id""").query(ChapterRow.class).list();
        List<ChapterSummary> out = new ArrayList<>();
        for (ChapterRow r : rows) {
            if (r.lessons() == 0) {
                out.add(new ChapterSummary(r.code(), r.title(), r.summary(), r.position(), false, 0, 0, null));
                continue;
            }
            List<LessonSummary> lessons = summaries(userId, r.code());
            int done = (int) lessons.stream().filter(l -> "completed".equals(l.status())).count();
            String next = lessons.stream().filter(l -> "unlocked".equals(l.status())).map(LessonSummary::id)
                    .findFirst().orElse(null);
            out.add(new ChapterSummary(r.code(), r.title(), r.summary(), r.position(), true, lessons.size(), done, next));
        }
        return out;
    }

    public ChapterDto chapter(long userId, String chapterCode) {
        String title = jdbc.sql("SELECT title FROM chapters WHERE code = :c").param("c", chapterCode)
                .query(String.class).optional()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Chapitre introuvable"));
        return new ChapterDto(chapterCode, title, summaries(userId, chapterCode));
    }

    private List<LessonSummary> summaries(long userId, String chapterCode) {
        List<LessonRow> rows = jdbc.sql("""
                        SELECT l.id, l.code, l.title, l.part, l.kind,
                          (SELECT COUNT(*) FROM steps s WHERE s.lesson_id = l.id AND s.type = 'EXERCISE') AS ex_total,
                          (SELECT COUNT(DISTINCT a.exercise_id) FROM attempts a
                             JOIN steps s ON s.exercise_id = a.exercise_id
                            WHERE s.lesson_id = l.id AND a.user_id = :u) AS ex_done,
                          (SELECT COUNT(*) FROM lesson_progress lp
                            WHERE lp.lesson_id = l.id AND lp.user_id = :u AND lp.completed_at IS NOT NULL) AS completed
                        FROM lessons l JOIN chapters c ON c.id = l.chapter_id
                        WHERE c.code = :code ORDER BY l.part, l.position""")
                .param("u", userId).param("code", chapterCode).query(LessonRow.class).list();

        List<LessonSummary> out = new ArrayList<>();
        boolean previousDone = true;
        for (LessonRow r : rows) {
            boolean done = r.completed() > 0;
            String status = done ? "completed" : previousDone ? "unlocked" : "locked";
            int total = Math.max(r.exTotal(), 1);
            out.add(new LessonSummary(r.code(), r.title(), r.part(), r.kind(), status,
                    done ? total : Math.min(r.exDone(), total), total));
            previousDone = done;
        }
        return out;
    }

    private String chapterCodeOfLesson(String lessonCode) {
        return jdbc.sql("SELECT c.code FROM lessons l JOIN chapters c ON c.id = l.chapter_id WHERE l.code = :c")
                .param("c", lessonCode).query(String.class).optional()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Leçon introuvable"));
    }

    private void requireUnlocked(long userId, String lessonCode) {
        String status = summaries(userId, chapterCodeOfLesson(lessonCode)).stream()
                .filter(s -> s.id().equals(lessonCode)).findFirst().orElseThrow().status();
        if ("locked".equals(status)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Terminez d’abord la leçon précédente");
        }
    }

    /** Steps are returned without solutions or correct answers (those live in exercises.answer). */
    public LessonDto lesson(long userId, String lessonCode) {
        requireUnlocked(userId, lessonCode);
        String title = jdbc.sql("SELECT title FROM lessons WHERE code = :c").param("c", lessonCode)
                .query(String.class).single();
        List<StepRow> rows = jdbc.sql("""
                        SELECT s.type, s.content, e.code, e.type AS ex_type, e.skill, e.payload
                        FROM steps s JOIN lessons l ON l.id = s.lesson_id LEFT JOIN exercises e ON e.id = s.exercise_id
                        WHERE l.code = :c ORDER BY s.position""")
                .param("c", lessonCode).query(StepRow.class).list();
        List<JsonNode> steps = rows.stream().map(this::toStepNode).toList();
        return new LessonDto(lessonCode, title, chapterCodeOfLesson(lessonCode), steps);
    }

    private JsonNode toStepNode(StepRow r) {
        try {
            if ("EXERCISE".equals(r.type())) {
                return exerciseStep(r.code(), r.exType(), r.skill(), mapper.readTree(r.payload()));
            }
            ObjectNode node = (ObjectNode) mapper.readTree(r.content());
            node.put("type", "EXPLANATION");
            return node;
        } catch (java.io.IOException e) {
            throw new IllegalStateException("Corrupted content for step", e);
        }
    }

    private ObjectNode exerciseStep(String code, String type, String skill, JsonNode payload) {
        ObjectNode exercise = mapper.createObjectNode();
        exercise.put("id", code);
        exercise.put("type", type);
        exercise.put("skill", skill);
        exercise.setAll((ObjectNode) payload);
        ObjectNode step = mapper.createObjectNode();
        step.put("type", "EXERCISE");
        step.set("exercise", exercise);
        return step;
    }

    @Transactional
    public void completeLesson(long userId, String lessonCode) {
        requireUnlocked(userId, lessonCode);
        LessonSummary s = summaries(userId, chapterCodeOfLesson(lessonCode)).stream()
                .filter(x -> x.id().equals(lessonCode)).findFirst().orElseThrow();
        int exerciseCount = jdbc.sql("""
                        SELECT COUNT(*) FROM steps s JOIN lessons l ON l.id = s.lesson_id
                        WHERE l.code = :c AND s.type = 'EXERCISE'""").param("c", lessonCode).query(Integer.class).single();
        if (s.stepsDone() < exerciseCount) {
            throw new ApiException(HttpStatus.CONFLICT, "Tous les exercices doivent être traités");
        }
        long lessonId = jdbc.sql("SELECT id FROM lessons WHERE code = :c").param("c", lessonCode).query(Long.class).single();
        int updated = jdbc.sql("""
                        UPDATE lesson_progress SET steps_done = :n, completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
                        WHERE user_id = :u AND lesson_id = :l""")
                .param("n", exerciseCount).param("u", userId).param("l", lessonId).update();
        if (updated == 0) {
            jdbc.sql("INSERT INTO lesson_progress (user_id, lesson_id, steps_done, completed_at) VALUES (:u, :l, :n, CURRENT_TIMESTAMP)")
                    .param("u", userId).param("l", lessonId).param("n", exerciseCount).update();
        }
    }

    // ---------------------------------------------------------------- exercises

    private ExerciseRow exercise(String code) {
        return jdbc.sql("""
                        SELECT e.id, e.code, e.type, e.skill, e.payload, e.answer, e.solution, e.hint,
                               l.code AS lesson_code, l.kind AS lesson_kind
                        FROM exercises e JOIN steps s ON s.exercise_id = e.id JOIN lessons l ON l.id = s.lesson_id
                        WHERE e.code = :c""").param("c", code).query(ExerciseRow.class).optional()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Exercice introuvable"));
    }

    @Transactional
    public HintResponse hint(long userId, String exerciseCode) {
        ExerciseRow ex = exercise(exerciseCode);
        requireUnlocked(userId, ex.lessonCode());
        jdbc.sql("INSERT INTO hint_requests (user_id, exercise_id) VALUES (:u, :e)")
                .param("u", userId).param("e", ex.id()).update();
        return new HintResponse(ex.hint());
    }

    @Transactional
    public AnswerResponse answer(long userId, String exerciseCode, AnswerRequest req) {
        ExerciseRow ex = exercise(exerciseCode);
        requireUnlocked(userId, ex.lessonCode());

        Grade grade;
        try {
            grade = grader.grade(ex.type(), json(ex.payload()), json(ex.answer()), req.choices(), req.text(), req.point());
        } catch (UnreadableAnswerException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, e.getMessage());
        }

        boolean hintUsed = jdbc.sql("""
                        SELECT COUNT(*) FROM hint_requests h
                        WHERE h.user_id = :u AND h.exercise_id = :e AND h.at > COALESCE(
                          (SELECT MAX(a.at) FROM attempts a WHERE a.user_id = :u AND a.exercise_id = :e),
                          TIMESTAMP WITH TIME ZONE '1970-01-01 00:00:00+00')""")
                .param("u", userId).param("e", ex.id()).query(Integer.class).single() > 0;

        int xp = Rules.xpFor(grade.correct(), hintUsed, "BOSS".equals(ex.lessonKind()));
        String submitted = req.text() != null ? req.text()
                : req.point() != null ? "(" + req.point().re() + ", " + req.point().im() + ")"
                : String.valueOf(req.choices());
        jdbc.sql("""
                        INSERT INTO attempts (user_id, exercise_id, answer, correct, hint_used, time_ms)
                        VALUES (:u, :e, :a, :c, :h, :t)""")
                .param("u", userId).param("e", ex.id()).param("a", submitted)
                .param("c", grade.correct()).param("h", hintUsed).param("t", req.timeMs()).update();

        Mastery mastery = updateMastery(userId, ex.id(), grade.correct());
        updateStats(userId, xp);
        return new AnswerResponse(grade.correct(), grade.explanation(), ex.solution(), xp, mastery.mastered(),
                grade.stageResults());
    }

    private Mastery updateMastery(long userId, long exerciseId, boolean correct) {
        MasteryRow prev = jdbc.sql("SELECT streak_correct, ever_wrong, mastered FROM exercise_mastery WHERE user_id = :u AND exercise_id = :e")
                .param("u", userId).param("e", exerciseId).query(MasteryRow.class).optional().orElse(null);
        Mastery next = Rules.nextMastery(
                prev == null ? Mastery.NONE : new Mastery(prev.streakCorrect(), prev.everWrong(), prev.mastered()), correct);
        if (prev == null) {
            jdbc.sql("INSERT INTO exercise_mastery (user_id, exercise_id, streak_correct, ever_wrong, mastered) VALUES (:u, :e, :s, :w, :m)")
                    .param("u", userId).param("e", exerciseId).param("s", next.streak())
                    .param("w", next.everWrong()).param("m", next.mastered()).update();
        } else {
            jdbc.sql("UPDATE exercise_mastery SET streak_correct = :s, ever_wrong = :w, mastered = :m WHERE user_id = :u AND exercise_id = :e")
                    .param("u", userId).param("e", exerciseId).param("s", next.streak())
                    .param("w", next.everWrong()).param("m", next.mastered()).update();
        }
        return next;
    }

    private void updateStats(long userId, int xpAwarded) {
        StatsRow s = jdbc.sql("SELECT xp, level, streak_days, last_active_date FROM user_stats WHERE user_id = :u")
                .param("u", userId).query(StatsRow.class).single();
        LocalDate today = LocalDate.now(clock);
        int xp = s.xp() + xpAwarded;
        jdbc.sql("UPDATE user_stats SET xp = :xp, level = :lv, streak_days = :st, last_active_date = :d WHERE user_id = :u")
                .param("xp", xp).param("lv", Rules.levelFor(xp))
                .param("st", Rules.nextStreak(s.streakDays(), s.lastActiveDate(), today))
                .param("d", today).param("u", userId).update();
    }

    private JsonNode json(String s) {
        try {
            return mapper.readTree(s);
        } catch (java.io.IOException e) {
            throw new IllegalStateException(e);
        }
    }

    // ---------------------------------------------------------------- me

    public ProgressDto progress(long userId) {
        StatsRow s = jdbc.sql("SELECT xp, level, streak_days, last_active_date FROM user_stats WHERE user_id = :u")
                .param("u", userId).query(StatsRow.class).single();
        LocalDate today = LocalDate.now(clock);
        // A streak that was not continued yesterday or today is already broken.
        int streak = s.lastActiveDate() != null && s.lastActiveDate().plusDays(1).isBefore(today) ? 0 : s.streakDays();
        int base = Rules.xpAtLevelStart(s.level());

        List<LessonResult> lessons = jdbc.sql("""
                        SELECT l.code, l.title, COUNT(a.id) AS total,
                               COALESCE(SUM(CASE WHEN a.correct THEN 1 ELSE 0 END), 0) AS correct
                        FROM lessons l
                        LEFT JOIN steps st ON st.lesson_id = l.id AND st.exercise_id IS NOT NULL
                        LEFT JOIN attempts a ON a.exercise_id = st.exercise_id AND a.user_id = :u
                        WHERE l.kind = 'LESSON' GROUP BY l.id, l.code, l.title, l.part, l.position
                        ORDER BY l.part, l.position""")
                .param("u", userId)
                .query((rs, n) -> new LessonResult(rs.getString(1), rs.getString(2), rs.getInt(4), rs.getInt(3))).list();

        List<OffsetDateTime> times = jdbc.sql("SELECT at FROM attempts WHERE user_id = :u AND at > :since")
                .param("u", userId).param("since", OffsetDateTime.now(clock).minusDays(56))
                .query(OffsetDateTime.class).list();
        int[] buckets = new int[8];
        for (OffsetDateTime t : times) {
            long daysAgo = ChronoUnit.DAYS.between(t.atZoneSameInstant(clock.getZone()).toLocalDate(), today);
            int week = (int) Math.min(7, Math.max(0, daysAgo / 7));
            buckets[7 - week]++;
        }
        List<Week> weeks = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            weeks.add(new Week(i == 7 ? "Cette sem." : "S-" + (7 - i), buckets[i]));
        }

        Map<String, int[]> bySkill = new LinkedHashMap<>();
        jdbc.sql("""
                        SELECT e.skill, a.correct FROM attempts a JOIN exercises e ON e.id = a.exercise_id
                        WHERE a.user_id = :u""").param("u", userId)
                .query((rs, n) -> {
                    int[] v = bySkill.computeIfAbsent(rs.getString(1), k -> new int[2]);
                    v[1]++;
                    if (rs.getBoolean(2)) {
                        v[0]++;
                    }
                    return null;
                }).list();
        List<WeakSkill> weak = bySkill.entrySet().stream()
                .map(e -> new WeakSkill(e.getKey(), (double) e.getValue()[0] / e.getValue()[1]))
                .sorted(Comparator.comparingDouble(WeakSkill::rate)).limit(4).toList();

        return new ProgressDto(s.xp(), s.level(), s.xp() - base, Rules.xpAtLevelStart(s.level() + 1) - base,
                streak, lessons, weeks, weak);
    }

    private record MistakeRow(String code, String payload, String skill, String lessonTitle, int streakCorrect) {}

    public List<MistakeDto> mistakes(long userId) {
        return jdbc.sql("""
                        SELECT e.code, e.payload, e.skill, l.title AS lesson_title, m.streak_correct
                        FROM exercise_mastery m JOIN exercises e ON e.id = m.exercise_id
                        JOIN steps s ON s.exercise_id = e.id JOIN lessons l ON l.id = s.lesson_id
                        WHERE m.user_id = :u AND m.ever_wrong AND NOT m.mastered ORDER BY e.id""")
                .param("u", userId).query(MistakeRow.class).list().stream()
                .map(r -> new MistakeDto(r.code(), r.lessonTitle(), json(r.payload()).path("prompt").asText(),
                        r.skill(), r.streakCorrect()))
                .toList();
    }

    /** A lesson-shaped session made of the exercises the student has not mastered yet. */
    public LessonDto reviewSession(long userId) {
        List<StepRow> rows = jdbc.sql("""
                        SELECT 'EXERCISE' AS type, CAST(NULL AS VARCHAR(10)) AS content, e.code, e.type AS ex_type, e.skill, e.payload
                        FROM exercise_mastery m JOIN exercises e ON e.id = m.exercise_id
                        WHERE m.user_id = :u AND m.ever_wrong AND NOT m.mastered ORDER BY e.id LIMIT 10""")
                .param("u", userId).query(StepRow.class).list();
        return new LessonDto("review", "Révision de mes erreurs", null, rows.stream().map(this::toStepNode).toList());
    }
}

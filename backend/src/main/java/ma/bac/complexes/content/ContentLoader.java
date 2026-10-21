package ma.bac.complexes.content;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Comparator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Loads chapter content from classpath JSON at startup. Idempotent: chapters, lessons and
 * exercises are upserted by code (so attempts keep pointing at the same exercise rows);
 * steps are rebuilt for each lesson.
 */
@Component
public class ContentLoader implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ContentLoader.class);
    private static final String BASE = "classpath:content/complexes/";

    private final JdbcClient jdbc;
    private final ObjectMapper mapper;
    private final TransactionTemplate tx;
    private final PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();

    public ContentLoader(JdbcClient jdbc, ObjectMapper mapper, TransactionTemplate tx) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.tx = tx;
    }

    @Override
    public void run(ApplicationArguments args) {
        tx.executeWithoutResult(status -> {
            try {
                load();
            } catch (IOException e) {
                throw new IllegalStateException("Content loading failed", e);
            }
        });
    }

    /** Program entries are metadata only; chapters with lesson files are detailed below. */
    private void loadProgram() throws IOException {
        int position = 1;
        for (JsonNode c : read(resolver.getResource("classpath:content/program.json")).get("chapters")) {
            String code = c.get("code").asText();
            int updated = jdbc.sql("UPDATE chapters SET title = :t, summary = :s, position = :p WHERE code = :c")
                    .param("t", c.get("title").asText()).param("s", c.path("summary").asText(""))
                    .param("p", position).param("c", code).update();
            if (updated == 0) {
                jdbc.sql("INSERT INTO chapters (code, title, summary, position, status) VALUES (:c, :t, :s, :p, 'planned')")
                        .param("c", code).param("t", c.get("title").asText()).param("s", c.path("summary").asText(""))
                        .param("p", position).update();
            }
            position++;
        }
    }

    void load() throws IOException {
        loadProgram();
        JsonNode chapter = read(resolver.getResource(BASE + "chapter.json"));
        long chapterId = upsertChapter(chapter);

        Resource[] files = resolver.getResources(BASE + "lesson-*.json");
        Arrays.sort(files, Comparator.comparing(Resource::getFilename));
        for (Resource file : files) {
            upsertLesson(chapterId, read(file));
        }
        log.info("Content loaded: chapter '{}' with {} lessons", chapter.get("code").asText(), files.length);
    }

    private JsonNode read(Resource resource) throws IOException {
        try (InputStream in = resource.getInputStream()) {
            return mapper.readTree(in);
        }
    }

    private long upsertChapter(JsonNode c) {
        String code = c.get("code").asText();
        int updated = jdbc.sql("UPDATE chapters SET title = :title, status = :status WHERE code = :code")
                .param("title", c.get("title").asText())
                .param("status", c.path("status").asText("draft"))
                .param("code", code)
                .update();
        if (updated == 0) {
            jdbc.sql("INSERT INTO chapters (code, title, status) VALUES (:code, :title, :status)")
                    .param("code", code)
                    .param("title", c.get("title").asText())
                    .param("status", c.path("status").asText("draft"))
                    .update();
        }
        return jdbc.sql("SELECT id FROM chapters WHERE code = :code").param("code", code).query(Long.class).single();
    }

    private void upsertLesson(long chapterId, JsonNode l) throws IOException {
        String code = l.get("code").asText();
        int updated = jdbc.sql("""
                        UPDATE lessons SET chapter_id = :chapter, part = :part, position = :position,
                               title = :title, kind = :kind, status = :status WHERE code = :code""")
                .param("chapter", chapterId)
                .param("part", l.get("part").asInt())
                .param("position", l.get("position").asInt())
                .param("title", l.get("title").asText())
                .param("kind", l.path("kind").asText("LESSON"))
                .param("status", l.path("status").asText("draft"))
                .param("code", code)
                .update();
        if (updated == 0) {
            jdbc.sql("""
                            INSERT INTO lessons (chapter_id, code, part, position, title, kind, status)
                            VALUES (:chapter, :code, :part, :position, :title, :kind, :status)""")
                    .param("chapter", chapterId)
                    .param("code", code)
                    .param("part", l.get("part").asInt())
                    .param("position", l.get("position").asInt())
                    .param("title", l.get("title").asText())
                    .param("kind", l.path("kind").asText("LESSON"))
                    .param("status", l.path("status").asText("draft"))
                    .update();
        }
        long lessonId = jdbc.sql("SELECT id FROM lessons WHERE code = :code").param("code", code)
                .query(Long.class).single();

        jdbc.sql("DELETE FROM steps WHERE lesson_id = :id").param("id", lessonId).update();
        int position = 1;
        for (JsonNode step : l.get("steps")) {
            String type = step.get("type").asText();
            if ("EXERCISE".equals(type)) {
                long exerciseId = upsertExercise(step.get("exercise"));
                insertStep(lessonId, position++, type, null, exerciseId);
            } else {
                ((com.fasterxml.jackson.databind.node.ObjectNode) step).remove("type");
                insertStep(lessonId, position++, type, mapper.writeValueAsString(step), null);
            }
        }
    }

    private void insertStep(long lessonId, int position, String type, String content, Long exerciseId) {
        jdbc.sql("""
                        INSERT INTO steps (lesson_id, position, type, content, exercise_id)
                        VALUES (:lesson, :position, :type, :content, :exercise)""")
                .param("lesson", lessonId)
                .param("position", position)
                .param("type", type)
                .param("content", content)
                .param("exercise", exerciseId)
                .update();
    }

    private long upsertExercise(JsonNode e) throws IOException {
        String code = e.get("code").asText();
        String payload = mapper.writeValueAsString(e.get("payload"));
        String answer = mapper.writeValueAsString(e.get("answer"));
        int updated = jdbc.sql("""
                        UPDATE exercises SET type = :type, skill = :skill, payload = :payload, answer = :answer,
                               solution = :solution, hint = :hint WHERE code = :code""")
                .param("type", e.get("type").asText())
                .param("skill", e.get("skill").asText())
                .param("payload", payload)
                .param("answer", answer)
                .param("solution", e.get("solution").asText())
                .param("hint", e.get("hint").asText())
                .param("code", code)
                .update();
        if (updated == 0) {
            jdbc.sql("""
                            INSERT INTO exercises (code, type, skill, payload, answer, solution, hint)
                            VALUES (:code, :type, :skill, :payload, :answer, :solution, :hint)""")
                    .param("code", code)
                    .param("type", e.get("type").asText())
                    .param("skill", e.get("skill").asText())
                    .param("payload", payload)
                    .param("answer", answer)
                    .param("solution", e.get("solution").asText())
                    .param("hint", e.get("hint").asText())
                    .update();
        }
        return jdbc.sql("SELECT id FROM exercises WHERE code = :code").param("code", code)
                .query(Long.class).single();
    }
}

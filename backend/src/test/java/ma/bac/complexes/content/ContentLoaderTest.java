package ma.bac.complexes.content;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class ContentLoaderTest {

    @Autowired JdbcClient jdbc;
    @Autowired ContentLoader loader;
    @Autowired ObjectMapper mapper;

    private long count(String table) {
        return jdbc.sql("SELECT COUNT(*) FROM " + table).query(Long.class).single();
    }

    @Test
    void loadsChapterLessonsStepsAndExercises() {
        assertThat(count("chapters")).isEqualTo(1);
        assertThat(count("lessons")).isEqualTo(9);
        assertThat(count("exercises")).isEqualTo(41);
        long explanations = jdbc.sql("SELECT COUNT(*) FROM steps WHERE type = 'EXPLANATION'").query(Long.class).single();
        long exerciseSteps = jdbc.sql("SELECT COUNT(*) FROM steps WHERE type = 'EXERCISE'").query(Long.class).single();
        assertThat(explanations).isEqualTo(19);
        assertThat(exerciseSteps).isEqualTo(41);
    }

    @Test
    void reloadingIsIdempotentAndKeepsExerciseIds() throws Exception {
        List<Long> before = jdbc.sql("SELECT id FROM exercises ORDER BY id").query(Long.class).list();
        loader.load();
        loader.load();
        assertThat(count("lessons")).isEqualTo(9);
        assertThat(count("exercises")).isEqualTo(41);
        assertThat(count("steps")).isEqualTo(60);
        assertThat(jdbc.sql("SELECT id FROM exercises ORDER BY id").query(Long.class).list()).isEqualTo(before);
    }

    @Test
    void theModelAnswerOfEveryExerciseIsGradedCorrect() throws Exception {
        ma.bac.complexes.grading.AnswerGrader grader = new ma.bac.complexes.grading.AnswerGrader();
        List<String[]> rows = jdbc.sql("SELECT code, type, payload, answer FROM exercises")
                .query((rs, n) -> new String[] {rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4)})
                .list();
        for (String[] r : rows) {
            JsonNode payload = mapper.readTree(r[2]);
            JsonNode answer = mapper.readTree(r[3]);
            List<String> choices = null;
            String text = null;
            switch (r[1]) {
                case "QCM" -> choices = mapper.convertValue(answer.get("correct"), new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
                case "METHOD" -> choices = mapper.convertValue(answer.get("order"), new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
                default -> {
                    if (answer.has("value")) {
                        text = Double.toString(answer.get("value").asDouble());
                    } else {
                        double im = answer.get("im").asDouble();
                        text = answer.get("re").asDouble() + (im < 0 ? "-" : "+") + Math.abs(im) + "i";
                    }
                }
            }
            assertThat(grader.grade(r[1], payload, answer, choices, text).correct()).as(r[0] + " model answer").isTrue();
        }
    }

    @Test
    void everyExerciseHasAConsistentPayloadAndAnswer() throws Exception {
        List<String[]> rows = jdbc.sql("SELECT code, type, payload, answer FROM exercises")
                .query((rs, n) -> new String[] {rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4)})
                .list();
        for (String[] r : rows) {
            JsonNode payload = mapper.readTree(r[2]);
            JsonNode answer = mapper.readTree(r[3]);
            String code = r[0];
            assertThat(payload.hasNonNull("prompt")).as(code + " prompt").isTrue();
            switch (r[1]) {
                case "QCM" -> {
                    Set<String> ids = new HashSet<>();
                    payload.get("options").forEach(o -> ids.add(o.get("id").asText()));
                    assertThat(answer.get("correct")).as(code).isNotEmpty();
                    answer.get("correct").forEach(c -> assertThat(ids).as(code).contains(c.asText()));
                    assertThat(payload.get("multiple").asBoolean()).as(code)
                            .isEqualTo(answer.get("correct").size() > 1);
                }
                case "NUMERIC" -> assertThat(answer.has("value") || (answer.has("re") && answer.has("im")))
                        .as(code).isTrue();
                case "METHOD" -> {
                    JsonNode stages = payload.get("stages");
                    assertThat(answer.get("order")).as(code).hasSize(stages.size());
                    for (int i = 0; i < stages.size(); i++) {
                        Set<String> ids = new HashSet<>();
                        stages.get(i).get("options").forEach(o -> ids.add(o.get("id").asText()));
                        assertThat(ids).as(code + " stage " + i).contains(answer.get("order").get(i).asText());
                    }
                }
                default -> throw new AssertionError("Unknown type for " + code);
            }
        }
    }
}

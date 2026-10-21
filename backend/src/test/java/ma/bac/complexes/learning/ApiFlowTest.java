package ma.bac.complexes.learning;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiFlowTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired JdbcClient jdbc;

    private String token;

    @BeforeEach
    void registerStudent() throws Exception {
        token = register("eleve-" + UUID.randomUUID() + "@example.com", "motdepasse1");
    }

    private String register(String email, String password) throws Exception {
        String body = mapper.writeValueAsString(java.util.Map.of("email", email, "password", password, "displayName", "Élève"));
        String json = mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return mapper.readTree(json).get("token").asText();
    }

    private ResultActions getJson(String url) throws Exception {
        return mvc.perform(get(url).header("Authorization", "Bearer " + token));
    }

    private ResultActions answer(String exercise, String json) throws Exception {
        return mvc.perform(post("/exercises/" + exercise + "/answer").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private JsonNode body(ResultActions r) throws Exception {
        return mapper.readTree(r.andReturn().getResponse().getContentAsString());
    }

    @Test
    void authValidationAndLogin() throws Exception {
        mvc.perform(get("/chapters/complexes")).andExpect(status().isUnauthorized());
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"pas-un-mail\",\"password\":\"court\",\"displayName\":\"x\"}"))
                .andExpect(status().isBadRequest());

        String email = "dup-" + UUID.randomUUID() + "@example.com";
        register(email, "motdepasse1");
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email.toUpperCase() + "\",\"password\":\"motdepasse1\",\"displayName\":\"x\"}"))
                .andExpect(status().isConflict());

        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"mauvais-mot-de-passe\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"motdepasse1\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.token").isNotEmpty());

        String hash = jdbc.sql("SELECT password_hash FROM users WHERE email = :e").param("e", email)
                .query(String.class).single();
        assertThat(hash).startsWith("$2");
    }

    @Test
    void programListsTheWholeYearInOrderAndMarksChaptersWithoutLessonsAsUnavailable() throws Exception {
        getJson("/chapters").andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(9))
                .andExpect(jsonPath("$[0].id").value("limites-continuite"))
                .andExpect(jsonPath("$[0].position").value(1))
                .andExpect(jsonPath("$[0].available").value(false))
                .andExpect(jsonPath("$[0].nextLessonId").doesNotExist())
                .andExpect(jsonPath("$[5].id").value("complexes"))
                .andExpect(jsonPath("$[5].available").value(true))
                .andExpect(jsonPath("$[5].lessonsTotal").value(9))
                .andExpect(jsonPath("$[5].lessonsDone").value(0))
                .andExpect(jsonPath("$[5].nextLessonId").value("L01"));
        getJson("/chapters/derivation").andExpect(status().isOk()).andExpect(jsonPath("$.lessons.length()").value(0));
    }

    @Test
    void chapterShowsLockedLessonsAndLessonPayloadNeverLeaksAnswers() throws Exception {
        getJson("/chapters/complexes").andExpect(status().isOk())
                .andExpect(jsonPath("$.lessons[0].id").value("L01"))
                .andExpect(jsonPath("$.lessons[0].status").value("unlocked"))
                .andExpect(jsonPath("$.lessons[0].stepsTotal").value(6))
                .andExpect(jsonPath("$.lessons[1].status").value("locked"));

        String lesson = getJson("/lessons/L01").andExpect(status().isOk())
                .andExpect(jsonPath("$.steps.length()").value(10))
                .andExpect(jsonPath("$.chapterId").value("complexes"))
                .andReturn().getResponse().getContentAsString();
        assertThat(lesson).contains("\"id\":\"L01-E1\"");
        // Exercise steps must carry no server-only data (worked-example "solution" in explanations is fine).
        int exercises = 0;
        for (JsonNode step : mapper.readTree(lesson).get("steps")) {
            if ("EXERCISE".equals(step.get("type").asText())) {
                exercises++;
                String exercise = step.get("exercise").toString();
                assertThat(exercise).doesNotContain("\"correct\"", "\"feedback\"", "\"order\"", "\"solution\"",
                        "\"tolerance\"", "\"answer\"", "\"hint\"", "\"re\"", "\"value\"");
            }
        }
        assertThat(exercises).isEqualTo(6);

        getJson("/lessons/L02").andExpect(status().isForbidden());
        answer("L02-E1", "{\"choices\":[\"a\"]}").andExpect(status().isForbidden());
    }

    @Test
    void wrongAnswerGoesToMistakesAndIsMasteredAfterTwoSuccesses() throws Exception {
        JsonNode wrong = body(answer("L01-E1", "{\"choices\":[\"a\"]}").andExpect(status().isOk())
                .andExpect(jsonPath("$.correct").value(false)).andExpect(jsonPath("$.xpAwarded").value(0)));
        assertThat(wrong.get("explanation").asText()).contains("signe");
        assertThat(wrong.get("solution").asText()).contains("Im");

        getJson("/me/mistakes").andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].exerciseId").value("L01-E1"));
        body(getJson("/me/progress").andExpect(jsonPath("$.xp").value(0)));

        answer("L01-E1", "{\"choices\":[\"b\"]}").andExpect(jsonPath("$.correct").value(true))
                .andExpect(jsonPath("$.xpAwarded").value(10)).andExpect(jsonPath("$.mastered").value(false));
        getJson("/me/mistakes").andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].streak").value(1));
        mvc.perform(post("/me/review-session").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.steps.length()").value(1));

        answer("L01-E1", "{\"choices\":[\"b\"]}").andExpect(jsonPath("$.mastered").value(true));
        getJson("/me/mistakes").andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void numericAnswersAreCheckedOnTheServer() throws Exception {
        answer("L01-E2", "{\"text\":\"-2i + 3\"}").andExpect(jsonPath("$.correct").value(true));
        answer("L01-E2", "{\"text\":\"(2+3i)+(1-5i)\"}").andExpect(jsonPath("$.correct").value(false));
        answer("L01-E2", "{\"text\":\"n'importe quoi\"}").andExpect(status().isBadRequest());
        // unreadable input is not an attempt
        Integer attempts = jdbc.sql("SELECT COUNT(*) FROM attempts a JOIN exercises e ON e.id = a.exercise_id WHERE e.code = 'L01-E2'")
                .query(Integer.class).single();
        assertThat(attempts).isGreaterThanOrEqualTo(2);
    }

    @Test
    void hintHalvesXp() throws Exception {
        mvc.perform(post("/exercises/L01-E3/hint").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.hint").isNotEmpty());
        answer("L01-E3", "{\"text\":\"5+5i\"}").andExpect(jsonPath("$.correct").value(true))
                .andExpect(jsonPath("$.xpAwarded").value(5));
        answer("L01-E3", "{\"text\":\"5+5i\"}").andExpect(jsonPath("$.xpAwarded").value(10));
    }

    private record Model(String lesson, String code, String type, String answer) {}

    private String modelAnswerJson(Model m) throws Exception {
        JsonNode a = mapper.readTree(m.answer());
        return switch (m.type()) {
            case "QCM" -> mapper.writeValueAsString(java.util.Map.of("choices", a.get("correct")));
            case "METHOD" -> mapper.writeValueAsString(java.util.Map.of("choices", a.get("order")));
            case "PLOT" -> "{\"point\":{\"re\":" + a.get("re").asDouble() + ",\"im\":" + a.get("im").asDouble() + "}}";
            default -> {
                String text = a.has("value") ? Double.toString(a.get("value").asDouble())
                        : a.get("re").asDouble() + (a.get("im").asDouble() < 0 ? "-" : "+") + Math.abs(a.get("im").asDouble()) + "i";
                yield mapper.writeValueAsString(java.util.Map.of("text", text));
            }
        };
    }

    @Test
    void aStudentCanPlayTheWholeCourseInOrderAndBossesGiveBonusXp() throws Exception {
        List<Model> models = jdbc.sql("""
                        SELECT l.code AS lesson, e.code, e.type, e.answer FROM lessons l
                        JOIN steps s ON s.lesson_id = l.id JOIN exercises e ON e.id = s.exercise_id
                        ORDER BY l.part, l.position, s.position""")
                .query((rs, n) -> new Model(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4))).list();
        assertThat(models).hasSize(47);

        String current = null;
        for (Model m : models) {
            if (current != null && !current.equals(m.lesson())) {
                mvc.perform(post("/lessons/" + current + "/complete").header("Authorization", "Bearer " + token))
                        .andExpect(status().isNoContent());
            }
            current = m.lesson();
            if ("PLOT".equals(m.type())) {
                answer(m.code(), "{}").andExpect(status().isBadRequest());
                answer(m.code(), "{\"point\":{\"re\":-4.5,\"im\":4.5}}").andExpect(jsonPath("$.correct").value(false))
                        .andExpect(jsonPath("$.explanation").value(org.hamcrest.Matchers.containsString("Vous avez placé")));
            }
            answer(m.code(), modelAnswerJson(m)).andExpect(status().isOk()).andExpect(jsonPath("$.correct").value(true));
        }
        mvc.perform(post("/lessons/" + current + "/complete").header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // 47 exercises x 10 XP + 25 bonus on the 8 final-exercise questions
        getJson("/me/progress").andExpect(jsonPath("$.xp").value(670)).andExpect(jsonPath("$.level").value(4));
        getJson("/chapters").andExpect(jsonPath("$[5].lessonsDone").value(9)).andExpect(jsonPath("$[5].nextLessonId").doesNotExist());
        getJson("/chapters/complexes").andExpect(jsonPath("$.lessons[8].status").value("completed"));
    }

    @Test
    void completingALessonRequiresAllExercisesAndUnlocksTheNext() throws Exception {
        mvc.perform(post("/lessons/L01/complete").header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict());

        answer("L01-E1", "{\"choices\":[\"b\"]}").andExpect(jsonPath("$.correct").value(true));
        answer("L01-E2", "{\"text\":\"3-2i\"}").andExpect(jsonPath("$.correct").value(true));
        answer("L01-E3", "{\"text\":\"5+5i\"}").andExpect(jsonPath("$.correct").value(true));
        answer("L01-E4", "{\"choices\":[\"b\"]}").andExpect(jsonPath("$.correct").value(true));
        answer("L01-E5", "{\"choices\":[\"s1a\",\"s2b\",\"s3a\"]}").andExpect(jsonPath("$.correct").value(true))
                .andExpect(jsonPath("$.stageResults.length()").value(3));
        answer("L01-E6", "{\"choices\":[\"a\",\"b\",\"d\"]}").andExpect(jsonPath("$.correct").value(true));

        mvc.perform(post("/lessons/L01/complete").header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        getJson("/chapters/complexes").andExpect(jsonPath("$.lessons[0].status").value("completed"))
                .andExpect(jsonPath("$.lessons[1].status").value("unlocked"));
        getJson("/lessons/L02").andExpect(status().isOk());

        getJson("/chapters").andExpect(jsonPath("$[5].lessonsDone").value(1))
                .andExpect(jsonPath("$[5].nextLessonId").value("L02"));

        getJson("/me/progress").andExpect(jsonPath("$.xp").value(60)).andExpect(jsonPath("$.level").value(2))
                .andExpect(jsonPath("$.streakDays").value(1))
                .andExpect(jsonPath("$.lessons[0].correct").value(6))
                .andExpect(jsonPath("$.weeks.length()").value(8))
                .andExpect(jsonPath("$.weeks[7].count").value(6));
    }
}

package ma.bac.complexes.grading;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import ma.bac.complexes.grading.AnswerGrader.Grade;
import org.junit.jupiter.api.Test;

class AnswerGraderTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final AnswerGrader grader = new AnswerGrader();

    private JsonNode json(String s) throws Exception {
        return mapper.readTree(s);
    }

    private static final String COMPLEX_PAYLOAD = "{\"format\":\"complex\"}";
    private static final String REAL_PAYLOAD = "{\"format\":\"real\"}";

    @Test
    void numericComplexAcceptsEquivalentFormsButNotWrongOrUnsimplifiedAnswers() throws Exception {
        JsonNode answer = json("{\"re\":3,\"im\":-2,\"tolerance\":0.001}");
        for (String ok : List.of("3 - 2i", "-2i + 3", "3−2i", "3+(-2)i", "6/2 - 2*i")) {
            assertThat(grader.grade("NUMERIC", json(COMPLEX_PAYLOAD), answer, null, ok).correct()).as(ok).isTrue();
        }
        for (String ko : List.of("3 + 2i", "2 - 3i", "3", "-2i")) {
            assertThat(grader.grade("NUMERIC", json(COMPLEX_PAYLOAD), answer, null, ko).correct()).as(ko).isFalse();
        }
        Grade unsimplified = grader.grade("NUMERIC", json(COMPLEX_PAYLOAD), answer, null, "(2+3i)+(1-5i)");
        assertThat(unsimplified.correct()).isFalse();
        assertThat(unsimplified.explanation()).contains("forme algébrique");
    }

    @Test
    void numericComplexUsesTolerance() throws Exception {
        JsonNode answer = json("{\"re\":0.5,\"im\":-0.5,\"tolerance\":0.001}");
        assertThat(grader.grade("NUMERIC", json(COMPLEX_PAYLOAD), answer, null, "1/2 - 1/2 i").correct()).isTrue();
        assertThat(grader.grade("NUMERIC", json(COMPLEX_PAYLOAD), answer, null, "0.5 - 0.5004i").correct()).isTrue();
        assertThat(grader.grade("NUMERIC", json(COMPLEX_PAYLOAD), answer, null, "0.5 - 0.52i").correct()).isFalse();
    }

    @Test
    void numericRealAcceptsExactAndApproximateValues() throws Exception {
        JsonNode answer = json("{\"value\":3.1622776601683795,\"tolerance\":0.01}");
        assertThat(grader.grade("NUMERIC", json(REAL_PAYLOAD), answer, null, "sqrt(10)").correct()).isTrue();
        assertThat(grader.grade("NUMERIC", json(REAL_PAYLOAD), answer, null, "√10").correct()).isTrue();
        assertThat(grader.grade("NUMERIC", json(REAL_PAYLOAD), answer, null, "3,16").correct()).isTrue();
        assertThat(grader.grade("NUMERIC", json(REAL_PAYLOAD), answer, null, "3.2").correct()).isFalse();
        assertThat(grader.grade("NUMERIC", json(REAL_PAYLOAD), answer, null, "3i").correct()).isFalse();
    }

    @Test
    void unreadableNumericInputIsNotGraded() throws Exception {
        assertThatThrownBy(() -> grader.grade("NUMERIC", json(COMPLEX_PAYLOAD), json("{\"re\":1,\"im\":1}"), null, "abc"))
                .isInstanceOf(UnreadableAnswerException.class);
    }

    @Test
    void qcmSingleAndMultipleWithPerOptionFeedback() throws Exception {
        JsonNode single = json("{\"correct\":[\"b\"],\"feedback\":{\"a\":\"signe oublié\"}}");
        assertThat(grader.grade("QCM", null, single, List.of("b"), null).correct()).isTrue();
        Grade wrong = grader.grade("QCM", null, single, List.of("a"), null);
        assertThat(wrong.correct()).isFalse();
        assertThat(wrong.explanation()).contains("signe oublié");

        JsonNode multi = json("{\"correct\":[\"a\",\"b\",\"d\"],\"feedback\":{\"c\":\"faux\",\"d\":\"oubli\"}}");
        assertThat(grader.grade("QCM", null, multi, List.of("d", "a", "b"), null).correct()).isTrue();
        Grade partial = grader.grade("QCM", null, multi, List.of("a", "b"), null);
        assertThat(partial.correct()).isFalse();
        assertThat(partial.explanation()).isEqualTo("oubli");
        assertThat(grader.grade("QCM", null, multi, List.of("a", "b", "c", "d"), null).correct()).isFalse();
    }

    @Test
    void qcmRequiresASelection() throws Exception {
        assertThatThrownBy(() -> grader.grade("QCM", null, json("{\"correct\":[\"a\"]}"), List.of(), null))
                .isInstanceOf(UnreadableAnswerException.class);
    }

    @Test
    void methodGradesEachStage() throws Exception {
        JsonNode payload = json("{\"stages\":[{},{},{}]}");
        JsonNode answer = json("{\"order\":[\"s1a\",\"s2b\",\"s3a\"],\"feedback\":{\"s2a\":\"i² vaut -1\"}}");
        Grade ok = grader.grade("METHOD", payload, answer, List.of("s1a", "s2b", "s3a"), null);
        assertThat(ok.correct()).isTrue();
        assertThat(ok.stageResults()).containsExactly(true, true, true);

        Grade ko = grader.grade("METHOD", payload, answer, List.of("s1a", "s2a", "s3a"), null);
        assertThat(ko.correct()).isFalse();
        assertThat(ko.stageResults()).containsExactly(true, false, true);
        assertThat(ko.explanation()).isEqualTo("i² vaut -1");

        assertThatThrownBy(() -> grader.grade("METHOD", payload, answer, List.of("s1a"), null))
                .isInstanceOf(UnreadableAnswerException.class);
    }
}

package ma.bac.complexes.grading;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Component;

/** Grades an answer against the server-only `answer` JSON of an exercise. */
@Component
public class AnswerGrader {

    public record Grade(boolean correct, String explanation, List<Boolean> stageResults) {}

    private static final double DEFAULT_TOLERANCE = 0.001;

    public Grade grade(String type, JsonNode payload, JsonNode answer, List<String> choices, String text) {
        return grade(type, payload, answer, choices, text, null);
    }

    public Grade grade(String type, JsonNode payload, JsonNode answer, List<String> choices, String text, Point point) {
        return switch (type) {
            case "QCM" -> gradeQcm(answer, choices);
            case "METHOD" -> gradeMethod(payload, answer, choices);
            case "NUMERIC" -> gradeNumeric(payload, answer, text);
            case "PLOT" -> gradePlot(answer, point);
            default -> throw new IllegalStateException("Unknown exercise type " + type);
        };
    }

    private Grade gradeQcm(JsonNode answer, List<String> choices) {
        if (choices == null || choices.isEmpty()) {
            throw new UnreadableAnswerException("Aucune réponse sélectionnée");
        }
        Set<String> chosen = new LinkedHashSet<>(choices);
        Set<String> correct = new LinkedHashSet<>();
        answer.get("correct").forEach(c -> correct.add(c.asText()));
        if (chosen.equals(correct)) {
            return new Grade(true, "", null);
        }
        Set<String> wrong = new LinkedHashSet<>();
        chosen.stream().filter(c -> !correct.contains(c)).forEach(wrong::add);
        correct.stream().filter(c -> !chosen.contains(c)).forEach(wrong::add);
        return new Grade(false, feedback(answer, wrong), null);
    }

    private Grade gradeMethod(JsonNode payload, JsonNode answer, List<String> choices) {
        JsonNode order = answer.get("order");
        if (choices == null || choices.size() != payload.get("stages").size()) {
            throw new UnreadableAnswerException("Toutes les étapes doivent être renseignées");
        }
        List<Boolean> stages = new ArrayList<>();
        Set<String> wrong = new LinkedHashSet<>();
        for (int i = 0; i < order.size(); i++) {
            boolean ok = order.get(i).asText().equals(choices.get(i));
            stages.add(ok);
            if (!ok) {
                wrong.add(choices.get(i));
            }
        }
        boolean correct = stages.stream().allMatch(b -> b);
        return new Grade(correct, correct ? "" : feedback(answer, wrong), stages);
    }

    private Grade gradeNumeric(JsonNode payload, JsonNode answer, String text) {
        double tolerance = answer.path("tolerance").asDouble(DEFAULT_TOLERANCE);
        ComplexParser.Parsed parsed = ComplexParser.parse(text);
        boolean complex = "complex".equals(payload.path("format").asText("real"));

        if (complex && !parsed.algebraicForm()) {
            return new Grade(false, "Donnez le résultat sous forme algébrique $a + bi$, sans parenthèses contenant $i$.", null);
        }
        if (!complex && parsed.iCount() > 0) {
            return new Grade(false, "La réponse attendue est un nombre réel.", null);
        }
        double re = parsed.value().re();
        double im = parsed.value().im();
        boolean ok = complex
                ? Math.abs(re - answer.get("re").asDouble()) <= tolerance && Math.abs(im - answer.get("im").asDouble()) <= tolerance
                : Math.abs(re - answer.get("value").asDouble()) <= tolerance;
        return new Grade(ok, ok ? "" : "Le résultat n’est pas équivalent à la réponse attendue. Vérifiez séparément la partie réelle et la partie imaginaire.", null);
    }

    private Grade gradePlot(JsonNode answer, Point point) {
        if (point == null) {
            throw new UnreadableAnswerException("Placez un point sur le plan");
        }
        double tolerance = answer.path("tolerance").asDouble(0.25);
        boolean ok = Math.abs(point.re() - answer.get("re").asDouble()) <= tolerance
                && Math.abs(point.im() - answer.get("im").asDouble()) <= tolerance;
        return new Grade(ok, ok ? "" : "Vous avez placé le point d’affixe $" + affix(point) + "$. Rappel : l’abscisse est la partie réelle et l’ordonnée la partie imaginaire.", null);
    }

    private static String num(double x) {
        return x == Math.rint(x) ? Long.toString((long) x) : Double.toString(x);
    }

    /** a + bi, omitting zero parts. */
    private static String affix(Point p) {
        if (p.im() == 0) {
            return num(p.re());
        }
        String imag = Math.abs(p.im()) == 1 ? "i" : num(Math.abs(p.im())) + "i";
        if (p.re() == 0) {
            return (p.im() < 0 ? "-" : "") + imag;
        }
        return num(p.re()) + (p.im() < 0 ? " - " : " + ") + imag;
    }

    private String feedback(JsonNode answer, Set<String> ids) {
        JsonNode fb = answer.path("feedback");
        List<String> parts = new ArrayList<>();
        for (String id : ids) {
            if (fb.hasNonNull(id)) {
                parts.add(fb.get(id).asText());
            }
        }
        return String.join(" ", parts);
    }
}

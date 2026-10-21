package ma.bac.complexes.grading;

/** The student's input could not be interpreted: not a wrong answer, so no attempt is recorded. */
public class UnreadableAnswerException extends RuntimeException {

    public UnreadableAnswerException(String message) {
        super(message);
    }
}

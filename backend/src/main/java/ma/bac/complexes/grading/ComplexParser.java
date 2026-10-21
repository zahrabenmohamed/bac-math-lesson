package ma.bac.complexes.grading;

/**
 * Parses student input such as "3 + 4i", "4i+3", "1/2 - 1/2 i", "sqrt(2)/2 + i" into a complex number.
 * Supports + - * / (explicit or implicit multiplication), parentheses, decimals (dot or comma), sqrt() and √.
 */
public final class ComplexParser {

    /** @param iCount number of occurrences of i; @param iInGroup whether any i sits inside parentheses. */
    public record Parsed(Complex value, int iCount, boolean iInGroup) {
        /** True for a final answer of the form a + bi (at most one imaginary term, not hidden in a group). */
        public boolean algebraicForm() {
            return iCount <= 1 && !iInGroup;
        }
    }

    private static final int MAX_LENGTH = 100;

    private final String s;
    private int pos;
    private int iCount;
    private int depth;
    private boolean iInGroup;

    private ComplexParser(String s) {
        this.s = s;
    }

    public static Parsed parse(String input) {
        if (input == null || input.isBlank()) {
            throw new UnreadableAnswerException("Réponse vide");
        }
        if (input.length() > MAX_LENGTH) {
            throw new UnreadableAnswerException("Réponse trop longue");
        }
        String normalized = input.toLowerCase()
                .replace('−', '-').replace('–', '-')
                .replace('×', '*').replace('·', '*')
                .replace(',', '.')
                .replace("√", "sqrt");
        ComplexParser p = new ComplexParser(normalized);
        Complex value = p.expr();
        if (p.peek() != '\0') {
            throw new UnreadableAnswerException("Caractère inattendu : " + p.peek());
        }
        return new Parsed(value, p.iCount, p.iInGroup);
    }

    private char peek() {
        while (pos < s.length() && s.charAt(pos) == ' ') {
            pos++;
        }
        return pos < s.length() ? s.charAt(pos) : '\0';
    }

    private Complex expr() {
        Complex v = term();
        for (char c = peek(); c == '+' || c == '-'; c = peek()) {
            pos++;
            Complex t = term();
            v = c == '+' ? v.plus(t) : v.minus(t);
        }
        return v;
    }

    private Complex term() {
        Complex v = unary();
        while (true) {
            char c = peek();
            if (c == '*') {
                pos++;
                v = v.times(unary());
            } else if (c == '/') {
                pos++;
                v = v.div(unary());
            } else if (startsAtom(c)) {
                v = v.times(atom());
            } else {
                return v;
            }
        }
    }

    private Complex unary() {
        char c = peek();
        if (c == '-') {
            pos++;
            return unary().negate();
        }
        if (c == '+') {
            pos++;
            return unary();
        }
        return atom();
    }

    private static boolean startsAtom(char c) {
        return Character.isDigit(c) || c == '.' || c == 'i' || c == 's' || c == '(';
    }

    private Complex atom() {
        char c = peek();
        if (Character.isDigit(c) || c == '.') {
            int start = pos;
            while (pos < s.length() && (Character.isDigit(s.charAt(pos)) || s.charAt(pos) == '.')) {
                pos++;
            }
            try {
                return new Complex(Double.parseDouble(s.substring(start, pos)), 0);
            } catch (NumberFormatException e) {
                throw new UnreadableAnswerException("Nombre invalide");
            }
        }
        if (c == 'i') {
            pos++;
            iCount++;
            if (depth > 0) {
                iInGroup = true;
            }
            return Complex.I;
        }
        if (c == 's' && s.startsWith("sqrt", pos)) {
            pos += 4;
            Complex arg = atom();
            if (Math.abs(arg.im()) > 1e-12 || arg.re() < 0) {
                throw new UnreadableAnswerException("Racine carrée non réelle");
            }
            return new Complex(Math.sqrt(arg.re()), 0);
        }
        if (c == '(') {
            pos++;
            depth++;
            Complex v = expr();
            if (peek() != ')') {
                throw new UnreadableAnswerException("Parenthèse fermante manquante");
            }
            pos++;
            depth--;
            return v;
        }
        throw new UnreadableAnswerException("Expression invalide");
    }
}

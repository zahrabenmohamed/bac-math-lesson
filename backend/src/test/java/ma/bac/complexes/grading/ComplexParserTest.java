package ma.bac.complexes.grading;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class ComplexParserTest {

    @ParameterizedTest
    @CsvSource(delimiter = ';', value = {
            "3 + 4i; 3; 4",
            "4i + 3; 3; 4",
            "3-2i; 3; -2",
            "3 − 2i; 3; -2",
            "-i; 0; -1",
            "i; 0; 1",
            "5; 5; 0",
            "2*i + 1; 1; 2",
            "1/2 - 1/2 i; 0.5; -0.5",
            "0,5 - 0,5i; 0.5; -0.5",
            "sqrt(2)/2 + sqrt(2)/2 i; 0.70710678; 0.70710678",
            "√3 + i; 1.7320508; 1",
            "i/2 + 1/2; 0.5; 0.5",
    })
    void parsesEquivalentWritings(String input, double re, double im) {
        Complex c = ComplexParser.parse(input).value();
        assertThat(c.re()).isCloseTo(re, within(1e-6));
        assertThat(c.im()).isCloseTo(im, within(1e-6));
    }

    @Test
    void evaluatesProductsAndQuotients() {
        Complex c = ComplexParser.parse("(1+2i)(3-i)").value();
        assertThat(c.re()).isCloseTo(5, within(1e-9));
        assertThat(c.im()).isCloseTo(5, within(1e-9));
        Complex q = ComplexParser.parse("(2+i)/(1-i)").value();
        assertThat(q.re()).isCloseTo(0.5, within(1e-9));
        assertThat(q.im()).isCloseTo(1.5, within(1e-9));
    }

    @Test
    void detectsNonAlgebraicForms() {
        assertThat(ComplexParser.parse("3 + 4i").algebraicForm()).isTrue();
        assertThat(ComplexParser.parse("4i + 3").algebraicForm()).isTrue();
        assertThat(ComplexParser.parse("(1+2i)(3-i)").algebraicForm()).isFalse();
        assertThat(ComplexParser.parse("(1+i)/2").algebraicForm()).isFalse();
        assertThat(ComplexParser.parse("1 + 2i + 3i").algebraicForm()).isFalse();
    }

    @ParameterizedTest
    @CsvSource({"''", "abc", "3 +", "(1+i", "1/0", "sqrt(-4)", "3 $ 4", "2^2"})
    void rejectsUnreadableInput(String input) {
        assertThatThrownBy(() -> ComplexParser.parse(input)).isInstanceOf(UnreadableAnswerException.class);
    }

    @Test
    void rejectsOverlongInput() {
        assertThatThrownBy(() -> ComplexParser.parse("1+".repeat(80) + "1"))
                .isInstanceOf(UnreadableAnswerException.class);
    }
}

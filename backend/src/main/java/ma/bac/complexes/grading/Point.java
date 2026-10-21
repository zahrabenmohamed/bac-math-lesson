package ma.bac.complexes.grading;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

/** A point placed on the complex plane by the student: abscissa = real part, ordinate = imaginary part. */
public record Point(
        @DecimalMin("-1000") @DecimalMax("1000") double re,
        @DecimalMin("-1000") @DecimalMax("1000") double im) {}

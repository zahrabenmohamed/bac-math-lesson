package ma.bac.complexes.grading;

public record Complex(double re, double im) {

    public static final Complex I = new Complex(0, 1);

    public Complex plus(Complex o) {
        return new Complex(re + o.re, im + o.im);
    }

    public Complex minus(Complex o) {
        return new Complex(re - o.re, im - o.im);
    }

    public Complex times(Complex o) {
        return new Complex(re * o.re - im * o.im, re * o.im + im * o.re);
    }

    public Complex div(Complex o) {
        double d = o.re * o.re + o.im * o.im;
        if (d == 0) {
            throw new UnreadableAnswerException("Division par zéro");
        }
        return new Complex((re * o.re + im * o.im) / d, (im * o.re - re * o.im) / d);
    }

    public Complex negate() {
        return new Complex(-re, -im);
    }
}

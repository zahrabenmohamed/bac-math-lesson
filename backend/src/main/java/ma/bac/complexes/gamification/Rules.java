package ma.bac.complexes.gamification;

import java.time.LocalDate;

/** XP, level, streak and mastery rules (pure functions, no I/O). */
public final class Rules {

    public static final int XP_CORRECT = 10;
    public static final int XP_CORRECT_WITH_HINT = 5;
    public static final int XP_BOSS_BONUS = 25;
    public static final int MASTERY_THRESHOLD = 2;

    private Rules() {}

    public static int xpFor(boolean correct, boolean hintUsed, boolean boss) {
        if (!correct) {
            return 0;
        }
        return (hintUsed ? XP_CORRECT_WITH_HINT : XP_CORRECT) + (boss ? XP_BOSS_BONUS : 0);
    }

    public static int levelFor(int xp) {
        return (int) Math.floor(Math.sqrt(xp / 50.0)) + 1;
    }

    /** Total XP at which {@code level} starts. */
    public static int xpAtLevelStart(int level) {
        return 50 * (level - 1) * (level - 1);
    }

    /** Daily streak after activity on {@code today}. */
    public static int nextStreak(int current, LocalDate lastActive, LocalDate today) {
        if (lastActive == null) {
            return 1;
        }
        if (lastActive.equals(today)) {
            return Math.max(current, 1);
        }
        return lastActive.plusDays(1).equals(today) ? current + 1 : 1;
    }

    public record Mastery(int streak, boolean everWrong, boolean mastered) {
        public static final Mastery NONE = new Mastery(0, false, false);
    }

    /** A question is mastered after 2 consecutive successes following at least one mistake. */
    public static Mastery nextMastery(Mastery prev, boolean correct) {
        if (!correct) {
            return new Mastery(0, true, false);
        }
        int streak = prev.streak() + 1;
        return new Mastery(streak, prev.everWrong(), prev.everWrong() && streak >= MASTERY_THRESHOLD);
    }
}

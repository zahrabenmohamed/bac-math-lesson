package ma.bac.complexes.gamification;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import ma.bac.complexes.gamification.Rules.Mastery;
import org.junit.jupiter.api.Test;

class RulesTest {

    @Test
    void xpDependsOnCorrectnessHintAndBoss() {
        assertThat(Rules.xpFor(true, false, false)).isEqualTo(10);
        assertThat(Rules.xpFor(true, true, false)).isEqualTo(5);
        assertThat(Rules.xpFor(false, false, false)).isZero();
        assertThat(Rules.xpFor(true, false, true)).isEqualTo(35);
        assertThat(Rules.xpFor(false, true, true)).isZero();
    }

    @Test
    void levelsGrowWithXp() {
        assertThat(Rules.levelFor(0)).isEqualTo(1);
        assertThat(Rules.levelFor(49)).isEqualTo(1);
        assertThat(Rules.levelFor(50)).isEqualTo(2);
        assertThat(Rules.levelFor(199)).isEqualTo(2);
        assertThat(Rules.levelFor(200)).isEqualTo(3);
        assertThat(Rules.xpAtLevelStart(3)).isEqualTo(200);
    }

    @Test
    void streakRules() {
        LocalDate today = LocalDate.of(2026, 10, 21);
        assertThat(Rules.nextStreak(0, null, today)).isEqualTo(1);
        assertThat(Rules.nextStreak(3, today, today)).isEqualTo(3);
        assertThat(Rules.nextStreak(3, today.minusDays(1), today)).isEqualTo(4);
        assertThat(Rules.nextStreak(7, today.minusDays(2), today)).isEqualTo(1);
    }

    @Test
    void masteryNeedsTwoConsecutiveSuccessesAfterAMistake() {
        Mastery m = Rules.nextMastery(Mastery.NONE, false);
        assertThat(m).isEqualTo(new Mastery(0, true, false));
        m = Rules.nextMastery(m, true);
        assertThat(m.streak()).isEqualTo(1);
        assertThat(m.mastered()).isFalse();
        m = Rules.nextMastery(m, true);
        assertThat(m.mastered()).isTrue();
    }

    @Test
    void aFailureResetsTheStreakAndMasteryAndSuccessWithoutMistakeIsNotAMistake() {
        Mastery m = new Mastery(1, true, false);
        assertThat(Rules.nextMastery(m, false)).isEqualTo(new Mastery(0, true, false));
        assertThat(Rules.nextMastery(new Mastery(2, true, true), false).mastered()).isFalse();

        Mastery clean = Rules.nextMastery(Rules.nextMastery(Mastery.NONE, true), true);
        assertThat(clean.everWrong()).isFalse();
        assertThat(clean.mastered()).isFalse();
    }
}

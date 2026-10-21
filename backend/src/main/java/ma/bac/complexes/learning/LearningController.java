package ma.bac.complexes.learning;

import jakarta.validation.Valid;
import java.util.List;
import ma.bac.complexes.learning.LearningDtos.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class LearningController {

    private final LearningService service;

    public LearningController(LearningService service) {
        this.service = service;
    }

    private static long uid(Jwt jwt) {
        return Long.parseLong(jwt.getSubject());
    }

    @GetMapping("/chapters")
    public List<ChapterSummary> program(@AuthenticationPrincipal Jwt jwt) {
        return service.program(uid(jwt));
    }

    @GetMapping("/chapters/{id}")
    public ChapterDto chapter(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return service.chapter(uid(jwt), id);
    }

    @GetMapping("/lessons/{id}")
    public LessonDto lesson(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return service.lesson(uid(jwt), id);
    }

    @PostMapping("/lessons/{id}/complete")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void complete(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        service.completeLesson(uid(jwt), id);
    }

    @PostMapping("/exercises/{id}/answer")
    public AnswerResponse answer(@AuthenticationPrincipal Jwt jwt, @PathVariable String id,
                                 @Valid @RequestBody AnswerRequest request) {
        return service.answer(uid(jwt), id, request);
    }

    @PostMapping("/exercises/{id}/hint")
    public HintResponse hint(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return service.hint(uid(jwt), id);
    }

    @GetMapping("/me/progress")
    public ProgressDto progress(@AuthenticationPrincipal Jwt jwt) {
        return service.progress(uid(jwt));
    }

    @GetMapping("/me/mistakes")
    public List<MistakeDto> mistakes(@AuthenticationPrincipal Jwt jwt) {
        return service.mistakes(uid(jwt));
    }

    @PostMapping("/me/review-session")
    public LessonDto reviewSession(@AuthenticationPrincipal Jwt jwt) {
        return service.reviewSession(uid(jwt));
    }
}

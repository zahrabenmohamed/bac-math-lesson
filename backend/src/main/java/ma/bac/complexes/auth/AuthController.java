package ma.bac.complexes.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import ma.bac.complexes.api.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    public record RegisterRequest(
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            @NotBlank @Size(max = 80) String displayName) {}

    public record LoginRequest(@NotBlank @Size(max = 255) String email, @NotBlank @Size(max = 72) String password) {}

    public record AuthResponse(String token, String displayName) {}

    private record UserRow(long id, String passwordHash, String displayName) {}

    private final JdbcClient jdbc;
    private final PasswordEncoder encoder;
    private final JwtEncoder jwtEncoder;
    private final long expiryMinutes;

    public AuthController(JdbcClient jdbc, PasswordEncoder encoder, JwtEncoder jwtEncoder,
                          @Value("${app.jwt.expiry-minutes}") long expiryMinutes) {
        this.jdbc = jdbc;
        this.encoder = encoder;
        this.jwtEncoder = jwtEncoder;
        this.expiryMinutes = expiryMinutes;
    }

    @PostMapping("/register")
    @Transactional
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        boolean exists = jdbc.sql("SELECT COUNT(*) FROM users WHERE email = :e").param("e", email)
                .query(Long.class).single() > 0;
        if (exists) {
            throw new ApiException(HttpStatus.CONFLICT, "Un compte existe déjà avec cet e-mail");
        }
        jdbc.sql("INSERT INTO users (email, password_hash, display_name) VALUES (:e, :h, :n)")
                .param("e", email).param("h", encoder.encode(req.password())).param("n", req.displayName().trim())
                .update();
        long id = jdbc.sql("SELECT id FROM users WHERE email = :e").param("e", email).query(Long.class).single();
        jdbc.sql("INSERT INTO user_stats (user_id) VALUES (:id)").param("id", id).update();
        return new AuthResponse(issueToken(id), req.displayName().trim());
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        UserRow user = jdbc.sql("SELECT id, password_hash, display_name FROM users WHERE email = :e")
                .param("e", req.email().trim().toLowerCase()).query(UserRow.class).optional().orElse(null);
        if (user == null || !encoder.matches(req.password(), user.passwordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Identifiants invalides");
        }
        return new AuthResponse(issueToken(user.id()), user.displayName());
    }

    private String issueToken(long userId) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(Long.toString(userId))
                .issuedAt(now)
                .expiresAt(now.plus(expiryMinutes, ChronoUnit.MINUTES))
                .build();
        return jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
    }
}

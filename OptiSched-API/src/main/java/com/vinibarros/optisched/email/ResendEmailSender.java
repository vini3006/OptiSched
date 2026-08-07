package com.vinibarros.optisched.email;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

/**
 * Real email delivery via Resend (https://resend.com/docs/api-reference/emails/send-email).
 * Mutually exclusive with {@link LoggingEmailSender} via app.email.provider=resend.
 */
@Component
@ConditionalOnProperty(prefix = "app.email", name = "provider", havingValue = "resend")
public class ResendEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(ResendEmailSender.class);

    private final RestClient resendRestClient;
    private final String from;
    private final String frontendUrl;

    public ResendEmailSender(
            @Qualifier("resendRestClient") RestClient resendRestClient,
            @Value("${app.email.resend.from}") String from,
            @Value("${app.frontend-url}") String frontendUrl
    ) {
        this.resendRestClient = resendRestClient;
        this.from = from;
        this.frontendUrl = frontendUrl;
    }

    @Override
    public void sendPasswordResetEmail(String to, String resetLink) {
        String subject = "Redefinição de senha - OptiSched";
        String html = """
                <p>Recebemos uma solicitação para redefinir a sua senha no OptiSched.</p>
                <p><a href="%s">Clique aqui para redefinir sua senha</a></p>
                <p>Este link expira em 60 minutos. Se você não solicitou essa alteração, pode ignorar este e-mail.</p>
                """.formatted(resetLink);

        send(to, subject, html);
    }

    @Override
    public void sendScheduleChangedEmail(String to, String professorName) {
        String subject = "Sua grade de horários foi atualizada - OptiSched";
        String html = """
                <p>Olá, %s.</p>
                <p>A sua grade de horários no OptiSched foi atualizada.</p>
                <p><a href="%s/professor/horario">Clique aqui para conferir o seu horário</a></p>
                """.formatted(professorName, frontendUrl);

        send(to, subject, html);
    }

    /**
     * Failure here (network error, invalid API key, Resend outage, etc.) is
     * logged and swallowed, never propagated to the caller: both call sites
     * (password reset, schedule change notification) must keep behaving the
     * same regardless of whether the email actually got delivered — this
     * mirrors LoggingEmailSender, which can't fail at all, and preserves
     * PasswordResetService's anti-enumeration response either way.
     */
    private void send(String to, String subject, String html) {
        try {
            resendRestClient.post()
                    .uri("/emails")
                    .body(Map.of(
                            "from", from,
                            "to", List.of(to),
                            "subject", subject,
                            "html", html
                    ))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            log.error("Failed to send email via Resend to {}: {}", to, e.getMessage());
        }
    }
}

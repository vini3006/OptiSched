package com.vinibarros.optisched.email;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Dev-mode stand-in for a real email provider: logs the reset link instead of
 * sending it, so the password-reset flow is fully testable end-to-end without
 * a real provider configured. Mutually exclusive with {@link ResendEmailSender}
 * via app.email.provider — this is the default (log) when unset.
 */
@Component
@ConditionalOnProperty(prefix = "app.email", name = "provider", havingValue = "log", matchIfMissing = true)
public class LoggingEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingEmailSender.class);

    @Override
    public void sendPasswordResetEmail(String to, String resetLink) {
        log.info("Password reset requested for {}. Reset link: {}", to, resetLink);
    }

    @Override
    public void sendScheduleChangedEmail(String to, String professorName) {
        log.info("Schedule changed for professor {} ({}).", professorName, to);
    }
}

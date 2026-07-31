package com.vinibarros.optisched.email;

/**
 * Seam for actually delivering transactional emails. The only implementation
 * today ({@link LoggingEmailSender}) just logs the link — swap in a real
 * provider (Resend, SMTP, etc.) behind this interface once the institution
 * has a verified sending domain, without touching any caller.
 */
public interface EmailSender {
    void sendPasswordResetEmail(String to, String resetLink);

    void sendScheduleChangedEmail(String to, String professorName);
}

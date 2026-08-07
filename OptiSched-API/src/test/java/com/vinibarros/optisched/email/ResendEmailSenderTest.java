package com.vinibarros.optisched.email;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Binds a MockRestServiceServer to a real RestClient instead of mocking every
 * step of RestClient's fluent interface, mirroring OptimizerClientTest.
 */
class ResendEmailSenderTest {

    private static final String BASE_URL = "http://test-resend";
    private static final String FROM = "OptiSched <onboarding@resend.dev>";
    private static final String FRONTEND_URL = "http://localhost:5173";

    private MockRestServiceServer mockServer;
    private ResendEmailSender resendEmailSender;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder()
                .baseUrl(BASE_URL)
                .defaultHeader("Authorization", "Bearer test-key");
        mockServer = MockRestServiceServer.bindTo(builder).build();
        resendEmailSender = new ResendEmailSender(builder.build(), FROM, FRONTEND_URL);
    }

    @Test
    void sendPasswordResetEmail_postsExpectedPayload() {
        mockServer.expect(requestTo(BASE_URL + "/emails"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer test-key"))
                .andExpect(jsonPath("$.from").value(FROM))
                .andExpect(jsonPath("$.to[0]").value("professor@example.com"))
                .andExpect(jsonPath("$.subject").value("Redefinição de senha - OptiSched"))
                .andExpect(jsonPath("$.html").value(org.hamcrest.Matchers.containsString(
                        "http://localhost:5173/redefinir-senha?token=abc")))
                .andRespond(withSuccess("{\"id\": \"email-1\"}", MediaType.APPLICATION_JSON));

        resendEmailSender.sendPasswordResetEmail(
                "professor@example.com", "http://localhost:5173/redefinir-senha?token=abc"
        );

        mockServer.verify();
    }

    @Test
    void sendScheduleChangedEmail_postsExpectedPayload() {
        mockServer.expect(requestTo(BASE_URL + "/emails"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.to[0]").value("professor@example.com"))
                .andExpect(jsonPath("$.subject").value("Sua grade de horários foi atualizada - OptiSched"))
                .andExpect(jsonPath("$.html").value(org.hamcrest.Matchers.containsString("Ana Souza")))
                .andExpect(jsonPath("$.html").value(org.hamcrest.Matchers.containsString(
                        "http://localhost:5173/professor/horario")))
                .andRespond(withSuccess("{\"id\": \"email-2\"}", MediaType.APPLICATION_JSON));

        resendEmailSender.sendScheduleChangedEmail("professor@example.com", "Ana Souza");

        mockServer.verify();
    }

    @Test
    void sendPasswordResetEmail_swallowsFailureInsteadOfPropagating() {
        mockServer.expect(requestTo(BASE_URL + "/emails"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED)
                        .body("{\"message\": \"Invalid API key\"}")
                        .contentType(MediaType.APPLICATION_JSON));

        assertThatCode(() -> resendEmailSender.sendPasswordResetEmail(
                "professor@example.com", "http://localhost:5173/redefinir-senha?token=abc"
        )).doesNotThrowAnyException();

        mockServer.verify();
    }
}

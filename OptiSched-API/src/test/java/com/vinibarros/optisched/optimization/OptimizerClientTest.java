package com.vinibarros.optisched.optimization;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vinibarros.optisched.dto.optimization.ObjectiveWeightsInput;
import com.vinibarros.optisched.dto.optimization.OptimizationRequest;
import com.vinibarros.optisched.dto.optimization.OptimizationResponse;
import com.vinibarros.optisched.exception.InvalidScheduleException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Binds a MockRestServiceServer to a real RestClient instead of mocking every
 * step of RestClient's fluent interface — far less brittle, and it exercises
 * the actual request/response (de)serialization OptimizerClient relies on.
 */
class OptimizerClientTest {

    private static final String BASE_URL = "http://test-optimizer";

    private MockRestServiceServer mockServer;
    private OptimizerClient optimizerClient;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE_URL);
        mockServer = MockRestServiceServer.bindTo(builder).build();
        optimizerClient = new OptimizerClient(builder.build(), new ObjectMapper());
    }

    @Test
    void optimize_returnsDeserializedResponseOnSuccess() {
        mockServer.expect(requestTo(BASE_URL + "/api/optimize"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("{\"schedule_entries\": []}", MediaType.APPLICATION_JSON));

        OptimizationResponse response = optimizerClient.optimize(emptyRequest());

        assertThat(response.scheduleEntries()).isEmpty();
        mockServer.verify();
    }

    @Test
    void optimize_wrapsUnprocessableEntityAsInvalidScheduleException() {
        mockServer.expect(requestTo(BASE_URL + "/api/optimize"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.UNPROCESSABLE_ENTITY)
                        .body("{\"detail\": \"No feasible schedule could be found for the given constraints\"}")
                        .contentType(MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> optimizerClient.optimize(emptyRequest()))
                .isInstanceOf(InvalidScheduleException.class)
                .hasMessageContaining("No feasible schedule could be found for the given constraints")
                .hasMessageNotContaining("{\"detail\"");

        mockServer.verify();
    }

    @Test
    void optimize_fallsBackToRawBodyWhenResponseIsNotParseableJson() {
        mockServer.expect(requestTo(BASE_URL + "/api/optimize"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.UNPROCESSABLE_ENTITY)
                        .body("not valid json")
                        .contentType(MediaType.TEXT_PLAIN));

        assertThatThrownBy(() -> optimizerClient.optimize(emptyRequest()))
                .isInstanceOf(InvalidScheduleException.class)
                .hasMessageContaining("not valid json");

        mockServer.verify();
    }

    private OptimizationRequest emptyRequest() {
        return new OptimizationRequest(
                List.of(), List.of(), List.of(), List.of(), ObjectiveWeightsInput.defaults(), List.of(), List.of()
        );
    }
}

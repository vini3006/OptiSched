package com.vinibarros.optisched.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    @Value("${optimizer.url}")
    private String optimizerBaseUrl;

    @Value("${optimizer.internal-key:}")
    private String optimizerInternalKey;

    @Value("${app.email.resend.api-key:}")
    private String resendApiKey;

    @Bean
    public RestClient restClient() {
        SimpleClientHttpRequestFactory requestFactory =  new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(120000);

        return RestClient.builder()
                .requestFactory(requestFactory)
                .baseUrl(optimizerBaseUrl)
                .defaultHeader("X-Internal-Key", optimizerInternalKey)
                .build();
    }

    /**
     * Only actually invoked by ResendEmailSender, which is itself
     * @ConditionalOnProperty-gated to app.email.provider=resend — this bean
     * is harmless to create unconditionally even when that provider is off
     * (e.g. local dev with app.email.provider=log), since it never makes a
     * request unless something calls it.
     */
    @Bean
    public RestClient resendRestClient() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(10000);

        return RestClient.builder()
                .requestFactory(requestFactory)
                .baseUrl("https://api.resend.com")
                .defaultHeader("Authorization", "Bearer " + resendApiKey)
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .build();
    }
}

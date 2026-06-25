package com.mikko_huttunen.scoreboards.configs;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class AuthConfig {

    @Value("${okta.oauth2.issuer}")
    private String issuer;

    @Value("${okta.oauth2.audience}")
    private String audience;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        /*
        This is where we configure the security required for our endpoints and setup our app to serve as
        an OAuth2 Resource Server, using JWT validation.
        */
        return http
            .csrf(csrf -> csrf.disable()) // Disable CSRF for API endpoints
            .authorizeHttpRequests((authorize) -> authorize
                    .anyRequest().authenticated()
            )
                .exceptionHandling(ex -> ex
                        // Handles 401 (Authentication Failure)
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType("application/json");
                            response.getWriter().write(
                                    "{\"error\": " +
                                            "\"Unauthorized\", " +
                                            "\"message\": \"" + authException.getMessage() +
                                        "\"}");
                        })
                        // Handles 403 (Authorization Failure)
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType("application/json");
                            response.getWriter().write(
                                    "{\"error\": " +
                                            "\"Forbidden\", " +
                                            "\"message\": \"" + accessDeniedException.getMessage() +
                                        "\"}");
                        }))
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .oauth2ResourceServer(oauth2 -> oauth2
                    .jwt(jwt -> jwt
                            .decoder(jwtDecoder())
                    )
            )
            .build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        NimbusJwtDecoder jwtDecoder = JwtDecoders.fromOidcIssuerLocation(issuer);
        
        // Create validators - accept tokens with either audience
        OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(issuer);

        OAuth2TokenValidator<Jwt> allowedAudience = new FlexibleAudienceValidator(
                audience
        );

        jwtDecoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(withIssuer, allowedAudience));
        return jwtDecoder;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(
            "http://localhost:5173"
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type"));
        configuration.setAllowCredentials(false);
        configuration.setExposedHeaders(Arrays.asList("Authorization", "Content-Type"));
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }

    /**
     * Flexible validator that accepts tokens with any of the allowed audiences.
     * This allows tokens from both the Spring Boot API audience and Auth0 Management API.
     */
    private static class FlexibleAudienceValidator implements OAuth2TokenValidator<Jwt> {
        private final List<String> allowedAudiences;

        public FlexibleAudienceValidator(String... audiences) {
            this.allowedAudiences = Arrays.asList(audiences);
        }

        @Override
        public OAuth2TokenValidatorResult validate(Jwt jwt) {
            List<String> tokenAudiences = jwt.getAudience();
            
            // Check if token has any of the allowed audiences
            for (String allowedAudience : allowedAudiences) {
                if (tokenAudiences.contains(allowedAudience)) {
                    return OAuth2TokenValidatorResult.success();
                }
            }
            
            // If no match found, return failure
            return OAuth2TokenValidatorResult.failure(new org.springframework.security.oauth2.core.OAuth2Error(
                "invalid_token", 
                "The token does not contain any of the required audiences: " + allowedAudiences, 
                null
            ));
        }
    }
}
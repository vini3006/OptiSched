package com.vinibarros.optisched.auth;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Extracted from AuthController so DemoController can set the exact same
 * access_token cookie (httpOnly, Secure/SameSite per cookieSecure) without
 * duplicating the cross-site cookie logic documented on cookieSameSite().
 */
@Component
public class AuthCookieService {

    public static final String COOKIE_NAME = "access_token";

    @Value("${app.cookie.secure}")
    private boolean cookieSecure;

    public void setAuthCookie(HttpServletResponse response, String token) {
        Cookie cookie = new Cookie(COOKIE_NAME, token);
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge((int) TokenService.EXPIRES_IN_SECONDS);
        cookie.setAttribute("SameSite", cookieSameSite());
        response.addCookie(cookie);
    }

    public void clearAuthCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(COOKIE_NAME, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        cookie.setAttribute("SameSite", cookieSameSite());
        response.addCookie(cookie);
    }

    /**
     * Frontend (Vercel) and API (EC2) live on different registrable domains
     * in production, making every fetch/XHR call cross-site — browsers only
     * attach SameSite=Lax cookies to top-level navigations, not JS requests,
     * so the JWT cookie set here would never come back on subsequent calls.
     * SameSite=None fixes that, but browsers only accept None on cookies
     * that are also Secure, which is exactly when cookieSecure is true
     * (production, HTTPS). Locally (dev, HTTP, cookieSecure=false) frontend
     * and API share the same registrable domain (just different ports), so
     * Lax already works there.
     */
    private String cookieSameSite() {
        return cookieSecure ? "None" : "Lax";
    }
}

package com.mysteriousmonkeys.chanlo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // Redirect common paths to the correct API base path
        registry.addRedirectViewController("/events", "/chanla/events");
        registry.addRedirectViewController("/users", "/chanla/users");
        registry.addRedirectViewController("/hisabs", "/chanla/hisabs");
    }
}


package com.mysteriousmonkeys.chanlo.dto;

import com.mysteriousmonkeys.chanlo.user.UserRole;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record UserCreateRequest(
    @NotNull String name,
    String village,
    @NotNull @Pattern(regexp = "^\\d{10}$") String phoneNumber,
    UserRole role
) {}


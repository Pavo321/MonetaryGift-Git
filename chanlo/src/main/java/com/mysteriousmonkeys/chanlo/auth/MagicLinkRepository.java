package com.mysteriousmonkeys.chanlo.auth;

import com.mysteriousmonkeys.chanlo.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MagicLinkRepository extends JpaRepository<MagicLink, Long> {

    Optional<MagicLink> findByToken(String token);

    Optional<MagicLink> findByHostAndUsedFalse(User host);

    void deleteByHost(User host);
}

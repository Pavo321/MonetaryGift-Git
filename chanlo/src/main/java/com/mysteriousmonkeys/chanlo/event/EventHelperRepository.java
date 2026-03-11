package com.mysteriousmonkeys.chanlo.event;

import com.mysteriousmonkeys.chanlo.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EventHelperRepository extends JpaRepository<EventHelper, Integer> {
    List<EventHelper> findByEvent(Event event);
    List<EventHelper> findByEventAndIsActiveTrue(Event event);
    List<EventHelper> findByHelper(User helper);
    Optional<EventHelper> findByEventAndHelper(Event event, User helper);
    boolean existsByEventAndHelperAndIsActiveTrue(Event event, User helper);
}

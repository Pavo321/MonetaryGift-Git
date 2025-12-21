package com.mysteriousmonkeys.chanlo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class ChanloApplication {

	public static void main(String[] args) {
		SpringApplication.run(ChanloApplication.class, args);
	}

}

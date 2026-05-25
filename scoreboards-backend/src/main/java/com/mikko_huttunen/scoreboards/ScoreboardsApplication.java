package com.mikko_huttunen.scoreboards;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication
@EnableMongoAuditing
public class ScoreboardsApplication {

	public static void main(String[] args) {
		SpringApplication.run(ScoreboardsApplication.class, args);
	}

}

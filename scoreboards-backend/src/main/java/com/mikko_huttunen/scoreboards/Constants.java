package com.mikko_huttunen.scoreboards;

public final class Constants {
    private Constants() {
        throw new AssertionError("Utility class cannot be instantiated");
    }

    public static final class Types {
        public static final String USER = "User";
        public static final String SCOREBOARD = "Scoreboard";
        public static final String SESSION = "Session";
        public static final String RESULT_ENTRY = "ResultEntry";
        public static final String RESULT = "Result";
        public static final String POINT_CATEGORY = "PointCategory";
    }
}

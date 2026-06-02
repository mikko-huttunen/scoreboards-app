package com.mikko_huttunen.scoreboards.util;

import java.lang.reflect.Field;
import java.util.Objects;

public class Utils {
    private Utils() {
        throw new AssertionError("Utility class");
    }

    public static <T> T updateChangedFields(T oldObj, T newObj) throws IllegalAccessException {
        if (oldObj == null || newObj == null) {
            throw new IllegalArgumentException("Objects must not be null");
        }

        if (!oldObj.getClass().equals(newObj.getClass())) {
            throw new IllegalArgumentException("Objects must be of the same class");
        }

        Field[] fields = oldObj.getClass().getDeclaredFields();

        for (Field field : fields) {
            field.setAccessible(true);

            Object oldValue = field.get(oldObj);
            Object newValue = field.get(newObj);

            if (!Objects.equals(oldValue, newValue)) {
                field.set(oldObj, newValue);
            }
        }

        return oldObj;
    }
}

package com.example.demo.util;

/**
 * Utility class for safely handling MongoDB queries
 */
public class MongoQueryUtil {

    /**
     * Sanitize user input for MongoDB regex queries
     * Escapes special regex characters to prevent injection
     *
     * @param input User-provided search string
     * @return Sanitized string safe for regex queries
     */
    public static String sanitizeRegexInput(String input) {
        if (input == null || input.isEmpty()) {
            return input;
        }

        // Escape special regex characters
        // Characters that need escaping: . * + ? ^ $ ( ) [ ] { } | \
        return input.replaceAll("([.\\*+?^$()\\[\\]{}|\\\\])", "\\\\$1");
    }

    /**
     * Validate and limit search query length
     *
     * @param query Search query
     * @param maxLength Maximum allowed length
     * @return Validated query
     * @throws IllegalArgumentException if query exceeds max length
     */
    public static String validateQueryLength(String query, int maxLength) {
        if (query != null && query.length() > maxLength) {
            throw new IllegalArgumentException(
                String.format("Search query too long. Maximum length: %d characters", maxLength)
            );
        }
        return query;
    }
}

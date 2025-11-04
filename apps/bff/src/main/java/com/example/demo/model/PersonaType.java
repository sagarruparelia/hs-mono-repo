package com.example.demo.model;

/**
 * Persona types that determine access levels
 */
public enum PersonaType {
    /**
     * Representative with Read Permission
     * Alone: No effect on web-cl access
     */
    RRP,

    /**
     * Digital Account Access
     * Alone: No effect on web-cl access
     */
    DAA,

    /**
     * Read of Information (Sensitive Data Access)
     * Required alongside RRP or DAA for sensitive data access
     */
    ROI,

    /**
     * Personal Representative
     * Member is 18+ and eligible to represent others
     */
    PR;

    /**
     * Check if persona grants digital account access
     * Requires both (RRP or DAA) AND optionally ROI for sensitive data
     */
    public static boolean hasDigitalAccountAccess(String... personas) {
        boolean hasRRP = false;
        boolean hasDAA = false;

        for (String persona : personas) {
            if (persona != null) {
                if (persona.equalsIgnoreCase("RRP")) hasRRP = true;
                if (persona.equalsIgnoreCase("DAA")) hasDAA = true;
            }
        }

        return hasRRP && hasDAA;
    }

    /**
     * Check if persona grants sensitive data access
     * Requires (RRP AND DAA) AND ROI
     */
    public static boolean hasSensitiveDataAccess(String... personas) {
        boolean hasRRP = false;
        boolean hasDAA = false;
        boolean hasROI = false;

        for (String persona : personas) {
            if (persona != null) {
                if (persona.equalsIgnoreCase("RRP")) hasRRP = true;
                if (persona.equalsIgnoreCase("DAA")) hasDAA = true;
                if (persona.equalsIgnoreCase("ROI")) hasROI = true;
            }
        }

        return hasRRP && hasDAA && hasROI;
    }
}

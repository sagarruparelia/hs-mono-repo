package com.example.demo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a member that the logged-in user has access to support.
 * Contains member identification and basic info from PSN.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupportedMember {
    /**
     * Unique Employee ID (EID) of the supported member
     */
    private String eid;

    /**
     * First name of the supported member
     */
    private String firstName;

    /**
     * Last name of the supported member
     */
    private String lastName;

    /**
     * Date of birth in ISO 8601 format (YYYY-MM-DD)
     */
    private String dateOfBirth;

    /**
     * Relationship to the logged-in user (e.g., "self", "dependent", "spouse")
     */
    private String relationship;

    /**
     * Access level for this member (e.g., "full", "limited", "view-only")
     */
    private String accessLevel;

    /**
     * Persona types associated with this relationship (e.g., ["RRP", "DAA", "ROI"])
     */
    private java.util.List<String> personas;

    /**
     * Whether this relationship grants digital account access (RRP + DAA)
     */
    private Boolean hasDigitalAccountAccess;

    /**
     * Whether this relationship grants sensitive data access (RRP + DAA + ROI)
     */
    private Boolean hasSensitiveDataAccess;
}

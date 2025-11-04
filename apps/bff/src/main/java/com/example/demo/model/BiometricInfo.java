package com.example.demo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Biometric and demographic information from US (User Service)
 * Used to determine age-based access and persona attributes
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BiometricInfo {
    /**
     * Member's HSID (unique identifier in US)
     */
    private String hsid;

    /**
     * Date of birth in ISO 8601 format (YYYY-MM-DD)
     */
    private String dateOfBirth;

    /**
     * Calculated age in years
     */
    private Integer age;

    /**
     * Whether member is under 18
     */
    private Boolean isMinor;

    /**
     * Member's first name
     */
    private String firstName;

    /**
     * Member's last name
     */
    private String lastName;

    /**
     * Persona attribute - "PR" indicates potential representative
     * Only present if member is 18+ and eligible to represent others
     */
    private String persona;

    /**
     * Whether member has PR (Personal Representative) persona
     */
    private Boolean hasPersonaRepresentative;

    /**
     * Timestamp when this info was retrieved (ISO 8601)
     */
    private String retrievedAt;

    /**
     * Cache expiration time in seconds
     */
    private Long expiresIn;
}

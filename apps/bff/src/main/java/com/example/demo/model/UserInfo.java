package com.example.demo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;

/**
 * User Information Model
 *
 * Contains user details extracted from ID token and userinfo endpoint.
 * Stored in Redis session and returned to frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserInfo implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * User's unique identifier (sub claim from ID token)
     */
    private String id;

    /**
     * User's email address
     */
    private String email;

    /**
     * User's full name
     */
    private String name;

    /**
     * User's given name (first name)
     */
    private String givenName;

    /**
     * User's family name (last name)
     */
    private String familyName;

    /**
     * User's profile picture URL
     */
    private String picture;

    /**
     * User's roles/groups
     */
    private List<String> roles;

    /**
     * User's permissions (optional)
     */
    private List<String> permissions;

    /**
     * Whether email is verified
     */
    private Boolean emailVerified;

    /**
     * User's locale
     */
    private String locale;

    /**
     * Additional custom claims from ID token
     */
    private java.util.Map<String, Object> customClaims;
}

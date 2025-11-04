package com.example.demo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response containing access level information for the logged-in member.
 * Includes the member's own access and list of people they can support.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccessLevelResponse {
    /**
     * The logged-in member's own EID
     */
    private String memberEid;

    /**
     * ID type of the logged-in member (e.g., "HSID", "OHID", "MSID")
     */
    private String memberIdType;

    /**
     * ID value of the logged-in member
     */
    private String memberIdValue;

    /**
     * Whether the member can view their own data
     */
    private Boolean canViewOwnData;

    /**
     * List of members this user has access to support
     */
    private List<SupportedMember> supportedMembers;

    /**
     * Timestamp when this access level was retrieved (ISO 8601)
     */
    private String retrievedAt;

    /**
     * Cache expiration time in seconds (how long this data is valid)
     */
    private Long expiresIn;
}

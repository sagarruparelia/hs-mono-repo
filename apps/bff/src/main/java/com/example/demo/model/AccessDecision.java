package com.example.demo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Final access decision for web-cl
 * Determines what data the member can view
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccessDecision {
    /**
     * Application type for access control
     */
    public enum ApplicationType {
        /**
         * web-cl: Consumer/member portal
         * Rule: Can view own data OR others' data (mutually exclusive)
         */
        WEB_CL,

        /**
         * web-hs: Health system portal
         * Rule: Always can view own data + conditionally others' data
         */
        WEB_HS
    }

    /**
     * Access mode for the application
     */
    public enum AccessMode {
        /**
         * web-cl: Member is under 18 - can only view their own data
         * web-hs: Member is under 18 - can only view their own data
         */
        SELF_ONLY_MINOR,

        /**
         * web-cl: Member is 18+ but has no PR persona or no supported members
         * Can only view their own data
         * web-hs: Member is 18+ but has no PR persona or no supported members
         * Can only view their own data
         */
        SELF_ONLY_ADULT,

        /**
         * web-cl: Member is 18+ with PR persona and has supported members
         * Can view data of supported members ONLY (not their own)
         * web-hs: N/A (not used)
         */
        SUPPORTING_OTHERS,

        /**
         * web-hs ONLY: Member is 18+ with PR persona and has supported members
         * Can view BOTH their own data AND supported members' data
         */
        SELF_AND_OTHERS,

        /**
         * Access denied
         */
        NO_ACCESS
    }

    /**
     * Application type this decision is for
     */
    private ApplicationType applicationType;

    /**
     * The access mode determined for this member
     */
    private AccessMode accessMode;

    /**
     * Biometric information from US
     */
    private BiometricInfo biometricInfo;

    /**
     * Access level information from PSN (null if not applicable)
     */
    private AccessLevelResponse accessLevel;

    /**
     * Whether member can view their own data
     * TRUE for SELF_ONLY_MINOR and SELF_ONLY_ADULT
     * FALSE for SUPPORTING_OTHERS
     */
    private Boolean canViewOwnData;

    /**
     * Whether member can view data of others
     * TRUE only for SUPPORTING_OTHERS
     */
    private Boolean canViewOthersData;

    /**
     * List of members this user can view
     * For SELF_ONLY: Contains only self
     * For SUPPORTING_OTHERS: Contains supported members (not self)
     */
    private java.util.List<SupportedMember> viewableMembers;

    /**
     * Explanation of access decision (for debugging)
     */
    private String decisionReason;

    /**
     * Timestamp when this decision was made
     */
    private String decidedAt;
}

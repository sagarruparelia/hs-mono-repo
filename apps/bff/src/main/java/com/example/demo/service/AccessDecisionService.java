package com.example.demo.service;

import com.example.demo.model.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Access Decision Service
 *
 * Implements the complex access determination logic for web-cl:
 *
 * 1. Call US with HSID to get biometric info (DOB, age, persona)
 * 2. If member is under 18:
 *    - RESULT: SELF_ONLY_MINOR (can only view own data)
 *    - Do NOT call PSN
 * 3. If member is 18+ and has "PR" persona:
 *    - Call PSN to get supported members
 *    - Check persona types on relationships (RRP, DAA, ROI)
 *    - Filter to only relationships with RRP + DAA (digital account access)
 *    - RESULT: SUPPORTING_OTHERS (can view others' data, NOT own)
 * 4. If member is 18+ but NO "PR" persona:
 *    - RESULT: SELF_ONLY_ADULT (can only view own data)
 *    - Do NOT call PSN
 */
@Slf4j
@Service
public class AccessDecisionService {

    private final USService usService;
    private final PSNService psnService;

    public AccessDecisionService(USService usService, PSNService psnService) {
        this.usService = usService;
        this.psnService = psnService;
    }

    /**
     * Determine access level for specified application
     *
     * @param hsid Member's HSID from IDP claims
     * @param applicationType Type of application (WEB_CL or WEB_HS)
     * @return Mono of complete access decision with viewable members
     */
    public Mono<AccessDecision> determineAccess(String hsid, AccessDecision.ApplicationType applicationType) {
        log.info("Determining access for HSID: {} in application: {}", hsid, applicationType);

        // Step 1: Call US to get biometric info
        return usService.getBiometricInfo(hsid)
                .flatMap(biometricInfo -> {
                    // Step 2: Check if member is under 18
                    if (Boolean.TRUE.equals(biometricInfo.getIsMinor())) {
                        log.info("Member is under 18. Access: SELF_ONLY_MINOR");
                        return Mono.just(createSelfOnlyMinorDecision(biometricInfo, applicationType));
                    }

                    // Step 3: Check if member has PR persona
                    if (!Boolean.TRUE.equals(biometricInfo.getHasPersonaRepresentative())) {
                        log.info("Member is 18+ but has no PR persona. Access: SELF_ONLY_ADULT");
                        return Mono.just(createSelfOnlyAdultDecision(biometricInfo, applicationType));
                    }

                    // Step 4: Member is 18+ with PR - call PSN for supported members
                    log.info("Member is 18+ with PR persona. Checking PSN for supported members.");

                    return psnService.getAccessLevel("HSID", hsid)
                            .map(accessLevel -> {
                                // Step 5: Filter supported members by persona (must have RRP + DAA)
                                List<SupportedMember> eligibleMembers = filterByPersona(accessLevel.getSupportedMembers());

                                if (eligibleMembers.isEmpty()) {
                                    log.info("Member has PR but no eligible supported members (RRP+DAA). Access: SELF_ONLY_ADULT");
                                    return createSelfOnlyAdultDecision(biometricInfo, applicationType, "No supported members with RRP+DAA");
                                }

                                // Step 6: Decision based on application type
                                if (applicationType == AccessDecision.ApplicationType.WEB_CL) {
                                    // web-cl: Member can support others - CANNOT view own data
                                    log.info("web-cl: Member has PR and {} eligible supported members. Access: SUPPORTING_OTHERS", eligibleMembers.size());
                                    return createSupportingOthersDecision(biometricInfo, accessLevel, eligibleMembers);
                                } else {
                                    // web-hs: Member can view BOTH own data AND supported members
                                    log.info("web-hs: Member has PR and {} eligible supported members. Access: SELF_AND_OTHERS", eligibleMembers.size());
                                    return createSelfAndOthersDecision(biometricInfo, accessLevel, eligibleMembers);
                                }
                            })
                            .onErrorResume(e -> {
                                log.error("Failed to fetch access level from PSN", e);
                                // If PSN fails for PR member, default to SELF_ONLY_ADULT
                                return Mono.just(createSelfOnlyAdultDecision(biometricInfo, applicationType, "PSN fetch failed: " + e.getMessage()));
                            });
                })
                .onErrorResume(e -> {
                    log.error("Failed to fetch biometric info from US", e);
                    return Mono.just(createNoAccessDecision("US biometric fetch failed: " + e.getMessage()));
                });
    }

    /**
     * Filter supported members to only those with RRP + DAA
     * RRP or DAA alone has no effect on web-cl
     */
    private List<SupportedMember> filterByPersona(List<SupportedMember> supportedMembers) {
        if (supportedMembers == null) {
            return new ArrayList<>();
        }

        return supportedMembers.stream()
                .filter(member -> {
                    List<String> personas = member.getPersonas();
                    if (personas == null || personas.isEmpty()) {
                        return false;
                    }

                    boolean hasRRP = personas.stream().anyMatch(p -> "RRP".equalsIgnoreCase(p));
                    boolean hasDAA = personas.stream().anyMatch(p -> "DAA".equalsIgnoreCase(p));
                    boolean hasROI = personas.stream().anyMatch(p -> "ROI".equalsIgnoreCase(p));

                    // Must have both RRP and DAA
                    boolean eligible = hasRRP && hasDAA;

                    // Set access flags
                    member.setHasDigitalAccountAccess(eligible);
                    member.setHasSensitiveDataAccess(eligible && hasROI);

                    log.debug("Member {}: RRP={}, DAA={}, ROI={}, Eligible={}",
                            member.getEid(), hasRRP, hasDAA, hasROI, eligible);

                    return eligible;
                })
                .collect(Collectors.toList());
    }

    /**
     * Create SELF_ONLY_MINOR decision
     */
    private AccessDecision createSelfOnlyMinorDecision(BiometricInfo biometricInfo, AccessDecision.ApplicationType applicationType) {
        // Create self member entry
        SupportedMember selfMember = SupportedMember.builder()
                .eid(biometricInfo.getHsid()) // Use HSID as EID for self
                .firstName(biometricInfo.getFirstName())
                .lastName(biometricInfo.getLastName())
                .dateOfBirth(biometricInfo.getDateOfBirth())
                .relationship("self")
                .accessLevel("full")
                .personas(new ArrayList<>())
                .hasDigitalAccountAccess(false)
                .hasSensitiveDataAccess(false)
                .build();

        return AccessDecision.builder()
                .applicationType(applicationType)
                .accessMode(AccessDecision.AccessMode.SELF_ONLY_MINOR)
                .biometricInfo(biometricInfo)
                .accessLevel(null) // No PSN call for minors
                .canViewOwnData(true)
                .canViewOthersData(false)
                .viewableMembers(List.of(selfMember))
                .decisionReason("Member is under 18 years old")
                .decidedAt(Instant.now().toString())
                .build();
    }

    /**
     * Create SELF_ONLY_ADULT decision
     */
    private AccessDecision createSelfOnlyAdultDecision(BiometricInfo biometricInfo, AccessDecision.ApplicationType applicationType) {
        return createSelfOnlyAdultDecision(biometricInfo, applicationType, "Member is 18+ but has no PR persona");
    }

    private AccessDecision createSelfOnlyAdultDecision(BiometricInfo biometricInfo, AccessDecision.ApplicationType applicationType, String reason) {
        // Create self member entry
        SupportedMember selfMember = SupportedMember.builder()
                .eid(biometricInfo.getHsid())
                .firstName(biometricInfo.getFirstName())
                .lastName(biometricInfo.getLastName())
                .dateOfBirth(biometricInfo.getDateOfBirth())
                .relationship("self")
                .accessLevel("full")
                .personas(new ArrayList<>())
                .hasDigitalAccountAccess(false)
                .hasSensitiveDataAccess(false)
                .build();

        return AccessDecision.builder()
                .applicationType(applicationType)
                .accessMode(AccessDecision.AccessMode.SELF_ONLY_ADULT)
                .biometricInfo(biometricInfo)
                .accessLevel(null) // PSN may or may not have been called
                .canViewOwnData(true)
                .canViewOthersData(false)
                .viewableMembers(List.of(selfMember))
                .decisionReason(reason)
                .decidedAt(Instant.now().toString())
                .build();
    }

    /**
     * Create SUPPORTING_OTHERS decision (web-cl only)
     * Member can view others' data but NOT their own
     */
    private AccessDecision createSupportingOthersDecision(
            BiometricInfo biometricInfo,
            AccessLevelResponse accessLevel,
            List<SupportedMember> eligibleMembers
    ) {
        return AccessDecision.builder()
                .applicationType(AccessDecision.ApplicationType.WEB_CL)
                .accessMode(AccessDecision.AccessMode.SUPPORTING_OTHERS)
                .biometricInfo(biometricInfo)
                .accessLevel(accessLevel)
                .canViewOwnData(false) // CANNOT view own data in web-cl
                .canViewOthersData(true)
                .viewableMembers(eligibleMembers) // Only eligible supported members
                .decisionReason(String.format(
                        "web-cl: Member has PR persona and %d supported members with RRP+DAA",
                        eligibleMembers.size()
                ))
                .decidedAt(Instant.now().toString())
                .build();
    }

    /**
     * Create SELF_AND_OTHERS decision (web-hs only)
     * Member can view BOTH their own data AND others' data
     */
    private AccessDecision createSelfAndOthersDecision(
            BiometricInfo biometricInfo,
            AccessLevelResponse accessLevel,
            List<SupportedMember> eligibleMembers
    ) {
        // Create self member entry
        SupportedMember selfMember = SupportedMember.builder()
                .eid(biometricInfo.getHsid())
                .firstName(biometricInfo.getFirstName())
                .lastName(biometricInfo.getLastName())
                .dateOfBirth(biometricInfo.getDateOfBirth())
                .relationship("self")
                .accessLevel("full")
                .personas(new ArrayList<>())
                .hasDigitalAccountAccess(false)
                .hasSensitiveDataAccess(false)
                .build();

        // Combine self + eligible supported members
        List<SupportedMember> allViewableMembers = new ArrayList<>();
        allViewableMembers.add(selfMember); // Self is FIRST
        allViewableMembers.addAll(eligibleMembers); // Then supported members

        return AccessDecision.builder()
                .applicationType(AccessDecision.ApplicationType.WEB_HS)
                .accessMode(AccessDecision.AccessMode.SELF_AND_OTHERS)
                .biometricInfo(biometricInfo)
                .accessLevel(accessLevel)
                .canViewOwnData(true) // CAN view own data in web-hs
                .canViewOthersData(true)
                .viewableMembers(allViewableMembers) // Self + supported members
                .decisionReason(String.format(
                        "web-hs: Member has PR persona and %d supported members with RRP+DAA",
                        eligibleMembers.size()
                ))
                .decidedAt(Instant.now().toString())
                .build();
    }

    /**
     * Create NO_ACCESS decision (fallback for errors)
     */
    private AccessDecision createNoAccessDecision(String reason) {
        return AccessDecision.builder()
                .accessMode(AccessDecision.AccessMode.NO_ACCESS)
                .biometricInfo(null)
                .accessLevel(null)
                .canViewOwnData(false)
                .canViewOthersData(false)
                .viewableMembers(new ArrayList<>())
                .decisionReason(reason)
                .decidedAt(Instant.now().toString())
                .build();
    }
}

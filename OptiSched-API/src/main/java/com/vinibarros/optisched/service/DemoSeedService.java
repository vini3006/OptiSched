package com.vinibarros.optisched.service;

import org.springframework.stereotype.Service;

/**
 * Populates a freshly created demo Institution with example data so a
 * landing-page visitor lands in a product that already looks used, instead
 * of an empty shell. Stubbed for Fase 1 (endpoint + claim plumbing) —
 * real seeding lands in Fase 2 (see docs/demo-sandbox-plan.md).
 */
@Service
public class DemoSeedService {

    public void seedUniversity(Long institutionId) {
        // TODO(Fase 2): courses/subjects/professors/classrooms/time slots/semester.
    }

    public void seedSchool(Long institutionId) {
        // TODO(Fase 2): series/turmas/serie-subjects/professors/classrooms/time slots.
    }
}

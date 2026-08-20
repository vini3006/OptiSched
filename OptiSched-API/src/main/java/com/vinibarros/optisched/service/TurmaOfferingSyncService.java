package com.vinibarros.optisched.service;

import com.vinibarros.optisched.entity.Semester;
import com.vinibarros.optisched.entity.SerieSubject;
import com.vinibarros.optisched.entity.SubjectOffering;
import com.vinibarros.optisched.entity.Turma;
import com.vinibarros.optisched.repository.ScheduleEntryRepository;
import com.vinibarros.optisched.repository.SubjectOfferingRepository;
import com.vinibarros.optisched.repository.TurmaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Replaces the old manual "Ofertas de Turma" CRUD: materializes
 * {@link SubjectOffering} (turma-mode) rows from each Turma's Serie
 * curriculum, called right before a SCHOOL-mode schedule generation reads
 * offerings for a semester. The admin never manages these rows directly.
 */
@Service
public class TurmaOfferingSyncService {

    private final TurmaRepository turmaRepository;
    private final SubjectOfferingRepository subjectOfferingRepository;
    private final ScheduleEntryRepository scheduleEntryRepository;

    public TurmaOfferingSyncService(TurmaRepository turmaRepository, SubjectOfferingRepository subjectOfferingRepository, ScheduleEntryRepository scheduleEntryRepository) {
        this.turmaRepository = turmaRepository;
        this.subjectOfferingRepository = subjectOfferingRepository;
        this.scheduleEntryRepository = scheduleEntryRepository;
    }

    @Transactional
    public void syncOfferings(Long institutionId, Semester semester) {
        List<Turma> turmas = turmaRepository.findAllByInstitutionIdAndYear(institutionId, semester.getYear());

        for (Turma turma : turmas) {
            Set<Long> curriculumSubjectIds = new HashSet<>();

            for (SerieSubject serieSubject : turma.getSerie().getCurriculum()) {
                curriculumSubjectIds.add(serieSubject.getSubject().getId());

                SubjectOffering offering = subjectOfferingRepository
                        .findByTurmaIdAndSubjectIdAndSemesterId(turma.getId(), serieSubject.getSubject().getId(), semester.getId())
                        .orElseGet(SubjectOffering::new);

                offering.setTurma(turma);
                offering.setSubject(serieSubject.getSubject());
                offering.setSemester(semester);
                offering.setExpectedStudents(turma.getExpectedStudents());
                offering.setWeeklyWorkload(serieSubject.getWeeklyWorkload());
                offering.setInstitution(turma.getInstitution());

                subjectOfferingRepository.save(offering);
            }

            subjectOfferingRepository.findByTurmaId(turma.getId()).stream()
                    .filter(o -> o.getSemester().getId().equals(semester.getId()))
                    .filter(o -> !curriculumSubjectIds.contains(o.getSubject().getId()))
                    .filter(o -> !scheduleEntryRepository.existsBySubjectOfferingId(o.getId()))
                    .forEach(subjectOfferingRepository::delete);
        }
    }
}

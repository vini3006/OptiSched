package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.request.*;
import com.vinibarros.optisched.dto.response.*;
import com.vinibarros.optisched.enums.PreferredShift;
import com.vinibarros.optisched.enums.RoomType;
import com.vinibarros.optisched.enums.Term;
import com.vinibarros.optisched.repository.ProfessorRepository;

import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Populates a freshly created demo Institution with a small, deliberately
 * hand-sized dataset (not CSV) so a landing-page visitor lands in a product
 * that already looks used. Reuses each domain service's own create(...) —
 * the exact same validation/uniqueness rules a real Admin would hit.
 *
 * Deliberately NOT @Transactional at the seedUniversity/seedSchool level,
 * same spirit as the CSV importers (UserService.importProfessorsFromCsv
 * etc.): each individual create(...) call below is already @Transactional
 * on its own service, so one bad row commits everything before it instead
 * of rolling back an institution that already has a working ADMIN. Callers
 * must NOT wrap these methods in their own @Transactional either, or every
 * insert collapses back into one all-or-nothing transaction — see
 * DemoService.createDemoInstitution, which calls this outside its own
 * (institution + admin only) transactional boundary.
 */
@Service
public class DemoSeedService {

    private static final int PROFESSOR_COUNT = 4;
    private static final DayOfWeek[] WEEKDAYS = {
            DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY
    };
    private static final LocalTime MORNING_START = LocalTime.of(8, 0);
    private static final int PERIODS_PER_DAY = 4;
    private static final int PERIOD_MINUTES = 50;

    private final SemesterService semesterService;
    private final SubjectService subjectService;
    private final CourseService courseService;
    private final SubjectOfferingService subjectOfferingService;
    private final SerieService serieService;
    private final TurmaService turmaService;
    private final SerieSubjectService serieSubjectService;
    private final ClassroomService classroomService;
    private final TimeSlotService timeSlotService;
    private final UserService userService;
    private final ProfessorRepository professorRepository;
    private final ProfessorQualificationService professorQualificationService;
    private final AvailabilityService availabilityService;

    public DemoSeedService(
            SemesterService semesterService,
            SubjectService subjectService,
            CourseService courseService,
            SubjectOfferingService subjectOfferingService,
            SerieService serieService,
            TurmaService turmaService,
            SerieSubjectService serieSubjectService,
            ClassroomService classroomService,
            TimeSlotService timeSlotService,
            UserService userService,
            ProfessorRepository professorRepository,
            ProfessorQualificationService professorQualificationService,
            AvailabilityService availabilityService
    ) {
        this.semesterService = semesterService;
        this.subjectService = subjectService;
        this.courseService = courseService;
        this.subjectOfferingService = subjectOfferingService;
        this.serieService = serieService;
        this.turmaService = turmaService;
        this.serieSubjectService = serieSubjectService;
        this.classroomService = classroomService;
        this.timeSlotService = timeSlotService;
        this.userService = userService;
        this.professorRepository = professorRepository;
        this.professorQualificationService = professorQualificationService;
        this.availabilityService = availabilityService;
    }

    public void seedUniversity(Long institutionId) {
        Long semesterId = seedCurrentSemester(institutionId);
        List<Long> subjectIds = seedSubjects(institutionId, List.of(
                new SubjectSeed("ALG101", "Algoritmos e Estrutura de Dados", 60, RoomType.LABORATORY),
                new SubjectSeed("BD101", "Banco de Dados", 60, RoomType.LABORATORY),
                new SubjectSeed("CAL101", "Cálculo I", 80, RoomType.COMMON),
                new SubjectSeed("ENG101", "Engenharia de Software", 60, RoomType.COMMON),
                new SubjectSeed("RED101", "Redes de Computadores", 40, RoomType.LABORATORY),
                new SubjectSeed("SO101", "Sistemas Operacionais", 60, RoomType.COMMON)
        ));
        seedClassrooms(institutionId);
        List<Long> timeSlotIds = seedMorningTimeSlots(institutionId);
        seedProfessors(institutionId, subjectIds, timeSlotIds);

        Long course1 = courseService.create(
                new CourseRequest("Ciência da Computação", 8, PreferredShift.MORNING), institutionId).id();
        Long course2 = courseService.create(
                new CourseRequest("Administração", 8, PreferredShift.MORNING), institutionId).id();

        createOffering(course1, subjectIds.get(0), semesterId, institutionId);
        createOffering(course1, subjectIds.get(1), semesterId, institutionId);
        createOffering(course2, subjectIds.get(2), semesterId, institutionId);
        createOffering(course2, subjectIds.get(3), semesterId, institutionId);
    }

    public void seedSchool(Long institutionId) {
        seedCurrentSemester(institutionId);
        List<Long> subjectIds = seedSubjects(institutionId, List.of(
                new SubjectSeed("MAT101", "Matemática", 40, RoomType.COMMON),
                new SubjectSeed("POR101", "Português", 40, RoomType.COMMON),
                new SubjectSeed("HIS101", "História", 30, RoomType.COMMON),
                new SubjectSeed("GEO101", "Geografia", 30, RoomType.COMMON),
                new SubjectSeed("CIE101", "Ciências", 30, RoomType.LABORATORY),
                new SubjectSeed("EDF101", "Educação Física", 20, RoomType.COMMON)
        ));
        seedClassrooms(institutionId);
        List<Long> timeSlotIds = seedMorningTimeSlots(institutionId);
        seedProfessors(institutionId, subjectIds, timeSlotIds);

        int year = LocalDate.now().getYear();
        Long serie1 = serieService.create(new SerieRequest("1º Ano", 1), institutionId).id();
        Long serie2 = serieService.create(new SerieRequest("2º Ano", 2), institutionId).id();

        for (Long subjectId : subjectIds.subList(0, 3)) {
            serieSubjectService.create(new SerieSubjectRequest(serie1, subjectId, 4), institutionId);
        }
        for (Long subjectId : subjectIds.subList(3, 6)) {
            serieSubjectService.create(new SerieSubjectRequest(serie2, subjectId, 4), institutionId);
        }

        turmaService.create(new TurmaRequest("1º Ano A", PreferredShift.MORNING, 30, serie1, year), institutionId);
        turmaService.create(new TurmaRequest("1º Ano B", PreferredShift.MORNING, 30, serie1, year), institutionId);
        turmaService.create(new TurmaRequest("2º Ano A", PreferredShift.MORNING, 30, serie2, year), institutionId);
    }

    private Long seedCurrentSemester(Long institutionId) {
        int year = LocalDate.now().getYear();
        Term term = LocalDate.now().getMonthValue() <= 6 ? Term.FIRST : Term.SECOND;
        SemesterResponse semester = semesterService.create(new SemesterRequest(year, term, null, null), institutionId);
        return semester.id();
    }

    private record SubjectSeed(String code, String name, int workload, RoomType roomType) {
    }

    private List<Long> seedSubjects(Long institutionId, List<SubjectSeed> defs) {
        List<Long> ids = new ArrayList<>();
        for (SubjectSeed def : defs) {
            SubjectResponse subject = subjectService.create(
                    new SubjectRequest(def.code(), def.name(), def.workload(), def.roomType()), institutionId);
            ids.add(subject.id());
        }
        return ids;
    }

    private void seedClassrooms(Long institutionId) {
        classroomService.create(new ClassroomRequest("101", 40, RoomType.COMMON, "Bloco A"), institutionId);
        classroomService.create(new ClassroomRequest("102", 35, RoomType.COMMON, "Bloco A"), institutionId);
        // Capacity must cover the largest expectedStudents used by any
        // LABORATORY-requiring offering below (university offerings use 35)
        // — a smaller lab makes the solver correctly reject the seed as
        // infeasible, caught only by actually generating a schedule live,
        // not by the row-count-only seed tests.
        classroomService.create(new ClassroomRequest("201", 40, RoomType.LABORATORY, "Bloco B"), institutionId);
    }

    /**
     * 4 periods x 5 weekdays = 20 slots, all sharing the exact same
     * start/end pair across every day (only the dayOfWeek differs) — the
     * time-range overlap check in TimeSlotRepository.existsOverlappingTimeSlot
     * ignores dayOfWeek entirely and only exempts an exact (start,end) match,
     * so per-day-distinct ranges for the "same period" would collide.
     */
    private List<Long> seedMorningTimeSlots(Long institutionId) {
        List<Long> ids = new ArrayList<>();
        for (DayOfWeek day : WEEKDAYS) {
            LocalTime start = MORNING_START;
            for (int period = 0; period < PERIODS_PER_DAY; period++) {
                LocalTime end = start.plusMinutes(PERIOD_MINUTES);
                TimeSlotResponse slot = timeSlotService.create(new TimeSlotRequest(day, start, end), institutionId);
                ids.add(slot.id());
                start = end;
            }
        }
        return ids;
    }

    /**
     * 4 professors, qualifications spread so every seeded subject has at
     * least one qualified professor (the 4th professor overlaps with the
     * first three for scheduling flexibility). Each professor is available
     * on 4 of the 5 weekdays (the 5th, rotating by professor index, is their
     * day off) — covering most, not all, of the generated time slots.
     */
    private void seedProfessors(Long institutionId, List<Long> subjectIds, List<Long> timeSlotIds) {
        int slotsPerDay = PERIODS_PER_DAY;
        List<List<Long>> qualificationGroups = List.of(
                List.of(subjectIds.get(0), subjectIds.get(1)),
                List.of(subjectIds.get(2), subjectIds.get(3)),
                List.of(subjectIds.get(4), subjectIds.get(5)),
                List.of(subjectIds.get(0), subjectIds.get(2), subjectIds.get(4))
        );

        for (int i = 0; i < PROFESSOR_COUNT; i++) {
            String suffix = UUID.randomUUID().toString().substring(0, 8);
            UserResponse user = userService.createProfessor(
                    new UserRequest("Professor Demo " + (i + 1), "demo-professor" + (i + 1) + "-" + suffix + "@optisched.local", UUID.randomUUID().toString()),
                    institutionId
            );
            Long professorId = professorRepository.findByUserId(user.id()).orElseThrow().getId();

            for (Long subjectId : qualificationGroups.get(i)) {
                professorQualificationService.create(new ProfessorQualificationRequest(professorId, subjectId), institutionId);
            }

            int dayOffIndex = i % WEEKDAYS.length;
            for (int slotIndex = 0; slotIndex < timeSlotIds.size(); slotIndex++) {
                int dayIndex = slotIndex / slotsPerDay;
                if (dayIndex == dayOffIndex) {
                    continue;
                }
                availabilityService.create(new AvailabilityRequest(professorId, timeSlotIds.get(slotIndex)), institutionId);
            }
        }
    }

    private void createOffering(Long courseId, Long subjectId, Long semesterId, Long institutionId) {
        subjectOfferingService.create(
                new SubjectOfferingRequest(courseId, subjectId, semesterId, "A", 35, 1), institutionId);
    }
}

package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.request.ScheduleEntryRequest;
import com.vinibarros.optisched.dto.response.ScheduleEntryResponse;
import com.vinibarros.optisched.email.EmailSender;
import com.vinibarros.optisched.entity.*;
import com.vinibarros.optisched.enums.RoomType;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.InvalidScheduleEntryException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.ScheduleEntryMapper;
import com.vinibarros.optisched.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ScheduleEntryServiceTest {

    private static final Long INSTITUTION_ID = 15L;

    @Mock private ScheduleEntryRepository scheduleEntryRepository;
    @Mock private ScheduleRepository scheduleRepository;
    @Mock private ProfessorRepository professorRepository;
    @Mock private ClassroomRepository classroomRepository;
    @Mock private TimeSlotRepository timeSlotRepository;
    @Mock private AvailabilityRepository availabilityRepository;
    @Mock private ProfessorQualificationRepository professorQualificationRepository;
    @Mock private EmailSender emailSender;

    private ScheduleEntryService service;

    @BeforeEach
    void setUp() {
        service = new ScheduleEntryService(
                scheduleEntryRepository, scheduleRepository, professorRepository, classroomRepository,
                timeSlotRepository, availabilityRepository, professorQualificationRepository,
                new ScheduleEntryMapper(), emailSender
        );
    }

    private Institution institution() {
        Institution institution = new Institution();
        institution.setId(INSTITUTION_ID);
        return institution;
    }

    private Subject subject(Long id) {
        return subject(id, null);
    }

    private Subject subject(Long id, RoomType requiredRoomType) {
        Subject subject = new Subject();
        subject.setId(id);
        subject.setName("Cálculo I");
        subject.setCode("CALC1");
        subject.setWorkload(4);
        subject.setRequiredRoomType(requiredRoomType);
        return subject;
    }

    private SubjectOffering offering(Long id, Subject subject, Integer expectedStudents) {
        Course course = new Course();
        course.setId(1L);
        course.setName("Engenharia de Computação");

        SubjectOffering offering = new SubjectOffering();
        offering.setId(id);
        offering.setSubject(subject);
        offering.setCourse(course);
        offering.setExpectedStudents(expectedStudents);
        offering.setSection("A");
        return offering;
    }

    private Professor professor(Long id, String name) {
        Professor professor = new Professor();
        professor.setId(id);
        professor.setName(name);
        return professor;
    }

    private Professor professorWithUser(Long id, String name, String email) {
        Professor professor = professor(id, name);
        User user = new User();
        user.setEmail(email);
        professor.setUser(user);
        return professor;
    }

    private Classroom classroom(Long id, String number, Integer capacity) {
        return classroom(id, number, capacity, RoomType.COMMON);
    }

    private Classroom classroom(Long id, String number, Integer capacity, RoomType type) {
        Classroom classroom = new Classroom();
        classroom.setId(id);
        classroom.setNumber(number);
        classroom.setCapacity(capacity);
        classroom.setType(type);
        return classroom;
    }

    private TimeSlot timeSlot(Long id, DayOfWeek day, int startHour) {
        TimeSlot timeSlot = new TimeSlot();
        timeSlot.setId(id);
        timeSlot.setDayOfWeek(day);
        timeSlot.setStartTime(LocalTime.of(startHour, 0));
        timeSlot.setEndTime(LocalTime.of(startHour + 1, 0));
        return timeSlot;
    }

    private Schedule schedule(Long id) {
        Schedule schedule = new Schedule();
        schedule.setId(id);
        schedule.setInstitution(institution());
        return schedule;
    }

    private ScheduleEntry entry(Long id, Schedule schedule, SubjectOffering offering, Professor professor, Classroom classroom, TimeSlot timeSlot) {
        ScheduleEntry entry = new ScheduleEntry();
        entry.setId(id);
        entry.setSchedule(schedule);
        entry.setSubjectOffering(offering);
        entry.setProfessor(professor);
        entry.setClassroom(classroom);
        entry.setTimeSlot(timeSlot);
        entry.setInstitution(institution());
        return entry;
    }

    // -------------------- update --------------------

    @Test
    void update_happyPath_updatesProfessorClassroomAndTimeSlot() {
        Subject subject = subject(1L);
        SubjectOffering offering = offering(10L, subject, 30);
        Professor oldProfessor = professor(1L, "Ana");
        Professor newProfessor = professor(2L, "Bruno");
        Classroom classroom = classroom(100L, "A-1", 40);
        TimeSlot oldSlot = timeSlot(1000L, DayOfWeek.MONDAY, 8);
        TimeSlot newSlot = timeSlot(1001L, DayOfWeek.MONDAY, 9);
        Schedule schedule = schedule(500L);
        ScheduleEntry entry = entry(1L, schedule, offering, oldProfessor, classroom, oldSlot);

        when(scheduleEntryRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(entry));
        when(professorRepository.findByIdAndInstitutionId(2L, INSTITUTION_ID)).thenReturn(Optional.of(newProfessor));
        when(classroomRepository.findByIdAndInstitutionId(100L, INSTITUTION_ID)).thenReturn(Optional.of(classroom));
        when(timeSlotRepository.findByIdAndInstitutionId(1001L, INSTITUTION_ID)).thenReturn(Optional.of(newSlot));
        when(professorQualificationRepository.existsByIdAndInstitutionId(any(), eq(INSTITUTION_ID))).thenReturn(true);
        when(availabilityRepository.existsByIdAndInstitutionId(any(), eq(INSTITUTION_ID))).thenReturn(true);
        when(scheduleEntryRepository.save(any(ScheduleEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        ScheduleEntryResponse response = service.update(1L, new ScheduleEntryRequest(2L, 100L, 1001L), INSTITUTION_ID);

        assertThat(response.professorId()).isEqualTo(2L);
        assertThat(response.timeSlotId()).isEqualTo(1001L);
    }

    @Test
    void update_professorNotQualified_throwsInvalidScheduleEntry() {
        Subject subject = subject(1L);
        SubjectOffering offering = offering(10L, subject, 30);
        Professor professor = professor(1L, "Ana");
        Classroom classroom = classroom(100L, "A-1", 40);
        TimeSlot slot = timeSlot(1000L, DayOfWeek.MONDAY, 8);
        ScheduleEntry entry = entry(1L, schedule(500L), offering, professor, classroom, slot);

        when(scheduleEntryRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(entry));
        when(professorRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(professor));
        when(classroomRepository.findByIdAndInstitutionId(100L, INSTITUTION_ID)).thenReturn(Optional.of(classroom));
        when(timeSlotRepository.findByIdAndInstitutionId(1000L, INSTITUTION_ID)).thenReturn(Optional.of(slot));
        when(professorQualificationRepository.existsByIdAndInstitutionId(any(), eq(INSTITUTION_ID))).thenReturn(false);

        assertThatThrownBy(() -> service.update(1L, new ScheduleEntryRequest(1L, 100L, 1000L), INSTITUTION_ID))
                .isInstanceOf(InvalidScheduleEntryException.class)
                .hasMessageContaining("not qualified");
    }

    @Test
    void update_professorNotAvailable_throwsInvalidScheduleEntry() {
        Subject subject = subject(1L);
        SubjectOffering offering = offering(10L, subject, 30);
        Professor professor = professor(1L, "Ana");
        Classroom classroom = classroom(100L, "A-1", 40);
        TimeSlot slot = timeSlot(1000L, DayOfWeek.MONDAY, 8);
        ScheduleEntry entry = entry(1L, schedule(500L), offering, professor, classroom, slot);

        when(scheduleEntryRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(entry));
        when(professorRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(professor));
        when(classroomRepository.findByIdAndInstitutionId(100L, INSTITUTION_ID)).thenReturn(Optional.of(classroom));
        when(timeSlotRepository.findByIdAndInstitutionId(1000L, INSTITUTION_ID)).thenReturn(Optional.of(slot));
        when(professorQualificationRepository.existsByIdAndInstitutionId(any(), eq(INSTITUTION_ID))).thenReturn(true);
        when(availabilityRepository.existsByIdAndInstitutionId(any(), eq(INSTITUTION_ID))).thenReturn(false);

        assertThatThrownBy(() -> service.update(1L, new ScheduleEntryRequest(1L, 100L, 1000L), INSTITUTION_ID))
                .isInstanceOf(InvalidScheduleEntryException.class)
                .hasMessageContaining("not available");
    }

    @Test
    void update_classroomTooSmall_throwsInvalidScheduleEntry() {
        Subject subject = subject(1L);
        SubjectOffering offering = offering(10L, subject, 30);
        Professor professor = professor(1L, "Ana");
        Classroom smallClassroom = classroom(100L, "A-1", 10);
        TimeSlot slot = timeSlot(1000L, DayOfWeek.MONDAY, 8);
        ScheduleEntry entry = entry(1L, schedule(500L), offering, professor, smallClassroom, slot);

        when(scheduleEntryRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(entry));
        when(professorRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(professor));
        when(classroomRepository.findByIdAndInstitutionId(100L, INSTITUTION_ID)).thenReturn(Optional.of(smallClassroom));
        when(timeSlotRepository.findByIdAndInstitutionId(1000L, INSTITUTION_ID)).thenReturn(Optional.of(slot));
        when(professorQualificationRepository.existsByIdAndInstitutionId(any(), eq(INSTITUTION_ID))).thenReturn(true);
        when(availabilityRepository.existsByIdAndInstitutionId(any(), eq(INSTITUTION_ID))).thenReturn(true);

        assertThatThrownBy(() -> service.update(1L, new ScheduleEntryRequest(1L, 100L, 1000L), INSTITUTION_ID))
                .isInstanceOf(InvalidScheduleEntryException.class)
                .hasMessageContaining("capacity");
    }

    @Test
    void update_classroomWrongRoomType_throwsInvalidScheduleEntry() {
        Subject subject = subject(1L, RoomType.LABORATORY);
        SubjectOffering offering = offering(10L, subject, 30);
        Professor professor = professor(1L, "Ana");
        Classroom commonRoom = classroom(100L, "A-1", 40, RoomType.COMMON);
        TimeSlot slot = timeSlot(1000L, DayOfWeek.MONDAY, 8);
        ScheduleEntry entry = entry(1L, schedule(500L), offering, professor, commonRoom, slot);

        when(scheduleEntryRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(entry));
        when(professorRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(professor));
        when(classroomRepository.findByIdAndInstitutionId(100L, INSTITUTION_ID)).thenReturn(Optional.of(commonRoom));
        when(timeSlotRepository.findByIdAndInstitutionId(1000L, INSTITUTION_ID)).thenReturn(Optional.of(slot));
        when(professorQualificationRepository.existsByIdAndInstitutionId(any(), eq(INSTITUTION_ID))).thenReturn(true);
        when(availabilityRepository.existsByIdAndInstitutionId(any(), eq(INSTITUTION_ID))).thenReturn(true);

        assertThatThrownBy(() -> service.update(1L, new ScheduleEntryRequest(1L, 100L, 1000L), INSTITUTION_ID))
                .isInstanceOf(InvalidScheduleEntryException.class)
                .hasMessageContaining("LABORATORY");
    }

    @Test
    void update_unknownEntry_throwsResourceNotFound() {
        when(scheduleEntryRepository.findByIdAndInstitutionId(99L, INSTITUTION_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(99L, new ScheduleEntryRequest(1L, 1L, 1L), INSTITUTION_ID))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // -------------------- delete --------------------

    @Test
    void delete_removesTheEntry() {
        ScheduleEntry entry = entry(1L, schedule(500L), offering(10L, subject(1L), 30),
                professor(1L, "Ana"), classroom(100L, "A-1", 40), timeSlot(1000L, DayOfWeek.MONDAY, 8));
        when(scheduleEntryRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(entry));

        service.delete(1L, INSTITUTION_ID);

        org.mockito.Mockito.verify(scheduleEntryRepository).delete(entry);
    }

    // -------------------- move --------------------

    @Test
    void move_noCollision_simplyRelocatesTheEntry() {
        Professor professor = professor(1L, "Ana");
        Classroom classroom = classroom(100L, "A-1", 40);
        TimeSlot oldSlot = timeSlot(1000L, DayOfWeek.MONDAY, 8);
        TimeSlot newSlot = timeSlot(1001L, DayOfWeek.MONDAY, 9);
        ScheduleEntry entry = entry(1L, schedule(500L), offering(10L, subject(1L), 30), professor, classroom, oldSlot);

        when(scheduleEntryRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(entry));
        when(timeSlotRepository.findByIdAndInstitutionId(1001L, INSTITUTION_ID)).thenReturn(Optional.of(newSlot));
        when(scheduleEntryRepository.findByScheduleIdAndTimeSlotId(500L, 1001L)).thenReturn(List.of());
        when(availabilityRepository.existsByIdAndInstitutionId(any(), eq(INSTITUTION_ID))).thenReturn(true);
        when(scheduleEntryRepository.save(any(ScheduleEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        List<ScheduleEntryResponse> result = service.move(1L, 1001L, INSTITUTION_ID);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).timeSlotId()).isEqualTo(1001L);
    }

    @Test
    void move_singleCollisionOnProfessor_swapsTheTwoEntries() {
        Professor professor = professor(1L, "Ana");
        Classroom classroomA = classroom(100L, "A-1", 40);
        Classroom classroomB = classroom(101L, "A-2", 40);
        TimeSlot slotA = timeSlot(1000L, DayOfWeek.MONDAY, 8);
        TimeSlot slotB = timeSlot(1001L, DayOfWeek.MONDAY, 9);

        ScheduleEntry entryA = entry(1L, schedule(500L), offering(10L, subject(1L), 30), professor, classroomA, slotA);
        ScheduleEntry entryB = entry(2L, schedule(500L), offering(11L, subject(2L), 30), professor, classroomB, slotB);

        when(scheduleEntryRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(entryA));
        when(timeSlotRepository.findByIdAndInstitutionId(1001L, INSTITUTION_ID)).thenReturn(Optional.of(slotB));
        when(scheduleEntryRepository.findByScheduleIdAndTimeSlotId(500L, 1001L)).thenReturn(List.of(entryB));
        when(availabilityRepository.existsByIdAndInstitutionId(any(), eq(INSTITUTION_ID))).thenReturn(true);
        when(scheduleEntryRepository.save(any(ScheduleEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        List<ScheduleEntryResponse> result = service.move(1L, 1001L, INSTITUTION_ID);

        assertThat(result).hasSize(2);
        assertThat(entryA.getTimeSlot().getId()).isEqualTo(1001L);
        assertThat(entryB.getTimeSlot().getId()).isEqualTo(1000L);
    }

    @Test
    void move_twoDifferentCollisions_throwsInvalidScheduleEntry() {
        Professor professorA = professor(1L, "Ana");
        Professor professorC = professor(3L, "Carla");
        Classroom classroomA = classroom(100L, "A-1", 40);
        Classroom classroomB = classroom(101L, "A-2", 40);
        TimeSlot slotA = timeSlot(1000L, DayOfWeek.MONDAY, 8);
        TimeSlot targetSlot = timeSlot(1001L, DayOfWeek.MONDAY, 9);

        // entryA is professorA in classroomA, moving into targetSlot.
        ScheduleEntry entryA = entry(1L, schedule(500L), offering(10L, subject(1L), 30), professorA, classroomA, slotA);
        // At targetSlot: entryB has the SAME professor (professorA) but a different classroom.
        ScheduleEntry entryB = entry(2L, schedule(500L), offering(11L, subject(2L), 30), professorA, classroomB, targetSlot);
        // Also at targetSlot: entryC has a DIFFERENT professor but the SAME classroom (classroomA) as entryA.
        ScheduleEntry entryC = entry(3L, schedule(500L), offering(12L, subject(3L), 30), professorC, classroomA, targetSlot);

        when(scheduleEntryRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(entryA));
        when(timeSlotRepository.findByIdAndInstitutionId(1001L, INSTITUTION_ID)).thenReturn(Optional.of(targetSlot));
        when(scheduleEntryRepository.findByScheduleIdAndTimeSlotId(500L, 1001L)).thenReturn(List.of(entryB, entryC));

        assertThatThrownBy(() -> service.move(1L, 1001L, INSTITUTION_ID))
                .isInstanceOf(InvalidScheduleEntryException.class)
                .hasMessageContaining("different classes");
    }

    // -------------------- notifications --------------------

    @Test
    void update_reassigningToADifferentProfessor_notifiesBothOldAndNewProfessor() {
        Subject subject = subject(1L);
        SubjectOffering offering = offering(10L, subject, 30);
        Professor oldProfessor = professorWithUser(1L, "Ana", "ana@test.com");
        Professor newProfessor = professorWithUser(2L, "Bruno", "bruno@test.com");
        Classroom classroom = classroom(100L, "A-1", 40);
        TimeSlot slot = timeSlot(1000L, DayOfWeek.MONDAY, 8);
        ScheduleEntry entry = entry(1L, schedule(500L), offering, oldProfessor, classroom, slot);

        when(scheduleEntryRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(entry));
        when(professorRepository.findByIdAndInstitutionId(2L, INSTITUTION_ID)).thenReturn(Optional.of(newProfessor));
        when(classroomRepository.findByIdAndInstitutionId(100L, INSTITUTION_ID)).thenReturn(Optional.of(classroom));
        when(timeSlotRepository.findByIdAndInstitutionId(1000L, INSTITUTION_ID)).thenReturn(Optional.of(slot));
        when(professorQualificationRepository.existsByIdAndInstitutionId(any(), eq(INSTITUTION_ID))).thenReturn(true);
        when(availabilityRepository.existsByIdAndInstitutionId(any(), eq(INSTITUTION_ID))).thenReturn(true);
        when(scheduleEntryRepository.save(any(ScheduleEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        service.update(1L, new ScheduleEntryRequest(2L, 100L, 1000L), INSTITUTION_ID);

        org.mockito.Mockito.verify(emailSender).sendScheduleChangedEmail("bruno@test.com", "Bruno");
        org.mockito.Mockito.verify(emailSender).sendScheduleChangedEmail("ana@test.com", "Ana");
    }

    @Test
    void update_professorWithoutLinkedUser_doesNotNotify() {
        Subject subject = subject(1L);
        SubjectOffering offering = offering(10L, subject, 30);
        Professor professor = professor(1L, "Ana");
        Classroom classroom = classroom(100L, "A-1", 40);
        TimeSlot slot = timeSlot(1000L, DayOfWeek.MONDAY, 8);
        ScheduleEntry entry = entry(1L, schedule(500L), offering, professor, classroom, slot);

        when(scheduleEntryRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(entry));
        when(professorRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(professor));
        when(classroomRepository.findByIdAndInstitutionId(100L, INSTITUTION_ID)).thenReturn(Optional.of(classroom));
        when(timeSlotRepository.findByIdAndInstitutionId(1000L, INSTITUTION_ID)).thenReturn(Optional.of(slot));
        when(professorQualificationRepository.existsByIdAndInstitutionId(any(), eq(INSTITUTION_ID))).thenReturn(true);
        when(availabilityRepository.existsByIdAndInstitutionId(any(), eq(INSTITUTION_ID))).thenReturn(true);
        when(scheduleEntryRepository.save(any(ScheduleEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        service.update(1L, new ScheduleEntryRequest(1L, 100L, 1000L), INSTITUTION_ID);

        org.mockito.Mockito.verify(emailSender, org.mockito.Mockito.never())
                .sendScheduleChangedEmail(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void delete_notifiesTheAffectedProfessor() {
        Professor professor = professorWithUser(1L, "Ana", "ana@test.com");
        ScheduleEntry entry = entry(1L, schedule(500L), offering(10L, subject(1L), 30),
                professor, classroom(100L, "A-1", 40), timeSlot(1000L, DayOfWeek.MONDAY, 8));
        when(scheduleEntryRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(entry));

        service.delete(1L, INSTITUTION_ID);

        org.mockito.Mockito.verify(emailSender).sendScheduleChangedEmail("ana@test.com", "Ana");
    }

    @Test
    void move_singleCollision_notifiesBothProfessorsWhenDifferent() {
        Professor professorA = professorWithUser(1L, "Ana", "ana@test.com");
        Professor professorB = professorWithUser(2L, "Bruno", "bruno@test.com");
        Classroom classroomA = classroom(100L, "A-1", 40);
        Classroom classroomB = classroom(101L, "A-2", 40);
        TimeSlot slotA = timeSlot(1000L, DayOfWeek.MONDAY, 8);
        TimeSlot slotB = timeSlot(1001L, DayOfWeek.MONDAY, 9);

        ScheduleEntry entryA = entry(1L, schedule(500L), offering(10L, subject(1L), 30), professorA, classroomA, slotA);
        ScheduleEntry entryB = entry(2L, schedule(500L), offering(11L, subject(2L), 30), professorB, classroomA, slotB);

        when(scheduleEntryRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(entryA));
        when(timeSlotRepository.findByIdAndInstitutionId(1001L, INSTITUTION_ID)).thenReturn(Optional.of(slotB));
        when(scheduleEntryRepository.findByScheduleIdAndTimeSlotId(500L, 1001L)).thenReturn(List.of(entryB));
        when(availabilityRepository.existsByIdAndInstitutionId(any(), eq(INSTITUTION_ID))).thenReturn(true);
        when(scheduleEntryRepository.save(any(ScheduleEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        service.move(1L, 1001L, INSTITUTION_ID);

        org.mockito.Mockito.verify(emailSender).sendScheduleChangedEmail("ana@test.com", "Ana");
        org.mockito.Mockito.verify(emailSender).sendScheduleChangedEmail("bruno@test.com", "Bruno");
    }

    // -------------------- toggleLocked --------------------

    @Test
    void toggleLocked_locksAnUnlockedEntry() {
        ScheduleEntry entry = entry(1L, schedule(500L), offering(10L, subject(1L), 30), professor(1L, "Ana"), classroom(100L, "A-1", 40), timeSlot(1000L, DayOfWeek.MONDAY, 8));
        entry.setLocked(false);

        when(scheduleEntryRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(entry));
        when(scheduleEntryRepository.save(any(ScheduleEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        ScheduleEntryResponse response = service.toggleLocked(1L, INSTITUTION_ID);

        assertThat(response.locked()).isTrue();
    }

    @Test
    void toggleLocked_unlocksALockedEntry() {
        ScheduleEntry entry = entry(1L, schedule(500L), offering(10L, subject(1L), 30), professor(1L, "Ana"), classroom(100L, "A-1", 40), timeSlot(1000L, DayOfWeek.MONDAY, 8));
        entry.setLocked(true);

        when(scheduleEntryRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(entry));
        when(scheduleEntryRepository.save(any(ScheduleEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        ScheduleEntryResponse response = service.toggleLocked(1L, INSTITUTION_ID);

        assertThat(response.locked()).isFalse();
    }

    @Test
    void toggleLocked_unknownEntryThrowsResourceNotFound() {
        when(scheduleEntryRepository.findByIdAndInstitutionId(99L, INSTITUTION_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.toggleLocked(99L, INSTITUTION_ID))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // -------------------- course conflict (C4) on manual edits --------------------

    @Test
    void update_rejectsMoveIntoASlotAlreadyHoldingAnotherOfferingOfTheSameCourseAndSemester() {
        SubjectOffering movingOffering = offering(10L, subject(1L), 30);
        movingOffering.setRecommendedSemester(1);
        SubjectOffering conflictingOffering = offering(11L, subject(2L), 30);
        conflictingOffering.setRecommendedSemester(1);

        Professor professor = professor(1L, "Ana");
        Classroom classroom = classroom(100L, "A-1", 40);
        TimeSlot oldSlot = timeSlot(1000L, DayOfWeek.MONDAY, 8);
        TimeSlot targetSlot = timeSlot(1001L, DayOfWeek.MONDAY, 9);
        Schedule schedule = schedule(500L);

        ScheduleEntry entry = entry(1L, schedule, movingOffering, professor, classroom, oldSlot);
        ScheduleEntry occupant = entry(2L, schedule, conflictingOffering, professor(2L, "Bruno"), classroom(101L, "A-2", 40), targetSlot);

        when(scheduleEntryRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(entry));
        when(professorRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(professor));
        when(classroomRepository.findByIdAndInstitutionId(100L, INSTITUTION_ID)).thenReturn(Optional.of(classroom));
        when(timeSlotRepository.findByIdAndInstitutionId(1001L, INSTITUTION_ID)).thenReturn(Optional.of(targetSlot));
        when(professorQualificationRepository.existsByIdAndInstitutionId(any(), eq(INSTITUTION_ID))).thenReturn(true);
        when(availabilityRepository.existsByIdAndInstitutionId(any(), eq(INSTITUTION_ID))).thenReturn(true);
        when(scheduleEntryRepository.findByScheduleIdAndTimeSlotId(500L, 1001L)).thenReturn(List.of(occupant));

        ScheduleEntryRequest request = new ScheduleEntryRequest(1L, 100L, 1001L);

        assertThatThrownBy(() -> service.update(1L, request, INSTITUTION_ID))
                .isInstanceOf(InvalidScheduleEntryException.class)
                .hasMessageContaining("same course and semester");
    }

    @Test
    void move_courseConflictOnly_swapsInsteadOfRejecting() {
        // Reproduces the reported bug: two offerings of the same course/semester
        // with different professors AND different classrooms don't collide on
        // professor/classroom. Swapping them resolves the conflict cleanly (each
        // ends up alone in its slot), so this must swap, not reject outright.
        SubjectOffering movingOffering = offering(10L, subject(1L), 30);
        movingOffering.setRecommendedSemester(1);
        SubjectOffering occupantOffering = offering(11L, subject(2L), 30);
        occupantOffering.setRecommendedSemester(1);

        Professor professorA = professor(1L, "Ana");
        Professor professorB = professor(2L, "Bruno");
        Classroom classroomA = classroom(100L, "A-1", 40);
        Classroom classroomB = classroom(101L, "A-2", 40);
        TimeSlot entrySlot = timeSlot(1000L, DayOfWeek.THURSDAY, 8);
        TimeSlot targetSlot = timeSlot(1001L, DayOfWeek.THURSDAY, 9);
        Schedule schedule = schedule(500L);

        ScheduleEntry entry = entry(1L, schedule, movingOffering, professorA, classroomA, entrySlot);
        ScheduleEntry occupant = entry(2L, schedule, occupantOffering, professorB, classroomB, targetSlot);

        when(scheduleEntryRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(entry));
        when(timeSlotRepository.findByIdAndInstitutionId(1001L, INSTITUTION_ID)).thenReturn(Optional.of(targetSlot));
        when(scheduleEntryRepository.findByScheduleIdAndTimeSlotId(500L, 1001L)).thenReturn(List.of(occupant));
        when(availabilityRepository.existsByIdAndInstitutionId(any(), eq(INSTITUTION_ID))).thenReturn(true);
        when(scheduleEntryRepository.save(any(ScheduleEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        List<ScheduleEntryResponse> responses = service.move(1L, 1001L, INSTITUTION_ID);

        assertThat(responses).hasSize(2);
        assertThat(entry.getTimeSlot().getId()).isEqualTo(1001L);
        assertThat(occupant.getTimeSlot().getId()).isEqualTo(1000L);
    }

    @Test
    void move_swap_rejectsWhenTheSwapPartnersDestinationHasAConflictingThirdEntry() {
        SubjectOffering movingOffering = offering(10L, subject(1L), 30);
        SubjectOffering swapPartnerOffering = offering(11L, subject(2L), 30);
        swapPartnerOffering.setRecommendedSemester(1);
        SubjectOffering thirdOffering = offering(12L, subject(3L), 30);
        thirdOffering.setRecommendedSemester(1);

        Professor professorA = professor(1L, "Ana");
        Professor professorB = professor(2L, "Bruno");
        Professor professorC = professor(3L, "Caio");
        Classroom classroomA = classroom(100L, "A-1", 40);
        TimeSlot entrySlot = timeSlot(1000L, DayOfWeek.MONDAY, 8);
        TimeSlot targetSlot = timeSlot(1001L, DayOfWeek.MONDAY, 9);
        Schedule schedule = schedule(500L);

        // entry and swapPartner collide on classroom, triggering the swap path.
        ScheduleEntry entry = entry(1L, schedule, movingOffering, professorA, classroomA, entrySlot);
        ScheduleEntry swapPartner = entry(2L, schedule, swapPartnerOffering, professorB, classroomA, targetSlot);
        // A third entry already sits at entry's CURRENT slot — swapPartner
        // would move there and conflict with it (same course/semester), even
        // though this entry never showed up in the initial target-slot scan.
        ScheduleEntry thirdEntry = entry(3L, schedule, thirdOffering, professorC, classroom(101L, "A-2", 40), entrySlot);

        when(scheduleEntryRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(entry));
        when(timeSlotRepository.findByIdAndInstitutionId(1001L, INSTITUTION_ID)).thenReturn(Optional.of(targetSlot));
        when(scheduleEntryRepository.findByScheduleIdAndTimeSlotId(500L, 1001L)).thenReturn(List.of(swapPartner));
        when(scheduleEntryRepository.findByScheduleIdAndTimeSlotId(500L, 1000L)).thenReturn(List.of(thirdEntry));

        assertThatThrownBy(() -> service.move(1L, 1001L, INSTITUTION_ID))
                .isInstanceOf(InvalidScheduleEntryException.class)
                .hasMessageContaining("same course and semester");

        org.mockito.Mockito.verify(scheduleEntryRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    void move_rejectsWhenTargetSlotHasBothAProfessorCollisionAndASeparateCourseConflict() {
        SubjectOffering movingOffering = offering(10L, subject(1L), 30);
        movingOffering.setRecommendedSemester(1);
        SubjectOffering courseConflictOffering = offering(11L, subject(2L), 30);
        courseConflictOffering.setRecommendedSemester(1);
        SubjectOffering professorCollisionOffering = offering(12L, subject(3L), 30);

        Professor professorA = professor(1L, "Ana");
        Classroom classroomA = classroom(100L, "A-1", 40);
        TimeSlot entrySlot = timeSlot(1000L, DayOfWeek.MONDAY, 8);
        TimeSlot targetSlot = timeSlot(1001L, DayOfWeek.MONDAY, 9);
        Schedule schedule = schedule(500L);

        ScheduleEntry entry = entry(1L, schedule, movingOffering, professorA, classroomA, entrySlot);
        // Collides on course/semester with the moving offering.
        ScheduleEntry courseConflict = entry(2L, schedule, courseConflictOffering, professor(2L, "Bruno"), classroom(101L, "A-2", 40), targetSlot);
        // Collides on professor with the moving offering — a second, distinct entry.
        ScheduleEntry professorCollision = entry(3L, schedule, professorCollisionOffering, professorA, classroom(102L, "A-3", 40), targetSlot);

        when(scheduleEntryRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(entry));
        when(timeSlotRepository.findByIdAndInstitutionId(1001L, INSTITUTION_ID)).thenReturn(Optional.of(targetSlot));
        when(scheduleEntryRepository.findByScheduleIdAndTimeSlotId(500L, 1001L)).thenReturn(List.of(courseConflict, professorCollision));

        assertThatThrownBy(() -> service.move(1L, 1001L, INSTITUTION_ID))
                .isInstanceOf(InvalidScheduleEntryException.class)
                .hasMessageContaining("occupied by different classes");

        org.mockito.Mockito.verify(scheduleEntryRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    void move_swap_rejectsWhenSwapPartnersDestinationClassroomIsAlreadyTakenByAThirdEntry() {
        // The real bug that slipped through: swapping only trades TIME SLOTS,
        // not classrooms, so the swap partner carries its own classroom into
        // the other slot — where an unrelated third entry might already sit.
        SubjectOffering movingOffering = offering(10L, subject(1L), 30);
        movingOffering.setRecommendedSemester(1);
        SubjectOffering swapPartnerOffering = offering(11L, subject(2L), 30);
        swapPartnerOffering.setRecommendedSemester(1);
        SubjectOffering thirdOffering = offering(12L, subject(3L), 30);

        Professor professorA = professor(1L, "Ana");
        Professor professorB = professor(2L, "Bruno");
        Professor professorC = professor(3L, "Caio");
        Classroom classroomA = classroom(100L, "A-1", 40);
        Classroom classroomB = classroom(101L, "A-207", 40);
        TimeSlot entrySlot = timeSlot(1000L, DayOfWeek.THURSDAY, 8);
        TimeSlot targetSlot = timeSlot(1001L, DayOfWeek.THURSDAY, 9);
        Schedule schedule = schedule(500L);

        // entry and swapPartner collide on course/semester only (different
        // professor, different classroom) — triggers the swap path.
        ScheduleEntry entry = entry(1L, schedule, movingOffering, professorA, classroomA, entrySlot);
        ScheduleEntry swapPartner = entry(2L, schedule, swapPartnerOffering, professorB, classroomB, targetSlot);
        // Already sitting in swapPartner's classroom, at entry's CURRENT slot —
        // exactly where swapPartner would land after the swap.
        ScheduleEntry thirdEntry = entry(3L, schedule, thirdOffering, professorC, classroomB, entrySlot);

        when(scheduleEntryRepository.findByIdAndInstitutionId(1L, INSTITUTION_ID)).thenReturn(Optional.of(entry));
        when(timeSlotRepository.findByIdAndInstitutionId(1001L, INSTITUTION_ID)).thenReturn(Optional.of(targetSlot));
        when(scheduleEntryRepository.findByScheduleIdAndTimeSlotId(500L, 1001L)).thenReturn(List.of(swapPartner));
        when(scheduleEntryRepository.findByScheduleIdAndTimeSlotId(500L, 1000L)).thenReturn(List.of());
        when(availabilityRepository.existsByIdAndInstitutionId(any(), eq(INSTITUTION_ID))).thenReturn(true);
        when(scheduleEntryRepository.existsByScheduleIdAndClassroomIdAndTimeSlotIdAndIdNot(500L, 100L, 1001L, 2L))
                .thenReturn(false);
        when(scheduleEntryRepository.existsByScheduleIdAndClassroomIdAndTimeSlotIdAndIdNot(500L, 101L, 1000L, 1L))
                .thenReturn(true);

        assertThatThrownBy(() -> service.move(1L, 1001L, INSTITUTION_ID))
                .isInstanceOf(InvalidScheduleEntryException.class)
                .hasMessageContaining("A-207")
                .hasMessageContaining("already occupied");

        org.mockito.Mockito.verify(scheduleEntryRepository, org.mockito.Mockito.never()).save(any());
    }
}

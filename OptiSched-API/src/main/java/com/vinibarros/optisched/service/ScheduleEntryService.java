package com.vinibarros.optisched.service;

import com.vinibarros.optisched.dto.request.ScheduleEntryRequest;
import com.vinibarros.optisched.dto.response.ScheduleEntryResponse;
import com.vinibarros.optisched.email.EmailSender;
import com.vinibarros.optisched.entity.*;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.InvalidScheduleEntryException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.ScheduleEntryMapper;
import com.vinibarros.optisched.repository.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.function.Predicate;

@Service
public class ScheduleEntryService {

    private final ScheduleEntryRepository scheduleEntryRepository;
    private final ScheduleRepository scheduleRepository;
    private final ProfessorRepository professorRepository;
    private final ClassroomRepository classroomRepository;
    private final TimeSlotRepository timeSlotRepository;
    private final AvailabilityRepository availabilityRepository;
    private final ProfessorQualificationRepository professorQualificationRepository;
    private final ScheduleEntryMapper scheduleEntryMapper;
    private final EmailSender emailSender;

    public ScheduleEntryService(
            ScheduleEntryRepository scheduleEntryRepository,
            ScheduleRepository scheduleRepository,
            ProfessorRepository professorRepository,
            ClassroomRepository classroomRepository,
            TimeSlotRepository timeSlotRepository,
            AvailabilityRepository availabilityRepository,
            ProfessorQualificationRepository professorQualificationRepository,
            ScheduleEntryMapper scheduleEntryMapper,
            EmailSender emailSender
    ){
        this.scheduleEntryRepository = scheduleEntryRepository;
        this.scheduleRepository = scheduleRepository;
        this.professorRepository = professorRepository;
        this.classroomRepository = classroomRepository;
        this.timeSlotRepository = timeSlotRepository;
        this.availabilityRepository = availabilityRepository;
        this.professorQualificationRepository = professorQualificationRepository;
        this.scheduleEntryMapper = scheduleEntryMapper;
        this.emailSender = emailSender;
    }

    private void notifyProfessor(Professor professor) {
        if (professor.getUser() != null) {
            emailSender.sendScheduleChangedEmail(professor.getUser().getEmail(), professor.getName());
        }
    }

    /**
     * Mirrors the optimizer's C4 (Course Conflict) hard constraint: two
     * offerings of the same course + recommended semester can never share a
     * TimeSlot, since a student in that semester would need to be in both at
     * once. The optimizer never produces this, but manual edits (update/move)
     * had no equivalent check — this closes that gap.
     */
    private boolean isCourseConflict(SubjectOffering a, SubjectOffering b) {
        if (a.getId().equals(b.getId())) return false;
        return Objects.equals(a.getCourse().getId(), b.getCourse().getId())
                && Objects.equals(a.getRecommendedSemester(), b.getRecommendedSemester());
    }

    private void assertNoCourseConflict(Long scheduleId, SubjectOffering movingOffering, Long timeSlotId, Set<Long> excludedEntryIds) {
        for (ScheduleEntry occupant : scheduleEntryRepository.findByScheduleIdAndTimeSlotId(scheduleId, timeSlotId)) {
            if (excludedEntryIds.contains(occupant.getId())) continue;

            SubjectOffering occupantOffering = occupant.getSubjectOffering();

            if (isCourseConflict(movingOffering, occupantOffering)) {
                throw new InvalidScheduleEntryException(
                        "This time slot already has another class (" + occupantOffering.getSubject().getName()
                                + ") for the same course and semester."
                );
            }
        }
    }

    @Transactional
    public ScheduleEntryResponse createEntry(Schedule schedule, SubjectOffering subjectOffering, Professor professor, Classroom classroom, TimeSlot timeSlot){
        if (scheduleEntryRepository.existsByScheduleIdAndClassroomIdAndTimeSlotId(
                schedule.getId(),
                classroom.getId(),
                timeSlot.getId())) {
            throw new DuplicateResourceException(
                    "Classroom is already occupied at this time slot."
            );
        }

        if (scheduleEntryRepository.existsByScheduleIdAndProfessorIdAndTimeSlotId(
                schedule.getId(),
                professor.getId(),
                timeSlot.getId())) {
            throw new DuplicateResourceException(
                    "Professor is already assigned at this time slot."
            );
        }

        if (scheduleEntryRepository.existsByScheduleIdAndProfessorIdAndSubjectOfferingIdAndClassroomIdAndTimeSlotId(
                schedule.getId(),
                professor.getId(),
                subjectOffering.getId(),
                classroom.getId(),
                timeSlot.getId())) {
            throw new DuplicateResourceException(
                    "ScheduleEntry already exists."
            );
        }

        ScheduleEntry scheduleEntry = new ScheduleEntry();
        scheduleEntry.setSchedule(schedule);
        scheduleEntry.setSubjectOffering(subjectOffering);
        scheduleEntry.setProfessor(professor);
        scheduleEntry.setClassroom(classroom);
        scheduleEntry.setTimeSlot(timeSlot);
        scheduleEntry.setInstitution(schedule.getInstitution());

        ScheduleEntry saved = scheduleEntryRepository.save(scheduleEntry);
        return scheduleEntryMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public ScheduleEntryResponse findById(Long id, Long institutionId){
        ScheduleEntry scheduleEntry = scheduleEntryRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("ScheduleEntry", id));
        return scheduleEntryMapper.toResponse(scheduleEntry);
    }

    @Transactional(readOnly = true)
    public List<ScheduleEntryResponse> findBySchedule(Long scheduleId, Long institutionId){
        if(!scheduleRepository.existsByIdAndInstitutionId(scheduleId, institutionId)){
            throw new ResourceNotFoundException("Schedule", scheduleId);
        }

        return scheduleEntryRepository.findByScheduleId(scheduleId)
                .stream()
                .map(scheduleEntryMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ScheduleEntryResponse> findByScheduleAndProfessor(Long scheduleId, Long professorId, Long institutionId){
        if(!scheduleRepository.existsByIdAndInstitutionId(scheduleId, institutionId)){
            throw new ResourceNotFoundException("Schedule", scheduleId);
        }

        if(!professorRepository.existsByIdAndInstitutionId(professorId, institutionId)){
            throw new ResourceNotFoundException("Professor", professorId);
        }

        return scheduleEntryRepository.findByScheduleIdAndProfessorId(scheduleId, professorId)
                .stream()
                .map(scheduleEntryMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ScheduleEntryResponse> findByScheduleAndClassroom(Long scheduleId, Long classroomId, Long institutionId){
        if(!scheduleRepository.existsByIdAndInstitutionId(scheduleId, institutionId)){
            throw new ResourceNotFoundException("Schedule", scheduleId);
        }

        if(!classroomRepository.existsByIdAndInstitutionId(classroomId, institutionId)){
            throw new ResourceNotFoundException("Classroom", classroomId);
        }

        return scheduleEntryRepository.findByScheduleIdAndClassroomId(scheduleId, classroomId)
                .stream()
                .map(scheduleEntryMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ScheduleEntryResponse> findByScheduleAndDayOfWeek(Long scheduleId, DayOfWeek dayOfWeek, Long institutionId){
        if(!scheduleRepository.existsByIdAndInstitutionId(scheduleId, institutionId)){
            throw new ResourceNotFoundException("Schedule", scheduleId);
        }

        return scheduleEntryRepository.findByScheduleIdAndTimeSlotDayOfWeek(scheduleId, dayOfWeek)
                .stream()
                .map(scheduleEntryMapper::toResponse)
                .toList();
    }

    @Transactional
    public ScheduleEntryResponse update(Long id, ScheduleEntryRequest request, Long institutionId){
        ScheduleEntry entry = scheduleEntryRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("ScheduleEntry", id));

        Professor professor = professorRepository.findByIdAndInstitutionId(request.professorId(), institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Professor", request.professorId()));

        Classroom classroom = classroomRepository.findByIdAndInstitutionId(request.classroomId(), institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom", request.classroomId()));

        TimeSlot timeSlot = timeSlotRepository.findByIdAndInstitutionId(request.timeSlotId(), institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("TimeSlot", request.timeSlotId()));

        Subject subject = entry.getSubjectOffering().getSubject();

        if (!professorQualificationRepository.existsByIdAndInstitutionId(
                new ProfessorQualificationId(professor.getId(), subject.getId()), institutionId)) {
            throw new InvalidScheduleEntryException(
                    "Professor " + professor.getName() + " is not qualified to teach " + subject.getName() + "."
            );
        }

        if (!availabilityRepository.existsByIdAndInstitutionId(
                new AvailabilityId(professor.getId(), timeSlot.getId()), institutionId)) {
            throw new InvalidScheduleEntryException(
                    "Professor " + professor.getName() + " is not available at the selected time slot."
            );
        }

        if (classroom.getCapacity() < entry.getSubjectOffering().getExpectedStudents()) {
            throw new InvalidScheduleEntryException(
                    "Classroom " + classroom.getNumber() + " does not have enough capacity for this offering."
            );
        }

        if (subject.getRequiredRoomType() != null && subject.getRequiredRoomType() != classroom.getType()) {
            throw new InvalidScheduleEntryException(
                    "Classroom " + classroom.getNumber() + " is not a " + subject.getRequiredRoomType()
                            + " room, which " + subject.getName() + " requires."
            );
        }

        Long scheduleId = entry.getSchedule().getId();

        assertNoCourseConflict(scheduleId, entry.getSubjectOffering(), timeSlot.getId(), Set.of(id));

        if (scheduleEntryRepository.existsByScheduleIdAndClassroomIdAndTimeSlotIdAndIdNot(
                scheduleId, classroom.getId(), timeSlot.getId(), id)) {
            throw new DuplicateResourceException("Classroom is already occupied at this time slot.");
        }

        if (scheduleEntryRepository.existsByScheduleIdAndProfessorIdAndTimeSlotIdAndIdNot(
                scheduleId, professor.getId(), timeSlot.getId(), id)) {
            throw new DuplicateResourceException("Professor is already assigned at this time slot.");
        }

        if (scheduleEntryRepository.existsByScheduleIdAndProfessorIdAndSubjectOfferingIdAndClassroomIdAndTimeSlotIdAndIdNot(
                scheduleId, professor.getId(), entry.getSubjectOffering().getId(), classroom.getId(), timeSlot.getId(), id)) {
            throw new DuplicateResourceException("ScheduleEntry already exists.");
        }

        Professor oldProfessor = entry.getProfessor();

        entry.setProfessor(professor);
        entry.setClassroom(classroom);
        entry.setTimeSlot(timeSlot);

        try {
            ScheduleEntry updated = scheduleEntryRepository.save(entry);

            notifyProfessor(professor);
            if (!Objects.equals(oldProfessor.getId(), professor.getId())) {
                notifyProfessor(oldProfessor);
            }

            return scheduleEntryMapper.toResponse(updated);
        } catch (DataIntegrityViolationException e) {
            throw new DuplicateResourceException("ScheduleEntry already exists.");
        }
    }

    @Transactional
    public ScheduleEntryResponse toggleLocked(Long id, Long institutionId){
        ScheduleEntry entry = scheduleEntryRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("ScheduleEntry", id));

        entry.setLocked(!entry.isLocked());

        ScheduleEntry updated = scheduleEntryRepository.save(entry);
        return scheduleEntryMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id, Long institutionId){
        ScheduleEntry entry = scheduleEntryRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("ScheduleEntry", id));

        scheduleEntryRepository.delete(entry);
        notifyProfessor(entry.getProfessor());
    }

    /**
     * Moves a single entry to a new TimeSlot, keeping its professor/classroom.
     * If the target slot is already occupied by another entry that would
     * collide with this one — same professor, same classroom, or the same
     * course + recommended semester (C4, a student can't be in two classes of
     * their own semester at once) — the two entries are swapped instead of
     * rejecting the move outright, as long as that swap doesn't just move the
     * conflict somewhere else. This is the operation behind dragging an entry
     * onto an occupied cell in the admin grid.
     */
    @Transactional
    public List<ScheduleEntryResponse> move(Long id, Long newTimeSlotId, Long institutionId){
        ScheduleEntry entry = scheduleEntryRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("ScheduleEntry", id));

        TimeSlot newTimeSlot = timeSlotRepository.findByIdAndInstitutionId(newTimeSlotId, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("TimeSlot", newTimeSlotId));

        Long scheduleId = entry.getSchedule().getId();
        Long professorId = entry.getProfessor().getId();
        Long classroomId = entry.getClassroom().getId();
        SubjectOffering movingOffering = entry.getSubjectOffering();

        List<ScheduleEntry> occupants = scheduleEntryRepository.findByScheduleIdAndTimeSlotId(scheduleId, newTimeSlotId)
                .stream()
                .filter(other -> !other.getId().equals(id))
                .toList();

        List<ScheduleEntry> colliding = occupants.stream()
                .filter(other -> other.getProfessor().getId().equals(professorId)
                        || other.getClassroom().getId().equals(classroomId)
                        || isCourseConflict(movingOffering, other.getSubjectOffering()))
                .toList();

        if (colliding.isEmpty()) {
            if (!availabilityRepository.existsByIdAndInstitutionId(
                    new AvailabilityId(professorId, newTimeSlotId), institutionId)) {
                throw new InvalidScheduleEntryException(
                        "Professor " + entry.getProfessor().getName() + " is not available at the selected time slot."
                );
            }

            TimeSlot oldTimeSlot = entry.getTimeSlot();
            entry.setTimeSlot(newTimeSlot);
            try {
                ScheduleEntry saved = scheduleEntryRepository.save(entry);
                notifyProfessor(entry.getProfessor());
                return List.of(scheduleEntryMapper.toResponse(saved));
            } catch (DataIntegrityViolationException e) {
                entry.setTimeSlot(oldTimeSlot);
                throw new DuplicateResourceException("This time slot is already occupied.");
            }
        }

        // Distinct colliding entries by identity: if the professor collision,
        // classroom collision, or course conflict point at more than one
        // DIFFERENT entry, a simple 2-way swap can't resolve all of them at
        // once.
        List<ScheduleEntry> distinctColliding = colliding.stream()
                .filter(distinctById())
                .toList();

        if (distinctColliding.size() > 1) {
            throw new InvalidScheduleEntryException(
                    "Cannot move this entry: the professor, classroom, or course/semester slot is already occupied by different classes at that time slot."
            );
        }

        ScheduleEntry other = distinctColliding.get(0);
        TimeSlot entryOldTimeSlot = entry.getTimeSlot();
        TimeSlot otherOldTimeSlot = other.getTimeSlot();

        // The swap itself resolves the collision with `other` — but a THIRD
        // entry, uninvolved in the swap, could still conflict on course +
        // semester at either destination slot.
        Set<Long> swapExcluded = Set.of(id, other.getId());
        assertNoCourseConflict(scheduleId, entry.getSubjectOffering(), otherOldTimeSlot.getId(), swapExcluded);
        assertNoCourseConflict(scheduleId, other.getSubjectOffering(), entryOldTimeSlot.getId(), swapExcluded);

        if (!availabilityRepository.existsByIdAndInstitutionId(
                new AvailabilityId(entry.getProfessor().getId(), otherOldTimeSlot.getId()), institutionId)) {
            throw new InvalidScheduleEntryException(
                    "Professor " + entry.getProfessor().getName() + " is not available at the target time slot."
            );
        }

        if (!Objects.equals(entry.getProfessor().getId(), other.getProfessor().getId())
                && !availabilityRepository.existsByIdAndInstitutionId(
                        new AvailabilityId(other.getProfessor().getId(), entryOldTimeSlot.getId()), institutionId)) {
            throw new InvalidScheduleEntryException(
                    "Professor " + other.getProfessor().getName() + " is not available at that entry's current time slot."
            );
        }

        // The swap only trades `entry` and `other`'s own classrooms along with
        // them — a THIRD entry could already occupy one of the destination
        // slots in that same classroom, uninvolved in either collision check
        // above (this is the DB-level check the DataIntegrityViolationException
        // catch below is a last-resort backstop for, not the primary guard).
        if (scheduleEntryRepository.existsByScheduleIdAndClassroomIdAndTimeSlotIdAndIdNot(
                scheduleId, entry.getClassroom().getId(), otherOldTimeSlot.getId(), other.getId())) {
            throw new InvalidScheduleEntryException(
                    "Classroom " + entry.getClassroom().getNumber() + " is already occupied at the target time slot."
            );
        }

        if (!Objects.equals(entry.getClassroom().getId(), other.getClassroom().getId())
                && scheduleEntryRepository.existsByScheduleIdAndClassroomIdAndTimeSlotIdAndIdNot(
                        scheduleId, other.getClassroom().getId(), entryOldTimeSlot.getId(), entry.getId())) {
            throw new InvalidScheduleEntryException(
                    "Classroom " + other.getClassroom().getNumber() + " is already occupied at that entry's current time slot."
            );
        }

        entry.setTimeSlot(otherOldTimeSlot);
        other.setTimeSlot(entryOldTimeSlot);

        try {
            ScheduleEntry savedEntry = scheduleEntryRepository.save(entry);
            ScheduleEntry savedOther = scheduleEntryRepository.save(other);

            notifyProfessor(entry.getProfessor());
            if (!Objects.equals(entry.getProfessor().getId(), other.getProfessor().getId())) {
                notifyProfessor(other.getProfessor());
            }

            return List.of(scheduleEntryMapper.toResponse(savedEntry), scheduleEntryMapper.toResponse(savedOther));
        } catch (DataIntegrityViolationException e) {
            entry.setTimeSlot(entryOldTimeSlot);
            other.setTimeSlot(otherOldTimeSlot);
            throw new DuplicateResourceException("Could not swap these entries — a conflicting entry already exists.");
        }
    }

    private static Predicate<ScheduleEntry> distinctById() {
        Set<Long> seen = new HashSet<>();
        return entry -> seen.add(entry.getId());
    }
}

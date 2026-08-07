package com.vinibarros.optisched.service;

import com.vinibarros.optisched.csv.CsvUtils;
import com.vinibarros.optisched.dto.request.TimeSlotRequest;
import com.vinibarros.optisched.dto.response.ImportResultResponse;
import com.vinibarros.optisched.dto.response.ImportRowError;
import com.vinibarros.optisched.dto.response.TimeSlotResponse;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.entity.TimeSlot;
import com.vinibarros.optisched.exception.*;
import com.vinibarros.optisched.mapper.TimeSlotMapper;
import com.vinibarros.optisched.repository.InstitutionRepository;
import com.vinibarros.optisched.repository.TimeSlotRepository;
import jakarta.validation.Validator;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.List;

@Service
public class TimeSlotService {

    private final TimeSlotRepository timeSlotRepository;
    private final InstitutionRepository institutionRepository;
    private final TimeSlotMapper timeSlotMapper;
    private final Validator validator;

    public TimeSlotService(TimeSlotRepository timeSlotRepository, InstitutionRepository institutionRepository, TimeSlotMapper timeSlotMapper, Validator validator){
        this.timeSlotRepository = timeSlotRepository;
        this.institutionRepository = institutionRepository;
        this.timeSlotMapper = timeSlotMapper;
        this.validator = validator;
    }

    @Transactional
    public TimeSlotResponse create(TimeSlotRequest request, Long institutionId){
        if(!request.endTime().isAfter(request.startTime())){
            throw new InvalidTimeSlotException();
        }

        if(timeSlotRepository.existsByDayOfWeekAndStartTimeAndEndTimeAndInstitutionId(request.dayOfWeek(), request.startTime(), request.endTime(), institutionId)){
            throw new DuplicateResourceException("TimeSlot already exists for day of week: " + request.dayOfWeek() + ", startTime: " + request.startTime() + " and EndTime: " + request.endTime());
        }

        if(timeSlotRepository.existsOverlappingTimeSlot(request.startTime(), request.endTime(), institutionId)){
            throw new OverlappingTimeSlotException("TimeSlot overlaps with an existing time range: " + request.startTime() + "-" + request.endTime());
        }

        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution", institutionId));

        TimeSlot timeSlot = timeSlotMapper.toEntity(request, institution);
        try {
            TimeSlot saved = timeSlotRepository.save(timeSlot);
            return timeSlotMapper.toResponse(saved);
        } catch (DataIntegrityViolationException e) {
            throw new DuplicateResourceException("TimeSlot already exists for day of week: " + request.dayOfWeek() + ", startTime: " + request.startTime() + " and EndTime: " + request.endTime());
        }
    }

    @Transactional(readOnly = true)
    public TimeSlotResponse findById(Long id, Long institutionId){
        TimeSlot timeSlot = timeSlotRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("TimeSlot", id));
        return timeSlotMapper.toResponse(timeSlot);
    }

    @Transactional(readOnly = true)
    public List<TimeSlotResponse> findAll(Long institutionId){
        return timeSlotRepository.findAllByInstitutionId(institutionId)
                .stream()
                .map(timeSlotMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TimeSlotResponse> findByDayOfWeek(DayOfWeek dayOfWeek, Long institutionId){
        return timeSlotRepository.findByDayOfWeekAndInstitutionId(dayOfWeek, institutionId)
                .stream()
                .map(timeSlotMapper::toResponse)
                .toList();
    }

    @Transactional
    public void delete(Long id, Long institutionId){
        if(!timeSlotRepository.existsByIdAndInstitutionId(id, institutionId)){
            throw new ResourceNotFoundException("TimeSlot", id);
        }
        try{
            timeSlotRepository.deleteById(id);
            timeSlotRepository.flush();
        } catch (DataIntegrityViolationException e){
            throw new ResourceInUseException("TimeSlot cannot be deleted because it is referenced by existing ScheduleEntry records");
        }
    }

    /**
     * Imports time slots from a CSV file, one row at a time, in its own
     * transaction each (this method is deliberately NOT @Transactional), so a
     * bad row never rolls back the rows already imported before it.
     */
    public ImportResultResponse importFromCsv(MultipartFile file, Long institutionId) {
        int total = 0;
        int success = 0;
        List<ImportRowError> errors = new ArrayList<>();

        try (CSVParser parser = CsvUtils.parse(file)) {
            for (CSVRecord record : parser) {
                total++;
                try {
                    DayOfWeek dayOfWeek = CsvUtils.parseEnum(DayOfWeek.class, record.get("dayOfWeek"));
                    TimeSlotRequest request = new TimeSlotRequest(
                            dayOfWeek,
                            CsvUtils.parseLocalTime(record.get("startTime")),
                            CsvUtils.parseLocalTime(record.get("endTime"))
                    );
                    CsvUtils.validate(validator, request);

                    create(request, institutionId);
                    success++;
                } catch (Exception e) {
                    errors.add(new ImportRowError(record.getRecordNumber(), e.getMessage()));
                }
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read CSV file", e);
        }

        return new ImportResultResponse(total, success, errors);
    }

    @Transactional(readOnly = true)
    public byte[] exportToCsv(Long institutionId) {
        List<TimeSlot> timeSlots = timeSlotRepository.findAllByInstitutionId(institutionId);

        List<String> header = List.of("dayOfWeek", "startTime", "endTime");
        List<List<String>> rows = timeSlots.stream()
                .map(t -> List.of(t.getDayOfWeek().name(), t.getStartTime().toString(), t.getEndTime().toString()))
                .toList();

        try {
            return CsvUtils.write(header, rows);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}

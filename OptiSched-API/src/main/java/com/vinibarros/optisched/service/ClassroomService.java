package com.vinibarros.optisched.service;

import com.vinibarros.optisched.csv.CsvUtils;
import com.vinibarros.optisched.dto.request.ClassroomRequest;
import com.vinibarros.optisched.dto.response.ClassroomResponse;
import com.vinibarros.optisched.dto.response.ImportResultResponse;
import com.vinibarros.optisched.dto.response.ImportRowError;
import com.vinibarros.optisched.entity.Classroom;
import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.enums.RoomType;
import com.vinibarros.optisched.exception.DuplicateResourceException;
import com.vinibarros.optisched.exception.ResourceInUseException;
import com.vinibarros.optisched.exception.ResourceNotFoundException;
import com.vinibarros.optisched.mapper.ClassroomMapper;
import com.vinibarros.optisched.repository.ClassroomRepository;
import com.vinibarros.optisched.repository.InstitutionRepository;
import jakarta.validation.Validator;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class ClassroomService {

    private final ClassroomRepository classroomRepository;
    private final InstitutionRepository institutionRepository;
    private final ClassroomMapper classroomMapper;
    private final Validator validator;

    public ClassroomService(ClassroomRepository classroomRepository, InstitutionRepository institutionRepository, ClassroomMapper classroomMapper, Validator validator){
        this.classroomRepository = classroomRepository;
        this.institutionRepository = institutionRepository;
        this.classroomMapper = classroomMapper;
        this.validator = validator;
    }

    @Transactional
    public ClassroomResponse create(ClassroomRequest request, Long institutionId){
        if(classroomRepository.existsByNumberAndInstitutionId(request.number(), institutionId)){
            throw new DuplicateResourceException("Classroom", "number", request.number());
        }

        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Institution", institutionId));

        Classroom classroom = classroomMapper.toEntity(request, institution);
        Classroom saved = classroomRepository.save(classroom);
        return classroomMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public ClassroomResponse findById(Long id, Long institutionId){
        Classroom classroom = classroomRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom", id));

        return classroomMapper.toResponse(classroom);
    }

    @Transactional(readOnly = true)
    public List<ClassroomResponse> findAll(Long institutionId){
        return classroomRepository.findAllByInstitutionId(institutionId)
                .stream()
                .map(classroomMapper::toResponse)
                .toList();
    }

    @Transactional
    public ClassroomResponse update(Long id, ClassroomRequest request, Long institutionId){
        Classroom classroom = classroomRepository.findByIdAndInstitutionId(id, institutionId)
                .orElseThrow(() -> new ResourceNotFoundException("Classroom", id));

        if(!classroom.getNumber().equals(request.number()) && classroomRepository.existsByNumberAndInstitutionId(request.number(), institutionId)){
            throw new DuplicateResourceException("Classroom", "number", request.number());
        }

        classroom.setNumber(request.number());
        classroom.setCapacity(request.capacity());
        classroom.setType(request.type());
        classroom.setBuilding(request.building());

        Classroom updated = classroomRepository.save(classroom);
        return classroomMapper.toResponse(updated);
    }

    @Transactional
    public void delete(Long id, Long institutionId){
        if(!classroomRepository.existsByIdAndInstitutionId(id, institutionId)){
            throw new ResourceNotFoundException("Classroom", id);
        }

        try {
            classroomRepository.deleteById(id);
        } catch (DataIntegrityViolationException e) {
            throw new ResourceInUseException("Classroom cannot be deleted because it is referenced by existing ScheduleEntry records");
        }
    }

    /**
     * Imports classrooms from a CSV file, one row at a time, in its own
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
                    String number = record.get("number");
                    Integer capacity = CsvUtils.parseInt(record.get("capacity"));
                    RoomType type = CsvUtils.parseEnum(RoomType.class, record.get("type"));
                    String building = CsvUtils.getOptional(record, "building");

                    ClassroomRequest request = new ClassroomRequest(number, capacity, type, building);
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
        List<Classroom> classrooms = classroomRepository.findAllByInstitutionId(institutionId);

        List<String> header = List.of("number", "capacity", "type", "building");
        List<List<String>> rows = classrooms.stream()
                .map(c -> java.util.Arrays.asList(
                        c.getNumber(), c.getCapacity().toString(), c.getType().name(), c.getBuilding()
                ))
                .toList();

        try {
            return CsvUtils.write(header, rows);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}

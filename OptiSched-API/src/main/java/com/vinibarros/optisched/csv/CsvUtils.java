package com.vinibarros.optisched.csv;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.CSVRecord;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public class CsvUtils {

    private CsvUtils() {}

    public static CSVParser parse(MultipartFile file) throws IOException {
        return CSVFormat.DEFAULT.builder()
                .setHeader()
                .setSkipHeaderRecord(true)
                .setIgnoreSurroundingSpaces(true)
                .setTrim(true)
                .build()
                .parse(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8));
    }

    public static byte[] write(List<String> header, List<List<String>> rows) throws IOException {
        StringWriter writer = new StringWriter();
        CSVFormat format = CSVFormat.DEFAULT.builder().setHeader(header.toArray(new String[0])).build();
        try (CSVPrinter printer = new CSVPrinter(writer, format)) {
            for (List<String> row : rows) {
                printer.printRecord(row.stream().map(CsvUtils::sanitizeForSpreadsheet).toList());
            }
        }
        return writer.toString().getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Prefixes a leading '=', '+', '-', '@', tab or carriage return with a
     * single quote so spreadsheet apps (Excel, Google Sheets, LibreOffice)
     * treat the cell as literal text instead of a formula — mitigates CSV
     * formula injection for exported data that ultimately comes from
     * user-entered fields (classroom numbers, subject/professor names, etc.).
     */
    private static String sanitizeForSpreadsheet(String value) {
        if (value == null || value.isEmpty()) return value;
        char first = value.charAt(0);
        if (first == '=' || first == '+' || first == '-' || first == '@' || first == '\t' || first == '\r') {
            return "'" + value;
        }
        return value;
    }

    /** Null for a blank cell, or when the column is entirely absent from the file (a fully optional column). */
    public static String getOptional(CSVRecord record, String column) {
        if (!record.isMapped(column)) return null;
        String value = record.get(column);
        return (value == null || value.isBlank()) ? null : value;
    }

    public static Integer parseIntOrNull(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Integer.valueOf(value.trim());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("'" + value + "' is not a valid number");
        }
    }

    public static int parseInt(String value) {
        Integer result = parseIntOrNull(value);
        if (result == null) throw new IllegalArgumentException("Missing required numeric value");
        return result;
    }

    public static <E extends Enum<E>> E parseEnumOrNull(Class<E> enumType, String value) {
        if (value == null) return null;
        try {
            return Enum.valueOf(enumType, value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("'" + value + "' is not a valid value for " + enumType.getSimpleName());
        }
    }

    public static <E extends Enum<E>> E parseEnum(Class<E> enumType, String value) {
        E result = parseEnumOrNull(enumType, value);
        if (result == null) throw new IllegalArgumentException("Missing required value for " + enumType.getSimpleName());
        return result;
    }

    public static LocalTime parseLocalTime(String value) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException("Missing required time value");
        try {
            return LocalTime.parse(value.trim());
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("'" + value + "' is not a valid time (expected HH:mm)");
        }
    }

    public static <T> void validate(Validator validator, T bean) {
        Set<ConstraintViolation<T>> violations = validator.validate(bean);
        if (!violations.isEmpty()) {
            String message = violations.stream()
                    .map(v -> v.getPropertyPath() + " " + v.getMessage())
                    .collect(Collectors.joining("; "));
            throw new IllegalArgumentException(message);
        }
    }
}

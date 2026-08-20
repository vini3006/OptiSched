package com.vinibarros.optisched.util;

import com.vinibarros.optisched.entity.Institution;
import com.vinibarros.optisched.enums.InstitutionType;
import com.vinibarros.optisched.exception.InstitutionTypeMismatchException;

public class InstitutionTypeUtils {

    private InstitutionTypeUtils(){}

    public static void requireType(Institution institution, InstitutionType expected, String action) {
        if (institution.getType() != expected) {
            throw new InstitutionTypeMismatchException(
                    "Cannot " + action + ": institution \"" + institution.getName()
                            + "\" is not a " + expected + " institution."
            );
        }
    }
}

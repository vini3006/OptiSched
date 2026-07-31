import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import common from "@/i18n/locales/pt-BR/common";
import adminUsers from "@/i18n/locales/pt-BR/admin-users";
import adminProfessors from "@/i18n/locales/pt-BR/admin-professors";
import adminAcademicStructure from "@/i18n/locales/pt-BR/admin-academic-structure";
import adminInfrastructure from "@/i18n/locales/pt-BR/admin-infrastructure";
import adminGrades from "@/i18n/locales/pt-BR/admin-grades";
import adminInstitutions from "@/i18n/locales/pt-BR/admin-institutions";
import adminMyInstitution from "@/i18n/locales/pt-BR/admin-my-institution";
import professorSchedule from "@/i18n/locales/pt-BR/professor-schedule";
import professorAvailability from "@/i18n/locales/pt-BR/professor-availability";
import professorQualifications from "@/i18n/locales/pt-BR/professor-qualifications";
import auth from "@/i18n/locales/pt-BR/auth";
import csvImportExport from "@/i18n/locales/pt-BR/csv-import-export";
import weeklyScheduleGrid from "@/i18n/locales/pt-BR/weekly-schedule-grid";
import appNavBar from "@/i18n/locales/pt-BR/app-nav-bar";
import validations from "@/i18n/locales/pt-BR/validations";

void i18next.use(initReactI18next).init({
  lng: "pt-BR",
  fallbackLng: "pt-BR",
  ns: [
    "common",
    "adminUsers",
    "adminProfessors",
    "adminAcademicStructure",
    "adminInfrastructure",
    "adminGrades",
    "adminInstitutions",
    "adminMyInstitution",
    "professorSchedule",
    "professorAvailability",
    "professorQualifications",
    "auth",
    "csvImportExport",
    "weeklyScheduleGrid",
    "appNavBar",
    "validations",
  ],
  defaultNS: "common",
  resources: {
    "pt-BR": {
      common,
      adminUsers,
      adminProfessors,
      adminAcademicStructure,
      adminInfrastructure,
      adminGrades,
      adminInstitutions,
      adminMyInstitution,
      professorSchedule,
      professorAvailability,
      professorQualifications,
      auth,
      csvImportExport,
      weeklyScheduleGrid,
      appNavBar,
      validations,
    },
  },
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});

export default i18next;

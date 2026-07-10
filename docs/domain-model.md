# Entities

## Professor 

- ID
- Name 
- Email

## Subject

- ID 
- Code
- Name 
- Workload

## ProfessorQualification

- Professor_ID
- Subject_ID

## Course
    
- ID
- Name 

## SubjectOffering

- ID
- Course_ID
- Subject_ID
- Semester_ID
- Section
- ExpectedStudents
- RecommendedSemester

## Semester 

- ID 
- Year
- Term

## Availability

- Professor_ID
- TimeSlot_ID

## Classroom

- ID
- Number 
- Capacity

## TimeSlot

- ID
- DayOfWeek
- StartTime
- EndTime

## Schedule

- ID
- Semester_ID
- GeneratedAt
- Status (Active, Inactive)

## ScheduleEntry

- ID
- Schedule_ID
- Professor_ID
- SubjectOffering_ID
- Classroom_ID
- TimeSlot_ID

## Design Decisions

In the current version, RecommendedSemester is stored directly in SubjectOffering to keep the domain model simple and focused on the scheduling problem. If the project evolves into a full academic management system, this information can be extracted into a dedicated curriculum entity without affecting the overall architecture.
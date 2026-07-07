# Hard Constraints

## Professor 

- A professor email must be unique.
- A professor can only teach subjects they are qualified for.
- A professor cannot teach two classes at the same time.

## Subjects

- Subject code must be unique. 
- Workload must be greater than zero.
- Every subject offering must be assigned to a qualified professor.

## SubjectOffering 

- The combination (Subject, Semester, Section) must be unique.
- ExpectedStudents must be greater than zero.

## Semester

- The pair Year-Term must be unique.

## Availability

- StartTime must be before EndTime.
- Availability periods for the same professor must not overlap.

## Classroom

- Capacity must be greater than zero.

## Scheduling 

- A professor can only be assigned to a time slot in which they are available.
- A classroom cannot host more than one class during the same TimeSlot.
- Subject offerings belonging to the same course and recommended semester cannot be assigned to the same time slot.
- A professor cannot be assigned to more than one class during the same TimeSlot.
- A classroom capacity must be greater than or equal to the expected number of students from the class.
- Every subject offering must be assigned enough time slots to satisfy its workload.
- Each subject offering must be assigned the number of time slots required to satisfy its weekly workload.
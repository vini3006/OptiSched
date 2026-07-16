from highspy import Highs
from .variables import Variables
from models import ScheduleEntry, OptimizationResponse

def extract_solution(model: Highs, variables: Variables) -> OptimizationResponse:

    schedule_entries = []

    solution = model.getSolution()

    col_values = solution.col_value

    for(professor, offering, classroom, time_slot), x_column in variables.x.items():

        # Because of the floating point tolerance, we check if the value is > 0.5 (1.0 for binaries)
        if col_values[x_column] > 0.5:
            schedule_entries.append(
                ScheduleEntry(
                    subject_offering_id=offering,
                    professor_id=professor,
                    classroom_id=classroom,
                    time_slot_id=time_slot
                )
            )

    return OptimizationResponse(schedule_entries=schedule_entries)
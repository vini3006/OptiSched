import highspy
from highspy import Highs, HighsModelStatus
from models import OptimizationResponse

from mapper import SolverData, ObjectiveWeights
from .variables import create_variables, create_auxiliary_variables
from .constraints import add_all_constraints
from .objective import build_objective
from .extractor import extract_solution

# Real institutions can produce fairly large MILPs (dozens of professors/
# offerings/rooms). Proving strict global optimality can occasionally take
# minutes; a bounded time budget plus a small accepted optimality gap keeps
# every request responsive while still returning a very good schedule.
SOLVE_TIME_LIMIT_SECONDS = 45.0
SOLVE_MIP_REL_GAP = 0.02

def solve_scheduling_problem(data: SolverData, weights: ObjectiveWeights = ObjectiveWeights(), debug_mode: bool = True) -> OptimizationResponse | None:
    """
    Main optimization engine coordinator.

    Initializes HiGHS, creates decision and auxiliary variables,
    applies all constraints, sets up the objective function,
    runs the solver, and extracts the final timetable.
    """

    # 1. Initialize the HiGHS solver
    model = Highs()

    # Optional: Solver configurations (e.g., disable verbose command line output)
    model.setOptionValue("output_flag", debug_mode)
    model.setOptionValue("time_limit", SOLVE_TIME_LIMIT_SECONDS)
    model.setOptionValue("mip_rel_gap", SOLVE_MIP_REL_GAP)

    # 2. Create decision variables (with domain pruning already applied)
    variables = create_variables(model, data)
    auxiliary = create_auxiliary_variables(model, data, variables)

    # 3. Apply all constraints (Hard and Soft)
    add_all_constraints(model, data, variables, auxiliary)

    # 4. Configure the Objective Function
    build_objective(model, variables, auxiliary, data)

    # 5. Execute the optimization
    run_status = model.run()

    # 6. Verify if the solver found a feasible or optimal solution.
    # kOptimal is ideal; kTimeLimit means the time budget ran out before
    # optimality was proven, but a feasible (just not certified-best)
    # schedule may still be available and is good enough to use.
    model_status = model.getModelStatus()

    has_usable_solution = model_status == HighsModelStatus.kOptimal or (
        model_status == HighsModelStatus.kTimeLimit
        and model.getInfo().primal_solution_status == highspy.kSolutionStatusFeasible
    )

    if not has_usable_solution:
        return None

    # 7. Extract the numerical solution back to the academic domain (DTOs)
    return extract_solution(model, variables)

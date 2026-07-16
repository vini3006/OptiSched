from highspy import Highs, HighsModelStatus
from models import OptimizationResponse

from mapper import SolverData
from .variables import create_variables, create_auxiliary_variables
from .constraints import add_all_constraints
from .objective import build_objective, ObjectiveWeights
from .extractor import extract_solution

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

    # 2. Create decision variables (with domain pruning already applied)
    variables = create_variables(model, data)
    auxiliary = create_auxiliary_variables(model, data)

    # 3. Apply all constraints (Hard and Soft)
    add_all_constraints(model, data, variables, auxiliary)

    # 4. Configure the Objective Function
    build_objective(model, auxiliary, weights)

    # 5. Execute the optimization
    run_status = model.run()
    
    # 6. Verify if the solver found a feasible or optimal solution
    # HighsModelStatus.kModelStatusOptimal is ideal, but for complex problems
    # kModelStatusFeasible also yields a valid timetable structure.
    model_status = model.getModelStatus()

    if model_status != HighsModelStatus.kOptimal:
        print(f"⚠️ Could not find a feasible schedule. Model status: {model_status}")
        return None

    # 7. Extract the numerical solution back to the academic domain (DTOs)
    return extract_solution(model, variables)

from fastapi import APIRouter, HTTPException

from models import OptimizationRequest, OptimizationResponse
from mapper import build_solver_data, SolverDataValidationError
from solver import solve_scheduling_problem

router = APIRouter()

@router.post("/optimize", response_model=OptimizationResponse)
def optimize(request: OptimizationRequest) -> OptimizationResponse:
    try:
        data = build_solver_data(request)
    except SolverDataValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    
    diagnostics: dict = {}
    result = solve_scheduling_problem(
        data,
        data.objective_weights,
        debug_mode=False,
        time_limit_seconds=request.solver_time_limit_seconds,
        diagnostics=diagnostics,
    )

    if result is None:
        if diagnostics.get("hit_time_limit"):
            detail = (
                "The solver ran out of time before finding any usable schedule. "
                "This doesn't necessarily mean the problem is infeasible — it may "
                "just be large or tightly constrained. Try scoping the generation "
                "to a single course, or raising the solver's time limit."
            )
        else:
            detail = (
                "No feasible schedule could be found for the given constraints, even "
                "though professor qualifications, classroom capacity, and individual "
                "professor availability all passed pre-checks. This usually means two "
                "or more offerings are competing for the same time slots without "
                "enough alternatives — review course/semester conflicts (offerings "
                "that can't run simultaneously) and shared professor availability "
                "across offerings."
            )
        raise HTTPException(status_code=422, detail=detail)

    return result
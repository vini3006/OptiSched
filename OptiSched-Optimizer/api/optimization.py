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
    
    result = solve_scheduling_problem(data, data.objective_weights, debug_mode=False)

    if result is None:
        raise HTTPException(
            status_code=422,
            detail="No feasible schedule could be found for the given constraints"
        )
    
    return result
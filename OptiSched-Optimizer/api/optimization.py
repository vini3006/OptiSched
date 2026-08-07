import os

from fastapi import APIRouter, Depends, Header, HTTPException

from models import OptimizationRequest, OptimizationResponse
from mapper import build_solver_data, SolverDataValidationError
from solver import solve_scheduling_problem

router = APIRouter()

# The only caller is the Java API's OptimizerClient (see RestClientConfig.java,
# which sends this same header on every request) — this isn't end-user auth,
# just closing off direct public access to a service that otherwise has none
# of its own (docker-compose used to publish its port straight to the host).
OPTIMIZER_INTERNAL_KEY = os.environ.get("OPTIMIZER_INTERNAL_KEY")

# Independent of the solver's own default (solver/solver.py's
# SOLVE_TIME_LIMIT_SECONDS) — this is the hard ceiling a client can never
# raise past, regardless of what it sends in solver_time_limit_seconds.
MAX_SOLVER_TIME_LIMIT_SECONDS = 120.0


def verify_internal_key(x_internal_key: str | None = Header(default=None)) -> None:
    # Fails closed: if the env var itself isn't set (e.g. forgotten in a prod
    # .env), every request is rejected rather than silently accepted — a loud
    # misconfiguration beats a silent open door.
    if not OPTIMIZER_INTERNAL_KEY or x_internal_key != OPTIMIZER_INTERNAL_KEY:
        raise HTTPException(status_code=401, detail="Missing or invalid X-Internal-Key.")


@router.post("/optimize", response_model=OptimizationResponse, dependencies=[Depends(verify_internal_key)])
def optimize(request: OptimizationRequest) -> OptimizationResponse:
    try:
        data = build_solver_data(request)
    except SolverDataValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))

    time_limit_seconds = request.solver_time_limit_seconds
    if time_limit_seconds is not None:
        time_limit_seconds = min(time_limit_seconds, MAX_SOLVER_TIME_LIMIT_SECONDS)

    diagnostics: dict = {}
    result = solve_scheduling_problem(
        data,
        debug_mode=False,
        time_limit_seconds=time_limit_seconds,
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
from fastapi import FastAPI
from api.optimization import router as optimization_router

app = FastAPI(
    title="OptiSched Optimizer",
    description="Optimization service for OptiSched",
    version="1.0.0"
)
app.include_router(optimization_router, prefix="/api")


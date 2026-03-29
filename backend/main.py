from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import national, regional

app = FastAPI(
    title="SNIES Dashboard API",
    description="Backend for SNIES Dashboard using DuckDB and Polars",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to SNIES Dashboard API"}

app.include_router(national.router)
app.include_router(regional.router)

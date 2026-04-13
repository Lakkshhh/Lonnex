from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.loans import router as loans_router
from routers.pipeline import router as pipeline_router
from routers.pipeline import simulate_router


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(loans_router, prefix="/loans", tags=["loans"])
app.include_router(pipeline_router, prefix="/pipeline", tags=["pipeline"])
app.include_router(simulate_router, prefix="/api", tags=["simulate"])


@app.get("/health")
def health():
    return {"status": "ok"}

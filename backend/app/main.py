from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, takes, websocket, reports

settings = get_settings()

app = FastAPI(
    title="Hot Takes API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(takes.router)
app.include_router(websocket.router)
app.include_router(reports.router)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
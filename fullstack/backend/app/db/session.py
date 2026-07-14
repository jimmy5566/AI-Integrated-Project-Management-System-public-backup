from sqlmodel import Session
from app.core.db import engine

def get_session() -> Session:
    return Session(engine)
from datetime import datetime 
from typing import Optional 
from sqlmodel import SQLModel, Field, create_engine, Session, select 
 
from .config import settings 
 
engine = create_engine( 
    settings.database_url, 
    connect_args={"check_same_thread": False} if 
settings.database_url.startswith("sqlite") else {}, 
) 
 
class Thread(SQLModel, table=True): 
    id: Optional[int] = Field(default=None, primary_key=True) 
    ext_id: str = Field(index=True, description="ID externo del hilo 
(foro/propuesta)") 
    title: str 
    created_at: datetime = Field(default_factory=datetime.utcnow) 
 
class Message(SQLModel, table=True): 
    id: Optional[int] = Field(default=None, primary_key=True) 
    thread_id: int = Field(index=True, foreign_key="thread.id") 
    author: str 
    text: str 
    ts: datetime = Field(default_factory=datetime.utcnow, index=True) 
 
class Summary(SQLModel, table=True): 
    id: Optional[int] = Field(default=None, primary_key=True) 
    thread_id: int = Field(index=True, foreign_key="thread.id") 
    tldr: str 
    key_arguments: str  # JSON-serialized list 
    tags: str           # JSON-serialized list 
    agenda: str         # JSON-serialized list 
    created_at: datetime = Field(default_factory=datetime.utcnow, 
index=True) 
 
class Feedback(SQLModel, table=True): 
    id: Optional[int] = Field(default=None, primary_key=True) 
    thread_id: int = Field(index=True, foreign_key="thread.id") 
    score: int = Field(ge=1, le=5) 
    created_at: datetime = Field(default_factory=datetime.utcnow) 
 
def init_db() -> None: 
    SQLModel.metadata.create_all(engine) 
 
def latest_summary(sess: Session, thread_id: int) -> 
Optional[Summary]: 
    stmt = select(Summary).where(Summary.thread_id == 
thread_id).order_by(Summary.created_at.desc()) 
    return sess.exec(stmt).first() 
 
 

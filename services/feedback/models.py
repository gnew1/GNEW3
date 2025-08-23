from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON, Text, func, UniqueConstraint

class Base(DeclarativeBase): pass

class Survey(Base):
    __tablename__ = "surveys"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True)
    trigger: Mapped[str] = mapped_column(String(64))  # e.g. post-onboarding, post-votacion
    locale: Mapped[str] = mapped_column(String(8), default="en")
    frequency_days: Mapped[int] = mapped_column(Integer, default=30)
    questions: Mapped[dict] = mapped_column(JSON)  # [{id,type,label,scale}]
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

class Response(Base):
    __tablename__ = "responses"
    id: Mapped[int] = mapped_column(primary_key=True)
    survey_id: Mapped[int] = mapped_column(ForeignKey("surveys.id", ondelete="CASCADE"))
    user_id: Mapped[str] = mapped_column(String(128), index=True)
    event: Mapped[str] = mapped_column(String(64))
    answers: Mapped[dict] = mapped_column(JSON)  # {qid:value}
    nps_bucket: Mapped[str | None] = mapped_column(String(16), nullable=True)  # detractor|neutral|promoter
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    survey: Mapped["Survey"] = relationship(backref="responses")

    __table_args__ = (
        UniqueConstraint("survey_id", "user_id", "event", name="uq_one_response_per_event"),
    )


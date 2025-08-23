from pydantic import BaseModel, Field, conint
from typing import Literal, Any

QuestionType = Literal["nps","csat","text"]
class Question(BaseModel):
    id: str
    type: QuestionType
    label: str
    scale: conint(ge=1, le=11) | None = None  # for nps (0-10) or csat (1-5)

class SurveyCreate(BaseModel):
    name: str
    trigger: str
    locale: str = "en"
    frequency_days: int = 30
    questions: list[Question]

class SurveyOut(SurveyCreate):
    id: int

class ResponseIn(BaseModel):
    survey_id: int
    event: str
    user_id: str
    answers: dict[str, Any]
    comment: str | None = None

class ResponseOut(BaseModel):
    id: int
    survey_id: int
    created_at: str


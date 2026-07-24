"""Request models. Kept deliberately small for the POC."""
from typing import Literal, Optional

from pydantic import BaseModel


class TermIn(BaseModel):
    code: str                      # e.g. FALL2026
    name: str                      # e.g. "Fall 2026"
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None
    is_current: bool = False


class PersonIn(BaseModel):
    sis_id: str
    first: str
    last: str
    email: str
    kind: Literal["student", "teacher", "staff"] = "student"


class CourseIn(BaseModel):
    sis_id: str
    code: str
    title: str


class RegisterIn(BaseModel):
    person_sis_id: str
    course_sis_id: str
    term_code: Optional[str] = None                     # defaults to the current term
    role: Literal["student", "teacher"] = "student"

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
    national_id: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    birth_date: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    hs_avg: Optional[float] = None


class CourseIn(BaseModel):
    sis_id: str
    code: str
    title: str
    credits: int = 3
    days: Optional[str] = None       # e.g. 'ح ث خ'
    time_slot: Optional[str] = None  # e.g. '10:00 - 11:30'
    room: Optional[str] = None
    capacity: int = 30


class RegisterIn(BaseModel):
    person_sis_id: str
    course_sis_id: str
    term_code: Optional[str] = None                     # defaults to the current term
    role: Literal["student", "teacher"] = "student"


class LoginIn(BaseModel):
    sis_id: str                    # a person's SIS id, or 'admin' for the registrar

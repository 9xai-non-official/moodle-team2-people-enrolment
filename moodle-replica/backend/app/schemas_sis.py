"""SIS ingest request models (SIS-WHOCAN-SYNC-CONTRACT §9a).

The event is deliberately self-contained: it carries the person, the course,
and the term WITH ITS DATES, so WhoCan needs no term table of its own — the
enrolment window (time_start/time_end) is stamped per path and the existing
liveness conditions + expiry worker do the rest (contract §6-7).
"""
from typing import Literal, Optional

from pydantic import BaseModel, Field


class SisTerm(BaseModel):
    code: str                                    # e.g. FALL2026
    starts_at: Optional[str] = None              # ISO date/datetime
    ends_at: Optional[str] = None


class SisPerson(BaseModel):
    sis_id: str = Field(min_length=1)            # matched on app_user.id_number
    first: str
    last: str
    email: str


class SisCourse(BaseModel):
    sis_id: str = Field(min_length=1)            # matched on course.external_ref
    code: str                                    # short_name
    title: str                                   # full_name


class SisEvent(BaseModel):
    type: Literal["enrol", "drop", "account"]
    term: SisTerm
    person: SisPerson
    course: Optional[SisCourse] = None           # required for enrol/drop
    role: Literal["student", "teacher"] = "student"
    active: Optional[bool] = None                # account events: gate verdict

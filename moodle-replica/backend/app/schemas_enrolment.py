"""Pydantic models for the enrolment API — owner: Yaman (task 01).

Field names follow frontend/CONTRACTS.md (Enrolment section) so Issa's pages
work unchanged; where my task-01 spec adds fields the contract lacks
(enrolment_status + account_suspended as SEPARATE facts — C-6), both shapes
are returned side by side.
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

EnrolmentStatus = Literal["active", "suspended"]
# MethodKind covers everything a RESPONSE may carry, including 'sis' (the
# student-portal door, T2-SIS-001). CreatableMethodKind is the REQUEST subset:
# sis methods are created only by the SIS ingest (services/sis_ingest.py),
# never by hand through the generic method API — a hand-made sis door would
# masquerade as portal-managed without any portal behind it.
MethodKind = Literal["manual", "self", "cohort", "guest", "sis"]
CreatableMethodKind = Literal["manual", "self", "cohort", "guest"]
MethodStatus = Literal["enabled", "disabled"]


# ---- requests -------------------------------------------------------------

class MethodCreate(BaseModel):
    method: CreatableMethodKind
    status: MethodStatus = "enabled"
    default_role_id: int | None = None
    cohort_id: int | None = None          # required when method='cohort'
    enrol_start: datetime | None = None
    enrol_end: datetime | None = None
    # self → {"key", "use_group_keys", "max_enrolled", "inactivity_days"}
    # cohort → {"sync_group_id"}
    config: dict = Field(default_factory=dict)


class MethodPatch(BaseModel):
    status: MethodStatus | None = None
    default_role_id: int | None = None
    enrol_start: datetime | None = None
    enrol_end: datetime | None = None
    config: dict | None = None


class EnrolRequest(BaseModel):
    user_id: int
    role_id: int | None = None            # default: the method's default_role_id
    time_start: datetime | None = None
    time_end: datetime | None = None      # null = forever
    # T2-ENR-002: re-enrolling an existing row PRESERVES its status unless the
    # caller explicitly opts into reactivation. New rows are always active.
    activate: bool = False


class CourseEnrolRequest(EnrolRequest):
    """Contract alias POST /courses/{id}/enrol — method optional, defaults to
    the course's manual method."""
    method_id: int | None = None


class EnrolmentStatusPatch(BaseModel):
    status: EnrolmentStatus


class SelfEnrolRequest(BaseModel):
    user_id: int
    key: str | None = None


class CohortCreate(BaseModel):
    name: str
    id_number: str | None = None
    description: str = ""


class CohortMemberAdd(BaseModel):
    user_id: int


# ---- responses ------------------------------------------------------------

class PathOut(BaseModel):
    enrolment_id: int
    method_id: int
    method: MethodKind
    method_status: MethodStatus
    status: EnrolmentStatus
    time_start: datetime | None
    time_end: datetime | None
    live: bool                             # the four §6.2 conditions, exactly
    window_ok: bool


class ParticipantOut(BaseModel):
    user_id: int
    full_name: str
    username: str
    roles: list[str]
    paths: list[PathOut]
    # Two separate switches (C-6) …
    enrolment_status: Literal["active", "suspended", "expired", "method_disabled"]
    account_suspended: bool
    # … and the folded badge value the UI renders.
    effective_status: Literal["active", "suspended", "expired",
                              "method_disabled", "account_suspended"]
    groups: list[dict]
    last_access: datetime | None


class OtherUserOut(BaseModel):
    user_id: int
    full_name: str
    roles: list[str]
    note: str


class MethodOut(BaseModel):
    id: int
    method: MethodKind
    status: MethodStatus
    default_role: dict | None
    cohort: dict | None
    enrol_start: datetime | None
    enrol_end: datetime | None
    config: dict
    enrolled_count: int


class MethodEnrolmentOut(BaseModel):
    enrolment_id: int
    user_id: int
    full_name: str
    status: EnrolmentStatus
    time_start: datetime | None
    time_end: datetime | None


class GateOut(BaseModel):
    gate: Literal["course_visible", "method_enabled", "window_open",
                  "capacity", "key_match"]
    passed: bool
    reason: str = ""


class SelfEnrolVerdict(BaseModel):
    enrolled: bool
    failing_gate: str | None
    gates: list[GateOut]                   # always the full chain up to the failure
    blocking_reasons: list[str]
    method_id: int | None = None


class SyncResult(BaseModel):
    added: list[int]
    removed: list[int]
    kept: list[int]
    skipped: bool = False
    reason: str | None = None


class UserPathOut(BaseModel):
    course: dict                           # {id, short_name, deleted}
    method_id: int
    method: MethodKind
    method_status: MethodStatus
    status: EnrolmentStatus
    time_start: datetime | None
    time_end: datetime | None
    live: bool


class CohortOut(BaseModel):
    id: int
    name: str
    id_number: str | None
    member_count: int
    synced_courses: list[str]


class GuestPreviewOut(BaseModel):
    guest_access: bool
    method_id: int | None = None
    has_password: bool = False
    reason: str | None = None

"""Pydantic models shared across routers. Skeleton shapes — extend as needed."""
from pydantic import BaseModel


class User(BaseModel):
    id: int
    username: str
    firstname: str
    lastname: str
    email: str


class Course(BaseModel):
    id: int
    shortname: str
    fullname: str


class Role(BaseModel):
    id: int
    shortname: str  # e.g. "student", "teacher", "editingteacher", "manager"
    name: str


class Group(BaseModel):
    id: int
    courseid: int
    name: str


class Enrolment(BaseModel):
    id: int
    userid: int
    courseid: int
    roleid: int

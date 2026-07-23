"""msteams — plugin #1: Microsoft Teams integration.

Course created → a real MS Teams team (Graph API, app-only client
credentials); enrolment created → member added; enrolment deleted on the
LAST path → member removed; course deleted → team archived. Provisioning
status lives in msteams_course_team (plugin-owned migration) and is pushed
live to the frontend over Ably (course:{id} / msteams.status).
"""
from app.plugins.msteams import handlers

MANIFEST = {
    "name": "msteams",
    "version": "1.0.0",
    "events": [
        "course.created",
        "enrolment.created",
        "enrolment.deleted",
        "course.deleted",
    ],
    # (name, cap_type, min_context_level, component, risks) — none yet: the
    # plugin admin surface is gated by the core plugin:manage capability.
    "capabilities": [],
    "settings_schema": [
        {"key": "tenant_id", "label": "Entra tenant ID", "type": "text",
         "required": True},
        {"key": "client_id", "label": "App (client) ID", "type": "text",
         "required": True},
        {"key": "client_secret", "label": "Client secret", "type": "text",
         "required": True, "secret": True},
        {"key": "owner_upn", "label": "Team owner UPN", "type": "text",
         "required": True},
        {"key": "team_name_template", "label": "Team name template",
         "type": "text", "default": "{short_name} — {full_name}"},
        {"key": "archive_on_delete",
         "label": "Archive team on course delete", "type": "bool",
         "default": True},
        {"key": "email_overrides",
         "label": "username → AAD UPN overrides (JSON)", "type": "json",
         "default": {}},
    ],
    "migrations_dir": "migrations",
}

HANDLERS = {
    "course.created": handlers.on_course_created,
    "enrolment.created": handlers.on_enrolment_created,
    "enrolment.deleted": handlers.on_enrolment_deleted,
    "course.deleted": handlers.on_course_deleted,
}

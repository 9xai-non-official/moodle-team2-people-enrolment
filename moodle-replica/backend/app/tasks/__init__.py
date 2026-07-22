"""Scheduled / background task entry points.

Tasks stay THIN: domain logic lives in app/services/*. A task module wires a
scheduled trigger to one or more service calls and returns a summary.
"""

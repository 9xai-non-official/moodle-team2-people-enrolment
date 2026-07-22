// Roles / Permissions mocks — RETIRED (WP04 CR-6).
//
// This file used to re-implement the entire permission engine in JS (capability
// resolution, the assignable matrix, the gate pipeline) and returned a response
// shape that DIFFERED from the real backend (verdict/gates vs decision/
// blocking_reasons, capability_values as an array vs a dict, actor_id vs
// actor_user_id). That made it a second source of truth that drifts from the
// real resolver.
//
// The real backend now implements all of this (app/services/permissions.py) and
// is the single source of truth. By exporting NO routes, every /api/roles and
// /api/permissions call falls through to the real backend (see mocks/index.js
// "unmatched paths fall through"). Run the roles/permissions demo in real mode
// (VITE_USE_MOCKS unset) with AUTH_DEV_LOGIN=1 + AUTH_SECRET set on the backend.
export const routes = [];

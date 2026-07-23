// Assignments tab — view and manage MANUAL role assignments at one context.
//
// Identity (§7): the actor is the authenticated PRINCIPAL (api.js Bearer), never
// a body field. /assignable is principal-relative, so "acting as a non-editing
// teacher" visibly shrinks the role list. POST sends only {user_id, role_id,
// context_id}; DELETE targets assignment_id. Enrolment-owned rows (component
// like enrol_%) are NOT removable here — the backend refuses them (403) and the
// UI disables the action with the reason, never converting provenance.
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiDelete } from "../../api";
import { useLang } from "../../context/Lang";
import Icon from "./icons";
import {
  Avatar,
  Btn,
  Combo,
  Dialog,
  EmptyState,
  ScopedError,
  SectionCard,
  SkeletonRows,
  Spinner,
  T,
  Tag,
  Tech,
  both,
  pick,
  useIsNarrow,
} from "./ui";
import { ContextOption, UserOption, roleByShort, useCatalogs } from "./data";

function ProvenanceTag({ component, itemId, lang }) {
  if (!component) return <Tag tone="info">{pick(lang, "manual", "يدوي")}</Tag>;
  return (
    <Tag tone="neutral" title={both("Managed by an enrolment method", "مُدار بواسطة طريقة تسجيل")}>
      <Icon name="gitBranch" size={12} />
      <Tech>
        {component}
        {itemId ? ` #${itemId}` : ""}
      </Tech>
    </Tag>
  );
}

// User-assignments drawer: every role the user holds, with provenance.
function UserAssignmentsDialog({ userId, userName, onClose, lang }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (userId == null) return;
    apiGet(`/api/roles/users/${userId}/assignments`)
      .then(setRows)
      .catch(setError);
  }, [userId]);
  return (
    <Dialog
      open={userId != null}
      onClose={onClose}
      title={`${pick(lang, "Assignments", "التعيينات")} — ${userName ?? ""}`}
      titleAr=""
      icon="gitBranch"
      dir={lang === "ar" ? "rtl" : "ltr"}
      size="lg"
    >
      {error ? (
        <ScopedError error={error} lang={lang} />
      ) : rows == null ? (
        <Spinner lang={lang} />
      ) : rows.length === 0 ? (
        <EmptyState icon="gitBranch" en="This user holds no roles." ar="لا يحمل هذا المستخدم أي أدوار." compact />
      ) : (
        <div className="rl-tablewrap">
          <table className="rl-table">
            <thead>
              <tr>
                <th scope="col">{pick(lang, "Role", "الدور")}</th>
                <th scope="col">{pick(lang, "Context", "السياق")}</th>
                <th scope="col">{pick(lang, "Provenance", "المصدر")}</th>
                <th scope="col">{pick(lang, "Assigned", "التعيين")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.assignment_id}>
                  <td>
                    {r.role}
                    <span className="rl-muted"> · #{r.assignment_id}</span>
                  </td>
                  <td>
                    <Tech>{r.context}</Tech>
                    <span className="rl-muted">
                      {" "}
                      <Tech>{r.context_path}</Tech>
                    </span>
                  </td>
                  <td>
                    <ProvenanceTag component={r.provenance === "manual" ? "" : r.provenance} itemId={r.item_id} lang={lang} />
                  </td>
                  <td>
                    {r.assigned_at ? (
                      <Tech>{String(r.assigned_at).slice(0, 10)}</Tech>
                    ) : (
                      <span className="rl-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Dialog>
  );
}

export default function AssignRoleForm() {
  const { lang } = useLang();
  const { users, roles, contexts, courses, loading: catLoading, error: catError, reload } = useCatalogs();
  const narrow = useIsNarrow();

  const [contextId, setContextId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [roleShort, setRoleShort] = useState("");
  const [assignable, setAssignable] = useState(null); // {can_assign, assignable[], based_on_role, matrix}
  const [assignErr, setAssignErr] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableError, setTableError] = useState(null);
  const [tick, setTick] = useState(0);

  const [confirm, setConfirm] = useState(null); // assignment row pending removal
  const [removing, setRemoving] = useState(false);
  const [detailsUser, setDetailsUser] = useState(null);

  useEffect(() => {
    if (contextId == null && contexts.length) setContextId(contexts[0].id);
  }, [contexts, contextId]);

  // assignable roles — principal-relative (the matrix demo)
  useEffect(() => {
    if (!contextId) return;
    let live = true;
    setAssignable(null);
    setAssignErr(null);
    setRoleShort("");
    apiGet(`/api/roles/assignable?context_id=${contextId}`)
      .then((data) => {
        if (!live) return;
        setAssignable(data);
        if (data.assignable?.length) setRoleShort(data.assignable[0]);
      })
      .catch((e) => live && setAssignErr(e));
    return () => {
      live = false;
    };
  }, [contextId]);

  // assignments in this context
  useEffect(() => {
    if (!contextId) return;
    let live = true;
    setLoading(true);
    setTableError(null);
    apiGet(`/api/roles/assignments?context_id=${contextId}`)
      .then((data) => live && setRows(data))
      .catch((e) => live && setTableError(e))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [contextId, tick]);

  const assignableRoleObjs = useMemo(
    () => (assignable?.assignable ?? []).map((sn) => roleByShort(roles, sn) ?? { short_name: sn, name: sn, id: null }),
    [assignable, roles],
  );

  const submit = useCallback(() => {
    const role = roleByShort(roles, roleShort);
    if (!contextId || !userId || !role?.id) return;
    setSubmitting(true);
    setFormError(null);
    apiPost("/api/roles/assignments", { user_id: userId, role_id: role.id, context_id: contextId })
      .then(() => {
        setUserId(null);
        setTick((t) => t + 1); // refetch table
      })
      .catch((e) => setFormError(e))
      .finally(() => setSubmitting(false));
  }, [roles, roleShort, contextId, userId]);

  const doRemove = useCallback(() => {
    if (!confirm) return;
    setRemoving(true);
    apiDelete(`/api/roles/assignments/${confirm.assignment_id}`)
      .then(() => {
        setConfirm(null);
        setTick((t) => t + 1);
      })
      .catch((e) => setFormError(e))
      .finally(() => setRemoving(false));
  }, [confirm]);

  const selectedCtx = contexts.find((c) => c.id === contextId);
  const canAssign = assignable?.can_assign && assignableRoleObjs.length > 0;

  if (catError) {
    return (
      <SectionCard icon="users" title="Assignments" titleAr="التعيينات">
        <ScopedError error={catError} onRetry={reload} lang={lang} />
      </SectionCard>
    );
  }

  return (
    <div className="rl-assign">
      <SectionCard icon="userRoundPlus" tone="blue" title="Assign a role" titleAr="تعيين دور">
        <div className="rl-controls">
          <label className="rl-field rl-field--grow">
            <span className="rl-field__label">
              <Icon name="folder" size={14} />
              <T en="Context" ar="السياق" />
            </span>
            <Combo
              items={contexts}
              value={contextId}
              onChange={(id) => setContextId(id)}
              itemKey={(c) => c.id}
              itemLabel={(c) => c.label}
              itemSearch={(c) => `${c.label} ${c.level} ${c.path}`}
              renderItem={(c) => <ContextOption ctx={c} courses={courses} lang={lang} />}
              leadingIcon="folder"
              ariaLabel={both("Context", "السياق")}
              loading={catLoading}
              lang={lang}
            />
          </label>

          <label className="rl-field rl-field--grow">
            <span className="rl-field__label">
              <Icon name="userRound" size={14} />
              <T en="User" ar="المستخدم" />
            </span>
            <Combo
              items={users}
              value={userId}
              onChange={(id) => setUserId(id)}
              itemKey={(u) => u.id}
              itemLabel={(u) => u.full_name}
              itemSearch={(u) => `${u.full_name} ${u.username}`}
              renderItem={(u) => <UserOption u={u} lang={lang} />}
              leadingIcon="userRound"
              ariaLabel={both("User", "المستخدم")}
              placeholder={pick(lang, "Select user", "اختر مستخدماً")}
              loading={catLoading}
              lang={lang}
              invalid={!userId}
            />
          </label>

          <label className="rl-field">
            <span className="rl-field__label">
              <Icon name="shieldPlus" size={14} />
              <T en="Role" ar="الدور" />
            </span>
            <select
              className="rl-select"
              value={roleShort}
              onChange={(e) => setRoleShort(e.target.value)}
              disabled={!canAssign}
              aria-label={both("Assignable role", "دور قابل للتعيين")}
            >
              {!canAssign && <option value="">{pick(lang, "none assignable", "لا شيء قابل للتعيين")}</option>}
              {assignableRoleObjs.map((r) => (
                <option key={r.short_name} value={r.short_name}>
                  {r.name} ({r.short_name})
                </option>
              ))}
            </select>
          </label>

          <div className="rl-field rl-field--check">
            <Btn
              variant="primary"
              icon="userRoundPlus"
              disabled={!canAssign || !userId || submitting}
              onClick={submit}
            >
              {submitting ? pick(lang, "Assigning", "جارٍ التعيين") : pick(lang, "Assign role", "تعيين دور")}
            </Btn>
          </div>
        </div>

        {/* matrix explanation */}
        {assignErr ? (
          <ScopedError error={assignErr} lang={lang} compact />
        ) : assignable == null ? (
          <Spinner lang={lang} />
        ) : (
          <p className="rl-matrixnote">
            <Icon name="info" size={13} />
            <span>
              {assignable.can_assign ? (
                <>
                  {pick(lang, "Assignable roles reflect the allow-assign matrix for your role", "الأدوار القابلة للتعيين تعكس مصفوفة الإسناد لدورك")}{" "}
                  (<Tech>{assignable.based_on_role ?? "—"}</Tech>).{" "}
                  {pick(
                    lang,
                    "role:assign alone is not enough — the matrix is also enforced server-side.",
                    "role:assign وحدها لا تكفي — تُفرض المصفوفة أيضاً من الخادم.",
                  )}
                </>
              ) : (
                pick(
                  lang,
                  "You cannot assign roles at this context (missing role:assign, or no matrix row).",
                  "لا يمكنك تعيين أدوار في هذا السياق (تنقص role:assign أو لا صف في المصفوفة).",
                )
              )}
            </span>
          </p>
        )}

        {formError && <ScopedError error={formError} lang={lang} compact />}
      </SectionCard>

      <SectionCard
        icon="users"
        title="Assignments in this context"
        titleAr="التعيينات في هذا السياق"
        actions={selectedCtx && <Tech>{selectedCtx.label}</Tech>}
      >
        {tableError ? (
          <ScopedError error={tableError} onRetry={() => setTick((t) => t + 1)} lang={lang} />
        ) : loading ? (
          <SkeletonRows lines={4} />
        ) : rows.length === 0 ? (
          <EmptyState icon="users" en="No role assignments exist in this context." ar="لا تعيينات أدوار في هذا السياق." />
        ) : narrow ? (
          <div className="rl-assigncards">
            {rows.map((r) => (
              <AssignCard
                key={r.assignment_id}
                r={r}
                lang={lang}
                onDetails={() => setDetailsUser(r.user)}
                onRemove={() => setConfirm(r)}
              />
            ))}
          </div>
        ) : (
          <div className="rl-tablewrap">
            <table className="rl-table">
              <thead>
                <tr>
                  <th scope="col">{pick(lang, "User", "المستخدم")}</th>
                  <th scope="col">{pick(lang, "Role", "الدور")}</th>
                  <th scope="col">{pick(lang, "Provenance", "المصدر")}</th>
                  <th scope="col" className="rl-th-actions">
                    {pick(lang, "Actions", "إجراءات")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isManual = !r.component;
                  return (
                    <tr key={r.assignment_id}>
                      <td>
                        <span className="rl-userc">
                          <Avatar name={r.user.full_name} size={28} />
                          {r.user.full_name}
                        </span>
                      </td>
                      <td>
                        <Tech>{r.role.short_name}</Tech>
                      </td>
                      <td>
                        <ProvenanceTag component={r.component} itemId={r.item_id} lang={lang} />
                      </td>
                      <td>
                        <div className="rl-rowactions">
                          <button
                            type="button"
                            className="rl-iconbtn"
                            aria-label={both("View user's assignments", "عرض تعيينات المستخدم")}
                            title={pick(lang, "User's assignments", "تعيينات المستخدم")}
                            onClick={() => setDetailsUser(r.user)}
                          >
                            <Icon name="eye" size={16} />
                          </button>
                          <button
                            type="button"
                            className="rl-iconbtn rl-iconbtn--danger"
                            disabled={!isManual}
                            aria-label={both("Remove assignment", "إزالة التعيين")}
                            title={
                              isManual
                                ? pick(lang, "Remove", "إزالة")
                                : pick(lang, "This assignment is managed by enrolment.", "هذا التعيين مُدار بواسطة التسجيل.")
                            }
                            onClick={() => isManual && setConfirm(r)}
                          >
                            <Icon name="userMinus" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* remove confirmation */}
      <Dialog
        open={!!confirm}
        onClose={() => !removing && setConfirm(null)}
        title={pick(lang, "Remove assignment", "إزالة التعيين")}
        titleAr=""
        icon="userMinus"
        dir={lang === "ar" ? "rtl" : "ltr"}
        size="sm"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setConfirm(null)} disabled={removing}>
              {pick(lang, "Cancel", "إلغاء")}
            </Btn>
            <Btn variant="danger" icon={removing ? "loader" : "userMinus"} onClick={doRemove} disabled={removing}>
              {removing ? pick(lang, "Removing", "جارٍ الإزالة") : pick(lang, "Remove", "إزالة")}
            </Btn>
          </>
        }
      >
        {confirm && (
          <div className="rl-confirm">
            <p>{pick(lang, "This unassigns the role. It can be re-assigned.", "هذا يلغي تعيين الدور. يمكن إعادة تعيينه.")}</p>
            <dl className="rl-confirm__facts">
              <div>
                <dt>{pick(lang, "User", "المستخدم")}</dt>
                <dd>{confirm.user.full_name}</dd>
              </div>
              <div>
                <dt>{pick(lang, "Role", "الدور")}</dt>
                <dd>
                  <Tech>{confirm.role.short_name}</Tech>
                </dd>
              </div>
              <div>
                <dt>{pick(lang, "Context", "السياق")}</dt>
                <dd>
                  <Tech>{confirm.context.label}</Tech>
                </dd>
              </div>
              <div>
                <dt>{pick(lang, "Provenance", "المصدر")}</dt>
                <dd>
                  <ProvenanceTag component={confirm.component} itemId={confirm.item_id} lang={lang} />
                </dd>
              </div>
            </dl>
          </div>
        )}
      </Dialog>

      <UserAssignmentsDialog
        userId={detailsUser?.id ?? null}
        userName={detailsUser?.full_name}
        onClose={() => setDetailsUser(null)}
        lang={lang}
      />
    </div>
  );
}

function AssignCard({ r, lang, onDetails, onRemove }) {
  const isManual = !r.component;
  return (
    <div className="rl-assigncard">
      <div className="rl-assigncard__top">
        <span className="rl-userc">
          <Avatar name={r.user.full_name} size={30} />
          {r.user.full_name}
        </span>
        <Tech>{r.role.short_name}</Tech>
      </div>
      <div className="rl-assigncard__mid">
        <ProvenanceTag component={r.component} itemId={r.item_id} lang={lang} />
        <Tech>{r.context.label}</Tech>
      </div>
      <div className="rl-assigncard__actions">
        <Btn variant="ghost" size="sm" icon="eye" onClick={onDetails}>
          {pick(lang, "Details", "تفاصيل")}
        </Btn>
        <Btn
          variant="danger"
          size="sm"
          icon="userMinus"
          disabled={!isManual}
          title={isManual ? undefined : pick(lang, "Managed by enrolment", "مُدار بالتسجيل")}
          onClick={() => isManual && onRemove()}
        >
          {pick(lang, "Remove", "إزالة")}
        </Btn>
      </div>
    </div>
  );
}

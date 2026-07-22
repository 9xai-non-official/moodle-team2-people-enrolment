// Small shared chrome for a hard-case workspace: the section heading (an h2
// under the page's single h1) and the "see it in context" link that jumps to
// where the rule also lives in the app — preserving the repo's real navigation
// rather than duplicating those pages. Also a live/mock data-source note so
// illustrative mock data is never presented as live backend data.
import { USE_MOCKS } from "../../api";
import Icon from "./icons";
import { Bi, pick } from "./ui";

export function WorkspaceIntro({ code, icon, en, ar, subEn, subAr, headingId }) {
  return (
    <header className="dm-wsintro">
      <h2 id={headingId} className="dm-wsintro__title">
        <span className="dm-wsintro__code">{code}</span>
        <span className="dm-wsintro__ic">
          <Icon name={icon} />
        </span>
        <Bi en={en} ar={ar} />
      </h2>
      <p className="dm-wsintro__sub">
        {subEn}
        <span className="dash-ar" lang="ar">
          {subAr}
        </span>
      </p>
    </header>
  );
}

// Honest banner: says whether the demo is talking to the live backend or the
// in-browser mock fixtures. Uses the same signal (USE_MOCKS) the shell's
// MOCK DATA badge uses.
export function DataSourceNote({ live }) {
  const mock = USE_MOCKS;
  return (
    <p className={`dm-source dm-source--${mock ? "mock" : "live"}`}>
      <Icon name={mock ? "flask" : "route"} />
      {mock ? (
        <Bi
          en="Illustrative data — served from in-browser mock fixtures, not the live backend."
          ar="بيانات توضيحية — من نماذج داخل المتصفح وليست من الخادم الفعلي."
        />
      ) : live ? (
        <Bi en="Live — this runs against the shared backend database." ar="مباشر — يعمل مقابل قاعدة البيانات الفعلية." />
      ) : (
        <Bi en="Live backend — read-only checks against the shared database." ar="خادم مباشر — فحوصات للقراءة فقط." />
      )}
    </p>
  );
}

export function ContextLink({ onNavigate, page, en, ar, lang = "en" }) {
  if (!onNavigate) return null;
  return (
    <button type="button" className="dm-ctxlink" onClick={() => onNavigate(page)}>
      <Icon name="arrow" />
      <span>
        {en}
        <span className="dash-ar" lang="ar">
          {ar}
        </span>
      </span>
      <span className="dm-visually-hidden">{pick(lang, `Open ${page}`, `فتح ${page}`)}</span>
    </button>
  );
}

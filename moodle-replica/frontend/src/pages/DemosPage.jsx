// Demos — an interactive rule-verification workspace. Not a gallery of pretty
// sample data: each hard case runs REAL API calls and shows WHY the result
// happened. HC2 runs live (it really unenrols + re-enrols, with confirmation
// and recovery); HC1/HC3/HC4 are read-only proofs. The page reuses the shared
// shell/theme/language — it only owns its own reading direction, because the
// shell forces .content to LTR for every page except the Dashboard.
import { useState } from "react";
import { useLang } from "../context/Lang";
import ScenarioTabs from "../components/demos/ScenarioTabs";
import HC1Paths from "../components/demos/HC1Paths";
import HC2DropReturn from "../components/demos/HC2DropReturn";
import HC3Scope from "../components/demos/HC3Scope";
import HC4Groups from "../components/demos/HC4Groups";

const SCENARIOS = [
  {
    id: "HC1",
    accent: "blue",
    icon: "gitBranch",
    en: "Manual + cohort",
    ar: "يدوي + فوج",
    descEn: "Two enrolment paths — remove one, still enrolled.",
    descAr: "مساران للتسجيل — احذف واحدًا، يبقى مسجّلًا.",
  },
  {
    id: "HC2",
    accent: "orange",
    icon: "repeat",
    en: "Drop and return",
    ar: "الانسحاب والعودة",
    descEn: "Access changes, historical progress does not.",
    descAr: "يتغيّر الوصول، لا يتغيّر التقدّم السابق.",
  },
  {
    id: "HC3",
    accent: "blue",
    icon: "clipboardCheck",
    en: "TA group marking",
    ar: "تقييم مجموعات المساعد",
    descEn: "A TA grades only the groups scope allows.",
    descAr: "يقيّم المساعد المجموعات التي يسمح بها نطاقه.",
  },
  {
    id: "HC4",
    accent: "blue",
    icon: "combine",
    en: "Two groups",
    ar: "مجموعتان",
    descEn: "Membership of two groups gives the correct union.",
    descAr: "عضوية مجموعتين تمنح الاتحاد الصحيح.",
  },
];

const STORE_KEY = "demos-scenario";
const VALID = new Set(SCENARIOS.map((s) => s.id));

function readInitial() {
  try {
    const v = localStorage.getItem(STORE_KEY);
    return VALID.has(v) ? v : "HC2";
  } catch {
    return "HC2";
  }
}

const PANEL_ID = "dm-workspace";

export default function DemosPage({ onNavigate }) {
  const { lang, dir } = useLang();
  const [active, setActive] = useState(readInitial);

  function choose(id) {
    setActive(id);
    try {
      localStorage.setItem(STORE_KEY, id);
    } catch {
      /* private mode — selection just won't persist across reloads */
    }
  }

  const common = { lang, dir, onNavigate };

  return (
    <div className="demos" dir={dir} lang={lang}>
      <header className="demos__head">
        <h1 className="demos__title">
          <span className="demos__title-en">Demos</span>
          <span className="demos__title-ar" lang="ar">
            العروض التجريبية
          </span>
        </h1>
        <p className="demos__lede">
          <span>Prove the rules, not just the happy path</span>
          <span className="demos__lede-ar" lang="ar">
            أثبت القواعد، وليس المسار السهل فقط
          </span>
        </p>
      </header>

      <ScenarioTabs scenarios={SCENARIOS} active={active} onChange={choose} panelId={PANEL_ID} lang={lang} dir={dir} />

      <div id={PANEL_ID} role="tabpanel" aria-labelledby={`dm-tab-${active}`} className="dm-workspace">
        {active === "HC1" && <HC1Paths {...common} />}
        {active === "HC2" && <HC2DropReturn {...common} />}
        {active === "HC3" && <HC3Scope {...common} />}
        {active === "HC4" && <HC4Groups {...common} />}
      </div>
    </div>
  );
}

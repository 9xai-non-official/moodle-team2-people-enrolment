// FRONTEND PRESENTATION ONLY — this is NOT backend data.
//
// The course contract (GET /api/lms/catalog → course{ id, short_name, full_name,
// visible, group_mode, force_group_mode, deleted }) carries no Arabic title, no
// description, no key topics, and no artwork. This module supplies those
// PRESENTATION details for the catalog UI, keyed by the authoritative
// `short_name`. It is localisation + illustration, never a source of truth:
// the id, names, visibility, group mode, enrolment state and progress all come
// from the API. Teacher is deliberately ABSENT — the contract does not expose
// one, and inventing teacher names would dress fiction up as data (data-integrity
// rule §48 / §25), so the UI shows an honest "not assigned" instead.
//
// Unknown courses (e.g. created at runtime via the mock course-create flow) fall
// back to a neutral generic treatment, so the UI degrades cleanly. Keyed by
// short_name so it survives id churn between mock and live backends.

const PRESENTATION = {
  CS101: {
    name_ar: "مقدمة في علوم الحاسوب",
    blurb_en:
      "An introduction to the foundations of computing: how programs run, how data is represented, and how to reason about problems algorithmically.",
    blurb_ar:
      "مقدمة إلى أسس الحوسبة: كيف تُنفَّذ البرامج، وكيف تُمثَّل البيانات، وكيف نفكر في المسائل بأسلوب خوارزمي.",
    topics: [
      { en: "Algorithmic thinking", ar: "التفكير الخوارزمي" },
      { en: "Data representation", ar: "تمثيل البيانات" },
      { en: "Programming basics", ar: "أساسيات البرمجة" },
      { en: "Problem decomposition", ar: "تفكيك المسائل" },
    ],
    art: "cs",
    accent: "blue",
  },
  MATH200: {
    name_ar: "الرياضيات المتقطعة",
    blurb_en:
      "The mathematics behind computer science — logic and proof, sets and relations, combinatorics, and the graph structures that model real systems.",
    blurb_ar:
      "الرياضيات التي تقوم عليها علوم الحاسوب — المنطق والبرهان، والمجموعات والعلاقات، والتوافيق، وبُنى الرسوم البيانية التي تُنمذج الأنظمة الحقيقية.",
    topics: [
      { en: "Logic & proofs", ar: "المنطق والبراهين" },
      { en: "Sets & relations", ar: "المجموعات والعلاقات" },
      { en: "Combinatorics", ar: "التوافيق" },
      { en: "Graph theory", ar: "نظرية الرسوم البيانية" },
    ],
    art: "math",
    accent: "purple",
  },
  LAB1: {
    name_ar: "المختبر المفتوح",
    blurb_en:
      "A self-paced, open workspace for practising and experimenting outside a fixed syllabus — no completion criteria are configured, so there is no progress to track here.",
    blurb_ar:
      "مساحة عمل مفتوحة ذاتية الوتيرة للتدرب والتجريب خارج منهج ثابت — لا توجد معايير إكمال مُعدّة، لذا لا يوجد تقدم لتتبعه هنا.",
    topics: [], // intentionally empty — exercises the "hide the section cleanly" path
    art: "lab",
    accent: "cyan",
  },
  HIST9: {
    name_ar: "تاريخ الحوسبة",
    blurb_en:
      "From mechanical calculators to modern machines — the people and ideas that shaped computing. (Archived course; served from history snapshots.)",
    blurb_ar:
      "من الآلات الحاسبة الميكانيكية إلى الأجهزة الحديثة — الأشخاص والأفكار التي شكّلت الحوسبة. (مقرر مؤرشف؛ يُعرض من لقطات السجل.)",
    topics: [
      { en: "Early computing", ar: "بدايات الحوسبة" },
      { en: "Pioneers", ar: "الروّاد" },
      { en: "Machine generations", ar: "أجيال الآلات" },
    ],
    art: "history",
    accent: "orange",
  },
};

const FALLBACK = {
  name_ar: null,
  blurb_en: null,
  blurb_ar: null,
  topics: [],
  art: "generic",
  accent: "blue",
};

export function coursePresentation(shortName) {
  return PRESENTATION[shortName] ?? FALLBACK;
}

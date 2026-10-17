// English versions of CMS-managed copy. The main CMS fields stay Indonesian;
// `content.en` holds the English overlay. Empty English fields fall back to
// the Indonesian value so the English site never shows blanks.
import {
  activityKeys,
  defaultActivities,
  legacyActivityDefaults,
} from "./activity-model.js";

export const translatableFields = {
  experiences: ["title", "description", "cardDescription", "duration", "items"],
  activities: [
    "title",
    "summary",
    "description",
    "imageAlt",
    "cardImageAlt",
    "duration",
    "audience",
    "meetingPoint",
    "highlights",
    "preparations",
    "itinerary",
    "faqs",
  ],
  products: ["name", "description", "specification", "details", "specs"],
};
const experienceKeys = ["beginner", "explorer", "specialty"];
const textKeys = [
  "heroEyebrow",
  "heroTitle1",
  "heroTitle2",
  "tagline",
  "heroDescription",
  "heroButton",
  "experiencesHeading",
  "quizTitle",
  "quizDescription",
  "oceanTitle1",
  "oceanTitle2",
  "oceanDescription",
];

const legacyEnglish = {
  duration: "Tailored to your activity plan",
  meetingPoint: "Confirmed with the Zanclus team",
  divingItineraryTitles: [
    "Get to know your plan",
    "Preparation & briefing",
    "Explore underwater",
    "Take home a story",
  ],
};
const facts = {
  diving: {
    duration: "Half day · 2 dives",
    meetingPoint: "Zanclus dive center, Waisai",
  },
  snorkeling: {
    duration: "2 to 4 hours",
    meetingPoint: "Waisai beach or jetty",
  },
  trip: { duration: "A full day or longer", meetingPoint: "Waisai harbour" },
};
export const englishDefaults = {
  text: {
    heroEyebrow: "YOUR NEXT STORY STARTS",
    heroTitle1: "Beneath the waters of Raja Ampat,",
    heroTitle2: "the story begins.",
    tagline: "Explore the ocean. Find your story.",
    heroDescription: "Diving experiences for every kind of curiosity.",
    heroButton: "Start your adventure",
    experiencesHeading: "There's a story for every level.",
    quizTitle: "Ready to learn to dive?",
    quizDescription:
      "From Discovery Dive to Rescue Diver, start your dive course with a Zanclus instructor.",
    oceanTitle1: "The ocean has a way",
    oceanTitle2: "of leaving you in awe.",
    oceanDescription:
      "From colorful reefs to the calm of open water. Take it slowly and discover things you've never seen before.",
  },
  contact: { location: "" },
  experiences: {
    beginner: {
      title: "Start diving",
      description:
        "Your first step into the underwater world. Tell us about your experience and needs so our team can help you choose the right activity.",
      cardDescription:
        "Get to know the gear, the preparation and the world beneath the surface.",
      duration: "",
      items: [
        "Introduction to preparation and equipment",
        "A chat about your experience and comfort in the water",
        "An activity plan that matches your ability",
      ],
    },
    explorer: {
      title: "Ocean explorer",
      description:
        "For those who want to get closer to marine life. Plan with our team based on your diving experience and suitable conditions.",
      cardDescription: "Discover a new perspective among marine life.",
      duration: "",
      items: [
        "Exploring underwater life",
        "A plan adjusted to your experience",
        "Discussing sea conditions and preparation",
      ],
    },
    specialty: {
      title: "Special experience",
      description:
        "Follow your curiosity. Tell us about special interests such as underwater photography or marine life observation to discuss the options available.",
      cardDescription: "The little stories that make every dive different.",
      duration: "",
      items: [
        "Discussing your interests and dive goals",
        "Preparing the equipment you need",
        "Confirming the program and requirements with our team",
      ],
    },
  },
  activities: {
    diving: {
      ...facts.diving,
      title: "Find the story beneath the surface.",
      summary:
        "From your very first dive to your next adventure, plan a dive that suits you.",
      description:
        "Start by telling us about your experience in the water and what you'd like to explore. The Zanclus team will help you go through activity options, equipment needs and preparation before diving. Program, location and participant requirements are confirmed before the trip.",
      imageAlt: "Concept visual of a diver exploring an underwater rock arch",
      cardImageAlt: "Concept visual of two divers above a reef",
      audience: "Beginners & experienced divers",
      highlights: [
        "A plan that matches your diving experience",
        "Guidance on equipment and preparation",
        "Exploring underwater life",
      ],
      preparations: [
        "Tell us about your diving experience and comfort in the water.",
        "Have your certification details ready if you have one.",
        "Discuss health conditions and participant requirements with our team.",
        "Confirm equipment, location and schedule before you set off.",
      ],
      itinerary: [
        {
          title: "Briefing at the dive center",
          description:
            "Check certification and gear, then go through the dive site and safety rules with your guide.",
        },
        {
          title: "Out to the dive site",
          description:
            "Take the boat into the Dampier Strait. Your guide picks a site that suits the current and your experience.",
        },
        {
          title: "Two dives",
          description:
            "Dive with your guide, with a surface interval to rest between the two dives.",
        },
        {
          title: "Back & log book",
          description:
            "Rinse the gear, log your dives and talk about your next dive.",
        },
      ],
      faqs: [
        {
          question: "Can beginners join?",
          answer:
            "Let us know it's your first time. Our team will discuss introductory programs and their requirements; participant eligibility is confirmed before the activity.",
        },
        {
          question: "Is equipment included?",
          answer:
            "Equipment needs and costs depend on the program. Confirm with our team, or check the rental options in the Dive Shop.",
        },
        {
          question: "Is the date on the form booked right away?",
          answer:
            "The date is a request. A reservation is valid once our team confirms the schedule, program, price and trip terms.",
        },
      ],
    },
    snorkeling: {
      ...facts.snorkeling,
      title: "Close to the ocean, from its surface.",
      summary:
        "Enjoy the colors and life of the sea with a snorkeling plan that's comfortable for you and your travel companions.",
      description:
        "Snorkeling opens up another way to enjoy the ocean. Tell us how comfortable you are in the water, how many people are joining and what your group needs. We'll talk through the area, equipment and support that suit you before settling on a plan together.",
      imageAlt: "Concept visual of snorkeling in shallow water near an island",
      cardImageAlt: "Concept visual of a snorkeler at the surface above a reef",
      audience: "Individuals, friends & families",
      highlights: [
        "Enjoying marine life from the surface",
        "A plan that fits your comfort in the water",
        "Equipment options through the Zanclus team",
      ],
      preparations: [
        "Tell us about your swimming ability and comfort in the water.",
        "Share participants' ages and any needs for children or groups.",
        "Confirm masks, snorkels, fins and any flotation aids you need.",
        "Bring a change of clothes and sun protection; follow the team's guidance.",
      ],
      itinerary: [
        {
          title: "Plan it together",
          description:
            "Choose a preferred date and tell us what your participants need.",
        },
        {
          title: "Get to know the gear",
          description:
            "Go over using a mask, snorkel, fins and flotation aids as needed.",
        },
        {
          title: "Enjoy the sea at your pace",
          description:
            "The area and activities follow the team's confirmation and sea conditions.",
        },
        {
          title: "Return & relax",
          description:
            "Wrap up as planned and make sure all equipment is returned.",
        },
      ],
      faqs: [
        {
          question: "Do I need to be able to swim?",
          answer:
            "Tell our team about your ability and comfort in the water. Support, flotation aids and eligibility for the activity need to be confirmed first.",
        },
        {
          question: "Can I join with children?",
          answer:
            "Let us know the children's ages and how many adults are coming. Our team will discuss participant requirements and suitable activities.",
        },
        {
          question: "Can I rent equipment only?",
          answer:
            "Yes, you can request rental gear through the Dive Shop. Sizes, availability, price and pick-up time are confirmed on WhatsApp.",
        },
      ],
    },
    trip: {
      ...facts.trip,
      title: "One trip, many ocean stories.",
      summary:
        "Plan a sea trip with friends or family, with activities and routes that follow the way you like to travel.",
      description:
        "Start with a simple idea: enjoying the sea, snorkeling or diving on one trip. Tell us how many people are coming, how much time you have and where you'd like to go. The Zanclus team helps you work out the route, transport and activities; final details are agreed before departure.",
      imageAlt:
        "Concept visual of a sea journey from a boat deck towards a tropical island",
      cardImageAlt:
        "Concept visual of a trip boat crossing a lagoon among karst islands",
      audience: "Private & group trips",
      highlights: [
        "Talking through routes and destinations",
        "Activity options for your group",
        "Coordinating trip needs and schedule",
      ],
      preparations: [
        "Decide on the number of participants and your travel dates.",
        "Tell us the activities you're interested in and your group's needs.",
        "Confirm the meeting point, transport, accommodation and equipment.",
        "Check the cost breakdown, change policy and plans for changing weather.",
      ],
      itinerary: [
        {
          title: "Choose your direction",
          description:
            "Discuss destinations, timing and the activities you'd like to do.",
        },
        {
          title: "Confirm trip details",
          description:
            "Agree on the route, meeting point, transport, price and participant needs.",
        },
        {
          title: "Set off & explore",
          description:
            "The trip follows the agreed itinerary; adjustments for sea conditions are discussed with the team.",
        },
        {
          title: "Return with new stories",
          description:
            "Return time and place follow the confirmed travel plan.",
        },
      ],
      faqs: [
        {
          question: "Can the route be customized?",
          answer:
            "Tell us your destinations, group size and available time. Our team will check route, transport and activity availability before confirming a quote.",
        },
        {
          question: "Are transport and accommodation included?",
          answer:
            "What's included depends on the trip quote. Ask for a breakdown of what is and isn't included before agreeing to the trip.",
        },
        {
          question: "What if the weather changes?",
          answer:
            "Schedules and routes may adjust to sea conditions. Discuss change options and terms with our team before making a reservation.",
        },
      ],
    },
  },
  shop: {
    heading: "Gear for your next story.",
    description:
      "Find diving gear to own or rent. The Zanclus team helps you choose equipment that fits your dive plans.",
    products: {
      "demo-mask": {
        name: "Mask & snorkel set",
        description:
          "Silicone mask with snorkel for a closer look at marine life.",
        specification: "Mask + snorkel · size confirmed by our team",
      },
      "demo-fins": {
        name: "Open heel fins",
        description: "Fins with adjustable straps to support every kick.",
        specification: "Open heel · size options confirmed by our team",
      },
      "demo-suit": {
        name: "Wetsuit 3 mm",
        description: "Protection and comfort for exploring tropical waters.",
        specification: "3 mm thickness · sizes S–XL",
      },
      "demo-bcd": {
        name: "BCD jacket",
        description: "Buoyancy compensator with pockets and adjustable fit.",
        specification: "Jacket style · size confirmed by our team",
      },
      "demo-regulator": {
        name: "Regulator set",
        description: "Regulator set for scuba diving with the Zanclus team.",
        specification:
          "First stage + second stage + octopus · connection confirmed",
      },
      "demo-computer": {
        name: "Dive computer",
        description:
          "Keep track of your dive information with the right device.",
        specification: "Wrist style · model confirmed by our team",
      },
      "demo-cylinder": {
        name: "Scuba cylinder 12 L",
        description:
          "Request a cylinder for the dive plan you've put together.",
        specification: "12 liters · fill and connection confirmed by our team",
      },
      "demo-light": {
        name: "Dive torch",
        description:
          "Extra light to enjoy the details of the underwater world.",
        specification: "Handheld torch · battery confirmed by our team",
      },
    },
  },
};

const pick = (object, keys) =>
  Object.fromEntries(
    keys.filter((k) => k in object).map((k) => [k, object[k]]),
  );
const omit = (object, keys) =>
  Object.fromEntries(Object.entries(object).filter(([k]) => !keys.includes(k)));
const filled = (value) =>
  Array.isArray(value)
    ? value.length > 0
    : typeof value === "string"
      ? value.trim() !== ""
      : value !== undefined && value !== null;
function overlay(base, english = {}) {
  const result = { ...base };
  for (const [key, value] of Object.entries(english))
    if (filled(value)) result[key] = value;
  return result;
}

// The hero title gained "Raja Ampat" for search. Only the untouched former
// default is replaced; titles written by the owner stay as they are.
export function withRajaAmpatTitle(content) {
  const updated = { ...content };
  if (content.text?.heroTitle1 === "Di bawah laut,")
    updated.text = { ...content.text, heroTitle1: "Di bawah laut Raja Ampat," };
  // Older hero lines: the English one on the Indonesian site, and the
  // "di bawah laut" ending the owner asked to drop.
  if (
    [
      "YOUR NEXT STORY STARTS UNDERWATER",
      "CERITAMU BERIKUTNYA DIMULAI DI BAWAH LAUT",
    ].includes(content.text?.heroEyebrow)
  )
    updated.text = {
      ...updated.text,
      heroEyebrow: "CERITAMU BERIKUTNYA DIMULAI",
    };
  // The panel under the experiences now invites visitors to the courses.
  const quizLines = {
    "Belum tahu mulai dari mana?": ["quizTitle", "Siap belajar menyelam?"],
    "Temukan pengalaman yang sesuai denganmu.": [
      "quizDescription",
      "Dari Discovery Dive sampai Rescue Diver, mulai kursus selammu bersama instruktur Zanclus.",
    ],
  };
  for (const [old, [field, value]] of Object.entries(quizLines))
    if (content.text?.[field] === old)
      updated.text = { ...(updated.text ?? content.text), [field]: value };
  const english = (patch) => {
    const en = updated.en ?? content.en;
    updated.en = { ...en, text: { ...en.text, ...patch } };
  };
  if (content.en?.text?.heroEyebrow === "YOUR NEXT STORY STARTS UNDERWATER")
    english({ heroEyebrow: "YOUR NEXT STORY STARTS" });
  if (content.en?.text?.heroTitle1 === "Beneath the sea,")
    english({ heroTitle1: englishDefaults.text.heroTitle1 });
  if (content.en?.text?.quizTitle === "Not sure where to start?")
    english({ quizTitle: englishDefaults.text.quizTitle });
  if (
    content.en?.text?.quizDescription === "Find the experience that suits you."
  )
    english({ quizDescription: englishDefaults.text.quizDescription });
  return updated;
}

// Older versions gave all three activity pages the same duration, meeting
// point and a generic diving day. Values the owner never changed are swapped
// for the page's own defaults; edited values stay.
export function withActivityRefresh(content) {
  if (!content.activities) return content;
  const titles = (list) => (list || []).map((step) => step?.title);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const refresh = (activity, key, legacy, defaults) => {
    if (!activity) return activity;
    const next = { ...activity };
    if (next.duration === legacy.duration)
      next.duration = defaults[key].duration;
    if (next.meetingPoint === legacy.meetingPoint)
      next.meetingPoint = defaults[key].meetingPoint;
    if (
      key === "diving" &&
      same(titles(next.itinerary), legacy.divingItineraryTitles)
    )
      next.itinerary = structuredClone(defaults[key].itinerary);
    return next;
  };
  const updated = {
    ...content,
    activities: Object.fromEntries(
      Object.entries(content.activities).map(([key, a]) => [
        key,
        refresh(a, key, legacyActivityDefaults, defaultActivities),
      ]),
    ),
  };
  if (content.en?.activities)
    updated.en = {
      ...content.en,
      activities: Object.fromEntries(
        Object.entries(content.en.activities).map(([key, a]) => [
          key,
          refresh(a, key, legacyEnglish, englishDefaults.activities),
        ]),
      ),
    };
  return updated;
}

// Older CMS documents gain the English overlay; saved English copy survives.
export function withTranslations(content) {
  const en = content.en || {};
  const d = structuredClone(englishDefaults);
  return {
    ...content,
    en: {
      text: { ...d.text, ...en.text },
      contact: { ...d.contact, ...en.contact },
      experiences: Object.fromEntries(
        experienceKeys.map((k) => [
          k,
          { ...d.experiences[k], ...en.experiences?.[k] },
        ]),
      ),
      activities: Object.fromEntries(
        activityKeys.map((k) => [
          k,
          { ...d.activities[k], ...en.activities?.[k] },
        ]),
      ),
      shop: {
        heading: en.shop?.heading ?? d.shop.heading,
        description: en.shop?.description ?? d.shop.description,
        products: en.shop?.products ?? d.shop.products,
      },
    },
  };
}

// Content as shown on the public site for a locale. Indonesian is the base.
export function localizeContent(content, locale) {
  if (locale !== "en") return content;
  const en = withTranslations(content).en;
  const { en: _omit, ...base } = content;
  return {
    ...base,
    text: overlay(base.text, en.text),
    contact: overlay(base.contact, en.contact),
    experiences: Object.fromEntries(
      Object.entries(base.experiences).map(([k, e]) => [
        k,
        overlay(e, en.experiences[k]),
      ]),
    ),
    activities: Object.fromEntries(
      Object.entries(base.activities).map(([k, a]) => [
        k,
        overlay(a, en.activities[k]),
      ]),
    ),
    shop: {
      ...overlay(base.shop, {
        heading: en.shop.heading,
        description: en.shop.description,
      }),
      products: base.shop.products.map((p) =>
        overlay(p, en.shop.products[p.id]),
      ),
    },
  };
}

// Admin editing in English: translatable fields go to `en`, the rest
// (prices, photos, visibility) stay shared with the Indonesian version.
export function applyEnglishEdit(content, group, key, value) {
  const current = withTranslations(content);
  const en = structuredClone(current.en);
  if (group === "text") {
    en.text[key] = value;
    return { ...current, en };
  }
  if (group === "contact" && key === "location") {
    en.contact.location = value;
    return { ...current, en };
  }
  if (group === "experiences" || group === "activities") {
    const fields = translatableFields[group];
    en[group][key] = pick(value, fields);
    return {
      ...current,
      en,
      [group]: {
        ...current[group],
        [key]: { ...current[group][key], ...omit(value, fields) },
      },
    };
  }
  if (group === "shop") {
    if (["heading", "description"].includes(key)) {
      en.shop[key] = value;
      return { ...current, en };
    }
    // Delivery settings carry both languages themselves.
    if (key !== "products")
      return { ...current, shop: { ...current.shop, [key]: value } };
    const fields = translatableFields.products;
    en.shop.products = Object.fromEntries(
      value.map((p) => [p.id, pick(p, fields)]),
    );
    const products = value.map((p) => {
      const base = current.shop.products.find((b) => b.id === p.id);
      return base ? { ...base, ...omit(p, fields) } : p;
    });
    return { ...current, en, shop: { ...current.shop, products } };
  }
  return {
    ...current,
    [group]: { ...current[group], [key]: value },
  };
}

function optional(value, label, max) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > max)
    throw new Error(`${label} (English) tidak valid.`);
  return value.trim();
}
// English spec rows; empty rows are dropped, as in Indonesian.
function specList(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 16)
    throw new Error("Spesifikasi (English) tidak valid.");
  return value
    .map((row) => ({
      label: optional(row?.label, "Nama spesifikasi", 40),
      value: optional(row?.value, "Isi spesifikasi", 160),
    }))
    .filter((row) => row.label && row.value);
}
function list(value, label, max, limit) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 30)
    throw new Error(`${label} (English) tidak valid.`);
  const items = value.map((item) => optional(item, label, max)).filter(Boolean);
  if (items.length > limit)
    throw new Error(`${label} (English) maksimal ${limit} poin.`);
  return items;
}
function pairs(value, label, [a, b], [maxA, maxB], limit) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > limit)
    throw new Error(`${label} (English) maksimal ${limit} poin.`);
  return value
    .map((item) => ({
      [a]: optional(item?.[a], label, maxA),
      [b]: optional(item?.[b], label, maxB),
    }))
    .filter((item) => item[a] || item[b]);
}

export function validateTranslations(input, products = []) {
  const en = input && typeof input === "object" ? input : {};
  return {
    text: Object.fromEntries(
      textKeys.map((k) => [k, optional(en.text?.[k], "Teks website", 2000)]),
    ),
    contact: { location: optional(en.contact?.location, "Lokasi", 500) },
    experiences: Object.fromEntries(
      experienceKeys.map((k) => {
        const e = en.experiences?.[k] || {};
        return [
          k,
          {
            title: optional(e.title, "Nama pengalaman", 120),
            description: optional(e.description, "Deskripsi pengalaman", 2000),
            cardDescription: optional(
              e.cardDescription,
              "Deskripsi kartu",
              500,
            ),
            duration: optional(e.duration, "Durasi", 100),
            items: list(e.items, "Poin pengalaman", 300, 10),
          },
        ];
      }),
    ),
    activities: Object.fromEntries(
      activityKeys.map((k) => {
        const a = en.activities?.[k] || {};
        return [
          k,
          {
            title: optional(a.title, "Judul aktivitas", 150),
            summary: optional(a.summary, "Ringkasan aktivitas", 500),
            description: optional(a.description, "Deskripsi aktivitas", 2000),
            imageAlt: optional(a.imageAlt, "Deskripsi foto", 250),
            cardImageAlt: optional(a.cardImageAlt, "Deskripsi foto kartu", 250),
            duration: optional(a.duration, "Durasi aktivitas", 150),
            audience: optional(a.audience, "Peserta aktivitas", 150),
            meetingPoint: optional(a.meetingPoint, "Titik temu", 250),
            highlights: list(a.highlights, "Sorotan aktivitas", 300, 8),
            preparations: list(a.preparations, "Persiapan aktivitas", 300, 8),
            itinerary: pairs(
              a.itinerary,
              "Alur kegiatan",
              ["title", "description"],
              [120, 500],
              8,
            ),
            faqs: pairs(
              a.faqs,
              "Pertanyaan umum",
              ["question", "answer"],
              [250, 1000],
              6,
            ),
          },
        ];
      }),
    ),
    shop: {
      heading: optional(en.shop?.heading, "Judul Dive Shop", 150),
      description: optional(en.shop?.description, "Deskripsi Dive Shop", 600),
      products: Object.fromEntries(
        products.map((p) => {
          const t = en.shop?.products?.[p.id] || {};
          return [
            p.id,
            {
              name: optional(t.name, "Nama produk", 100),
              description: optional(t.description, "Deskripsi produk", 500),
              specification: optional(
                t.specification,
                "Spesifikasi produk",
                300,
              ),
              details: optional(t.details, "Deskripsi lengkap", 3000),
              specs: specList(t.specs),
            },
          ];
        }),
      ),
    },
  };
}

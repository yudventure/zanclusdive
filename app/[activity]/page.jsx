import { cache } from "react";
import { notFound } from "next/navigation";
import ActivityDetail from "../../src/activities/ActivityDetail.jsx";
import { activityKeys, activityLabels } from "../../src/activity-model.js";
import { publicContent } from "../../src/server/store.js";
import { isDemo } from "../../src/cms-mode.js";

export const dynamic = "force-dynamic";
const readContent = cache(publicContent);

async function activityPage(params) {
  const { activity: key } = await params;
  if (!activityKeys.includes(key)) notFound();
  const content = await readContent();
  if (!content.activities[key].enabled) notFound();
  return { key, content };
}
export async function generateMetadata({ params }) {
  const { key, content } = await activityPage(params);
  const activity = content.activities[key];
  return {
    title: `${activityLabels[key]} — ${activity.title} | Zanclus Dive Center`,
    description: activity.summary,
    alternates: { canonical: `/${key}` },
    openGraph: {
      title: `${activityLabels[key]} | Zanclus Dive Center`,
      description: activity.summary,
      ...(process.env.NEXT_PUBLIC_SITE_URL
        ? {
            url: `/${key}`,
            images: [{ url: activity.image, alt: activity.imageAlt }],
          }
        : { images: [] }),
    },
  };
}
export default async function Page({ params }) {
  const { key, content } = await activityPage(params);
  return <ActivityDetail activityKey={key} content={content} demo={isDemo()} />;
}

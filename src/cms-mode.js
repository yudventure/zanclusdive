// Demo is the deployment default requested by the owner. MySQL remains opt-in.
export function cmsMode(env = process.env) {
  const mode = env.CMS_MODE?.trim() || "demo";
  if (!["demo", "mysql"].includes(mode)) throw new Error("CMS_MODE must be demo or mysql.");
  return mode;
}
export const isDemo = () => cmsMode() === "demo";

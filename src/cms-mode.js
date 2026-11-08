// Demo is the deployment default requested by the owner. MySQL remains opt-in.
export function cmsMode(env = process.env) {
  const mode = env.CMS_MODE?.trim() || "demo";
  if (!["demo", "mysql"].includes(mode)) throw new Error("CMS_MODE must be demo or mysql.");
  return mode;
}
export const isDemo = () => cmsMode() === "demo";

// Real payments need storage that outlives a restart and a redeploy. The
// demo store's folder in the hosting account does; a folder under /tmp, or
// one not opened yet, may not.
export function temporaryFolder(directory, tmp = "/tmp") {
  if (!directory) return true;
  const inside = (base) =>
    directory === base || directory.startsWith(base.replace(/\/+$/, "") + "/");
  return [tmp, "/tmp", "/var/tmp", "/dev/shm"].some(inside);
}

// What the embedded YouTube and TikTok players tell the page. YouTube
// sends JSON text, TikTok objects.
export const parsePlayerMessage = (data) => {
  if (typeof data !== "string") return data ?? {};
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
};
// Whether a player message says the video is running.
export function playerRunning(platform, data) {
  if (platform === "tiktok")
    return (
      (data?.type === "onStateChange" && data.value === 1) ||
      (data?.type === "onCurrentTime" &&
        (data.value?.currentTime ?? data.currentTime) > 0)
    );
  if (platform === "youtube")
    return (
      (data?.event === "onStateChange" && data.info === 1) ||
      (data?.event === "infoDelivery" &&
        (data.info?.playerState === 1 || data.info?.currentTime > 0))
    );
  return false;
}

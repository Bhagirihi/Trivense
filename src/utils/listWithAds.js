/** Marker object inserted between list rows for inline banner ads. */
export function isAdListItem(item) {
  return Boolean(item?.__ad);
}

export function createAdListItem(id) {
  return { __ad: true, id: String(id) };
}

/**
 * Insert banner ad rows every `interval` items (e.g. interval 3 → ad after 3rd, 6th, …).
 */
export function interleaveListWithAds(items, options = {}) {
  const {
    interval = 3,
    maxAds = Infinity,
    adKeyPrefix = "inline-ad",
  } = options;

  if (!items?.length) return [];

  const result = [];
  let adCount = 0;

  items.forEach((item, index) => {
    result.push(item);
    const isLast = index === items.length - 1;
    if (
      !isLast &&
      (index + 1) % interval === 0 &&
      adCount < maxAds
    ) {
      adCount += 1;
      result.push(createAdListItem(`${adKeyPrefix}-${adCount}`));
    }
  });

  return result;
}

/** Insert exactly one ad after `afterIndex` (0-based item index). */
export function insertSingleListAd(items, afterIndex = 1) {
  if (!items?.length) return [];

  const index = Math.min(afterIndex, items.length - 1);
  const result = [...items];
  result.splice(index + 1, 0, createAdListItem("inline-ad-single"));
  return result;
}

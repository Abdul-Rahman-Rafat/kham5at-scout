// Runs on https://khamsat.com/community/requests
// Handles: clicking "load more" N times, then scanning + filtering requests.

function findLoadMoreEl() {
  const candidates = Array.from(document.querySelectorAll("a, button, span"));
  return candidates.find((el) => {
    const text = (el.textContent || "").trim();
    return text === "عرض المواضيع الأقدم" || text.includes("عرض المواضيع الأقدم");
  });
}

function waitForNewContent(previousCount, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      const currentCount = document.querySelectorAll('a[href*="/community/requests/"]').length;
      if (currentCount > previousCount || Date.now() - start > timeoutMs) {
        resolve();
      } else {
        setTimeout(check, 250);
      }
    };
    check();
  });
}

async function clickLoadMoreRepeatedly(times, onProgress) {
  let clicked = 0;
  for (let i = 0; i < times; i++) {
    const el = findLoadMoreEl();
    if (!el) break; // no more "load more" button left, page might be fully expanded
    const beforeCount = document.querySelectorAll('a[href*="/community/requests/"]').length;
    el.click();
    clicked++;
    if (onProgress) onProgress(clicked, times);
    await waitForNewContent(beforeCount, 4000);
  }
  return clicked;
}

function extractRequests() {
  const links = Array.from(document.querySelectorAll('a[href*="/community/requests/"]'));
  const seen = new Set();
  const items = [];
  for (const link of links) {
    const href = link.getAttribute("href") || "";
    const title = (link.textContent || "").trim();
    if (!title || href.includes("/community/requests/new")) continue;
    const slugPart = href.split("/community/requests/")[1] || "";
    if (!/^\d/.test(slugPart)) continue; // only real request links, id starts with a digit
    if (seen.has(href)) continue;
    seen.add(href);
    items.push({ title, url: link.href });
  }
  return items;
}

function filterByKeywords(items, keywords) {
  const kws = keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
  if (kws.length === 0) return items;
  return items.filter((item) => {
    const t = item.title.toLowerCase();
    return kws.some((k) => t.includes(k));
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action !== "run") return;

  (async () => {
    await clickLoadMoreRepeatedly(msg.loadMoreCount || 0, (done, total) => {
      chrome.runtime.sendMessage({ action: "progress", done, total });
    });
    const all = extractRequests();
    const matched = filterByKeywords(all, msg.keywords || []);
    sendResponse({ total: all.length, matched });
  })();

  return true; // keep the message channel open for the async response
});

const runBtn = document.getElementById("run");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const loadMoreInput = document.getElementById("loadMore");
const keywordsInput = document.getElementById("keywords");
const searchInput = document.getElementById("search");
const searchForm = document.getElementById("searchForm");
const clearBtn = document.getElementById("clearKeywords");
const resetAllBtn = document.getElementById("resetAll");

const STORAGE_KEY = "khamsatFilterState";
let allResults = [];

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "progress") {
    statusEl.textContent = `بتعمل Load More... (${msg.done}/${msg.total})`;
  }
});

searchInput.addEventListener("input", () => {
  renderResults(allResults);
});

runBtn.addEventListener("click", async () => {
  runBtn.disabled = true;
  statusEl.textContent = "جاري البحث...";
  // Old results stay on screen until the new ones are ready,
  // so nothing disappears mid-search.

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.url || !tab.url.includes("khamsat.com/community/requests")) {
    statusEl.textContent =
      "لازم تكون فاتح صفحة khamsat.com/community/requests الأول.";
    runBtn.disabled = false;
    return;
  }

  const loadMoreCount = parseInt(loadMoreInput.value, 10) || 0;
  const keywordsText = keywordsInput.value;
  const keywords = keywordsText
    .split("\n")
    .map((k) => k.trim())
    .filter(Boolean);

  chrome.tabs.sendMessage(
    tab.id,
    { action: "run", loadMoreCount, keywords },
    async (response) => {
      runBtn.disabled = false;
      if (chrome.runtime.lastError || !response) {
        statusEl.textContent = "حصل خطأ - جرب تعمل Refresh للصفحة وتحاول تاني.";
        return;
      }
      const statusText = `لقيت ${response.matched.length} طلب من أصل ${response.total}`;
      statusEl.textContent = statusText;
      renderResults(response.matched);
    },
  );
});

function renderResults(items) {
  allResults = Array.isArray(items) ? items : [];
  const query = (searchInput.value || "").trim().toLowerCase();
  const filteredItems = query
    ? allResults.filter((item) => item.title.toLowerCase().includes(query))
    : allResults;

  if (searchForm) searchForm.style.display = "block";

  resultsEl.innerHTML = "";
  if (filteredItems.length === 0) {
    const emptyMessage = query
      ? "مفيش نتائج مطابقة للبحث الحالي."
      : "مفيش طلبات مطابقة دلوقتي.";
    resultsEl.innerHTML = `<div class="empty">${emptyMessage}</div>`;
    return;
  }

  for (const item of filteredItems) {
    const div = document.createElement("div");
    div.className = "item";
    const a = document.createElement("a");
    a.href = item.url;
    a.target = "_blank";
    a.textContent = item.title;
    div.appendChild(a);
    resultsEl.appendChild(div);
  }
}

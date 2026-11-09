(() => {
  // ns-hugo-imp:/home/yu419/blog/my-blog/themes/FixIt/assets/js/core/event-bus.ts
  var TypedEventBus = class {
    #target = document;
    on(event, handler) {
      this.#target.addEventListener(event, handler);
    }
    off(event, handler) {
      this.#target.removeEventListener(event, handler);
    }
    emit(event, ...args) {
      const detail = args[0];
      this.#target.dispatchEvent(
        detail !== void 0 ? new CustomEvent(event, { detail }) : new CustomEvent(event)
      );
    }
  };
  var eventBus = new TypedEventBus();

  // <stdin>
  function detectValueType(value) {
    const stripped = value.replace(/[\s,%$€£¥]/g, "");
    if (stripped !== "" && !Number.isNaN(Number(stripped)))
      return "number";
    if (/\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(value) && !Number.isNaN(Date.parse(value)))
      return "date";
    return "string";
  }
  function compareValues(a, b, direction) {
    if (!direction)
      return 0;
    const type = detectValueType(a);
    let result = 0;
    switch (type) {
      case "number":
        result = Number(a.replace(/[\s,%$€£¥]/g, "")) - Number(b.replace(/[\s,%$€£¥]/g, ""));
        break;
      case "date":
        result = new Date(a).getTime() - new Date(b).getTime();
        break;
      default:
        result = a.localeCompare(b);
    }
    return direction === "asc" ? result : -result;
  }
  function nextDirection(current) {
    if (current === null)
      return "asc";
    if (current === "asc")
      return "desc";
    return null;
  }
  function sortTable(table, colIndex, direction) {
    const tbody = table.querySelector("tbody");
    if (!tbody)
      return;
    const rows = Array.from(tbody.querySelectorAll("tr"));
    if (!direction) {
      rows.sort((a, b) => {
        const orderA = parseInt(a.dataset.order || "0", 10);
        const orderB = parseInt(b.dataset.order || "0", 10);
        return orderA - orderB;
      });
    } else {
      rows.sort((a, b) => {
        const cellA = a.children[colIndex]?.textContent?.trim() || "";
        const cellB = b.children[colIndex]?.textContent?.trim() || "";
        return compareValues(cellA, cellB, direction);
      });
    }
    rows.forEach((row) => tbody.appendChild(row));
  }
  function updateSortIndicators(table, colIndex, direction) {
    table.querySelectorAll("th").forEach((th, i) => {
      th.classList.remove("sort-asc", "sort-desc");
      if (i === colIndex && direction) {
        th.classList.add(direction === "asc" ? "sort-asc" : "sort-desc");
      }
    });
  }
  function initSortableTable(table) {
    if (table.dataset.sortInit)
      return;
    table.dataset.sortInit = "true";
    const tbody = table.querySelector("tbody");
    if (tbody) {
      Array.from(tbody.querySelectorAll("tr")).forEach((row, i) => {
        row.dataset.order = String(i);
      });
    }
    table.classList.add("is-sortable");
    const headers = table.querySelectorAll("thead th");
    headers.forEach((th, index) => {
      th.classList.add("sort-header");
      th.setAttribute("role", "button");
      th.setAttribute("tabindex", "0");
      th.setAttribute("aria-sort", "none");
      const handleClick = () => {
        const currentDir = table.dataset.sortDir === "asc" && table.dataset.sortCol === String(index) ? "asc" : table.dataset.sortDir === "desc" && table.dataset.sortCol === String(index) ? "desc" : null;
        const newDir = nextDirection(currentDir);
        if (newDir) {
          table.dataset.sortCol = String(index);
          table.dataset.sortDir = newDir;
          th.setAttribute("aria-sort", newDir === "asc" ? "ascending" : "descending");
        } else {
          delete table.dataset.sortCol;
          delete table.dataset.sortDir;
          th.setAttribute("aria-sort", "none");
        }
        sortTable(table, index, newDir);
        updateSortIndicators(table, index, newDir);
      };
      th.addEventListener("click", handleClick, false);
      th.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }, false);
    });
  }
  function initTableSort(target = document) {
    target.querySelectorAll("table[data-sortable]:not([data-sort-init])").forEach(initSortableTable);
  }
  function bindEvents() {
    eventBus.on("fixit:content-decrypted", ({ detail }) => {
      initTableSort(detail.target);
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    initTableSort();
    bindEvents();
  }, false);
})();
//# sourceMappingURL=table-sort.js.map

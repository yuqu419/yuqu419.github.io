(() => {
  // <stdin>
  (() => {
    const searchItem = document.querySelector("#header-desktop .menu-item.search");
    const trigger = searchItem?.querySelector(".search-trigger.desktop");
    if (!(searchItem instanceof HTMLElement) || !(trigger instanceof HTMLButtonElement)) {
      return;
    }
    const form = document.createElement("form");
    form.className = "search-hover-form";
    form.setAttribute("role", "search");
    form.setAttribute("aria-label", trigger.getAttribute("aria-label") || "Search");
    const input = document.createElement("input");
    input.className = "search-hover-input";
    input.type = "search";
    input.placeholder = "\u641C\u7D22...";
    input.setAttribute("aria-label", trigger.getAttribute("aria-label") || "Search");
    input.autocomplete = "off";
    input.enterKeyHint = "search";
    form.append(trigger, input);
    searchItem.append(form);
    const transferQuery = () => {
      const query = input.value.trim();
      if (!query) {
        return;
      }
      requestAnimationFrame(() => {
        const dialogInput = document.querySelector("#search-dialog .search-input");
        if (!(dialogInput instanceof HTMLInputElement)) {
          console.error("[custom search] Search dialog input was not found.");
          return;
        }
        dialogInput.value = query;
        dialogInput.dispatchEvent(new Event("input", { bubbles: true }));
        dialogInput.focus();
      });
    };
    trigger.addEventListener("click", transferQuery);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      trigger.click();
    });
    document.addEventListener("click", async (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const button = event.target.closest(".about-qq-copy");
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }
      const tooltip = button.querySelector(".about-contact-tooltip");
      const value = button.dataset.copyText;
      if (!tooltip || !value) {
        console.error("[custom contact] QQ copy button is missing its value or tooltip.");
        return;
      }
      try {
        if (!navigator.clipboard?.writeText) {
          throw new Error("Clipboard API is not available in this context.");
        }
        await navigator.clipboard.writeText(value);
        tooltip.textContent = "\u5DF2\u590D\u5236";
      } catch (error) {
        console.error("[custom contact] Failed to copy QQ number.", error);
        tooltip.textContent = "\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u590D\u5236";
      }
      window.setTimeout(() => {
        tooltip.textContent = `QQ\uFF1A${value}`;
      }, 1800);
    });
  })();
})();
//# sourceMappingURL=custom.js.map

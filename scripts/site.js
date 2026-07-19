(() => {
  const track = (eventName, params = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...params });
    if (window.ttq && typeof window.ttq.track === "function") window.ttq.track(eventName, params);
  };

  document.querySelectorAll("[data-track]").forEach((element) => {
    element.addEventListener("click", () => track(element.dataset.track, { url: element.href || "" }));
  });

  const menuButton = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-menu]");
  menuButton?.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!isOpen));
    menuButton.setAttribute("aria-label", isOpen ? menuButton.dataset.openLabel : menuButton.dataset.closeLabel);
    menu?.classList.toggle("is-open", !isOpen);
  });

  const catalog = document.querySelector("[data-catalog]");
  if (catalog) {
    const locale = catalog.dataset.locale || "en";
    const isZh = locale === "zh";
    const cards = [...catalog.querySelectorAll("[data-product-card]")];
    const search = catalog.querySelector("[data-filter-search]");
    const series = catalog.querySelector("[data-filter-series]");
    const capacity = catalog.querySelector("[data-filter-capacity]");
    const quantity = catalog.querySelector("[data-filter-quantity]");
    const count = catalog.querySelector("[data-result-count]");
    const empty = catalog.querySelector("[data-empty-state]");

    const format = (value) => `$${Number(value).toFixed(2)}`;
    const update = () => {
      const query = (search?.value || "").trim().toLowerCase();
      const seriesValue = series?.value || catalog.dataset.initialSeries || "all";
      const capacityValue = capacity?.value || "all";
      const quantityValue = quantity?.value || "lowest";
      let visible = 0;

      cards.forEach((card) => {
        const liters = Number(card.dataset.capacity);
        const under = Number(card.dataset.priceUnder);
        const over = Number(card.dataset.priceOver);
        const matchesSearch = !query || card.dataset.title.includes(query);
        const matchesSeries = seriesValue === "all" || card.dataset.series === seriesValue;
        const matchesCapacity = capacityValue === "all"
          || (capacityValue === "compact" && liters > 0 && liters <= 12)
          || (capacityValue === "medium" && liters > 12 && liters <= 30)
          || (capacityValue === "large" && liters > 30);
        const hasTier = quantityValue === "contact"
          || quantityValue === "lowest"
          || (quantityValue === "under500" && under > 0)
          || (quantityValue === "over1000" && over > 0);
        const show = matchesSearch && matchesSeries && matchesCapacity && hasTier;
        card.hidden = !show;
        if (show) visible += 1;

        const label = card.querySelector("[data-card-price]");
        if (!label) return;
        const contactLabel = isZh ? "联系询价" : "Contact for Price";
        if (quantityValue === "under500") label.textContent = under > 0 ? format(under) : contactLabel;
        else if (quantityValue === "over1000") label.textContent = over > 0 ? format(over) : contactLabel;
        else if (quantityValue === "contact") label.textContent = contactLabel;
        else {
          const available = [under, over].filter((value) => value > 0);
          label.textContent = available.length ? `${isZh ? "低至" : "From"} ${format(Math.min(...available))}` : contactLabel;
        }
      });

      if (count) count.textContent = String(visible);
      if (empty) empty.hidden = visible !== 0;
    };

    [search, series, capacity, quantity].forEach((control) => {
      control?.addEventListener(control.tagName === "INPUT" ? "input" : "change", update);
    });
    catalog.querySelectorAll("[data-filter-reset]").forEach((button) => {
      button.addEventListener("click", () => {
        if (search) search.value = "";
        if (series) series.value = catalog.dataset.initialSeries || "all";
        if (capacity) capacity.value = "all";
        if (quantity) quantity.value = "lowest";
        update();
      });
    });
    update();
  }

  const productQuantity = document.querySelector("[data-product-quantity]");
  const productWhatsApp = document.querySelector("[data-product-whatsapp]");
  if (productQuantity && productWhatsApp) {
    const updateLink = () => {
      const model = productWhatsApp.dataset.model;
      const isZh = productWhatsApp.dataset.locale === "zh";
      const quantity = productQuantity.value || (isZh ? "请告知起订量" : "please advise");
      const message = isZh
        ? `您好 LONFRO，我对型号 ${model} 感兴趣，预计采购数量：${quantity}件。请发送详细规格、交期和正式报价，谢谢。`
        : `Hello LONFRO, I am interested in model ${model}. Expected purchase quantity: ${quantity} pcs. Please send specifications, lead time and a formal quotation.`;
      productWhatsApp.href = `https://wa.me/85291242307?text=${encodeURIComponent(message)}`;
    };
    productQuantity.addEventListener("input", updateLink);
    updateLink();
  }

  document.querySelectorAll("form[data-quote-form]").forEach((form) => {
    let started = false;
    form.addEventListener("input", () => {
      if (!started) {
        started = true;
        track("quote_form_start");
      }
    });
    form.addEventListener("submit", () => track("quote_form_submit"));
  });

  const banner = document.querySelector("[data-cookie-banner]");
  if (banner && !localStorage.getItem("lonfro-cookie-choice")) banner.hidden = false;
  banner?.querySelector("[data-cookie-essential]")?.addEventListener("click", () => {
    localStorage.setItem("lonfro-cookie-choice", "essential");
    banner.hidden = true;
  });
  banner?.querySelector("[data-cookie-accept]")?.addEventListener("click", () => {
    localStorage.setItem("lonfro-cookie-choice", "analytics");
    banner.hidden = true;
    track("cookie_consent", { choice: "analytics" });
  });

  if (document.body.dataset.productModel) track("product_view", { model: document.body.dataset.productModel });
})();

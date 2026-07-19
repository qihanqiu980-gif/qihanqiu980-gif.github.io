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
    const locale = form.dataset.locale || "en";
    const isZh = locale === "zh";
    const endpoint = (form.dataset.endpoint || "").trim();
    const whatsappNumber = form.dataset.whatsappNumber || "85291242307";
    const emailField = form.elements.namedItem("email");
    const whatsappField = form.elements.namedItem("whatsapp");
    const contactError = form.querySelector("[data-contact-error]");
    const submitButton = form.querySelector("[data-submit-button]");
    const retryButton = form.querySelector("[data-retry-button]");
    const status = form.querySelector("[data-form-status]");
    const recovery = form.querySelector("[data-form-recovery]");
    const whatsappLink = form.querySelector("[data-form-whatsapp]");
    let started = false;
    let submitting = false;

    const copy = isZh
      ? {
          contactRequired: "请至少填写电子邮箱或 WhatsApp 号码。",
          success: "询盘已成功发送。感谢您的咨询，我们会尽快与您联系。",
          whatsappOpened: "询价内容已在 WhatsApp 中打开。请检查内容并点击发送。",
          network: "网络连接失败，询盘尚未发送。请检查网络后重试。",
          timeout: "发送超时，询盘尚未确认送达。请重试或改用 WhatsApp。",
          validation: "部分内容未通过接收服务的校验，请检查后重试。",
          rateLimit: "提交次数过多，请稍后重试或改用 WhatsApp。",
          server: "接收服务暂时不可用，询盘尚未发送。请重试或改用 WhatsApp。"
        }
      : {
          contactRequired: "Please enter an email address or WhatsApp number.",
          success: "Your inquiry was sent successfully. Thank you. We will contact you soon.",
          whatsappOpened: "Your inquiry has opened in WhatsApp. Please review it and tap send.",
          network: "The network connection failed and your inquiry was not sent. Check your connection and try again.",
          timeout: "Sending timed out and delivery was not confirmed. Try again or use WhatsApp.",
          validation: "Some details were rejected by the receiving service. Please review them and try again.",
          rateLimit: "Too many attempts were made. Please wait and try again, or use WhatsApp.",
          server: "The inquiry service is temporarily unavailable. Try again or use WhatsApp."
        };

    const value = (name) => String(form.elements.namedItem(name)?.value || "").trim();

    const validateContact = () => {
      const isMissing = !value("email") && !value("whatsapp");
      const message = isMissing ? copy.contactRequired : "";
      emailField?.setCustomValidity(message);
      whatsappField?.setCustomValidity(message);
      if (contactError) {
        contactError.textContent = copy.contactRequired;
        contactError.hidden = !isMissing;
      }
      return !isMissing;
    };

    const setStatus = (message, type) => {
      if (!status) return;
      status.textContent = message;
      status.dataset.state = type;
      status.hidden = false;
    };

    const clearStatus = () => {
      if (status) {
        status.hidden = true;
        status.textContent = "";
        delete status.dataset.state;
      }
      if (retryButton) retryButton.hidden = true;
      if (recovery) recovery.hidden = true;
    };

    const setSubmitting = (next) => {
      submitting = next;
      if (!submitButton) return;
      submitButton.disabled = next;
      submitButton.setAttribute("aria-busy", String(next));
      submitButton.textContent = next ? submitButton.dataset.loadingLabel : submitButton.dataset.idleLabel;
    };

    const buildWhatsAppUrl = () => {
      const fields = isZh
        ? [
            ["LONFRO 网站询价", ""],
            ["姓名", value("name")],
            ["公司", value("company")],
            ["国家/地区", value("country")],
            ["电子邮箱", value("email")],
            ["WhatsApp", value("whatsapp")],
            ["产品型号", value("product_model")],
            ["采购数量", value("purchase_quantity")],
            ["需求说明", value("requirements")]
          ]
        : [
            ["LONFRO Website Inquiry", ""],
            ["Name", value("name")],
            ["Company", value("company")],
            ["Country / Region", value("country")],
            ["Email", value("email")],
            ["WhatsApp", value("whatsapp")],
            ["Product Model", value("product_model")],
            ["Purchase Quantity", value("purchase_quantity")],
            ["Requirements", value("requirements")]
          ];
      const message = fields
        .filter(([label, fieldValue], index) => index === 0 || fieldValue)
        .map(([label, fieldValue], index) => index === 0 ? label : `${label}: ${fieldValue}`)
        .join("\n");
      return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    };

    const showRecovery = () => {
      const url = buildWhatsAppUrl();
      if (whatsappLink) whatsappLink.href = url;
      if (recovery) recovery.hidden = false;
      return url;
    };

    form.addEventListener("input", () => {
      if (!started) {
        started = true;
        track("quote_form_start");
      }
    });
    emailField?.addEventListener("input", validateContact);
    whatsappField?.addEventListener("input", validateContact);
    emailField?.addEventListener("change", validateContact);
    whatsappField?.addEventListener("change", validateContact);

    retryButton?.addEventListener("click", () => form.requestSubmit());

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (submitting) return;

      validateContact();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      clearStatus();

      if (!endpoint) {
        const url = showRecovery();
        window.open(url, "_blank", "noopener,noreferrer");
        setStatus(copy.whatsappOpened, "info");
        track("quote_form_whatsapp_open");
        return;
      }

      setSubmitting(true);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" },
          signal: controller.signal
        });

        if (!response.ok) {
          const error = new Error(`Form service returned ${response.status}`);
          error.status = response.status;
          throw error;
        }

        form.reset();
        validateContact();
        if (contactError) contactError.hidden = true;
        setStatus(copy.success, "success");
        track("quote_form_submit");
      } catch (error) {
        const statusCode = Number(error.status || 0);
        const message = error.name === "AbortError"
          ? copy.timeout
          : statusCode === 422
            ? copy.validation
            : statusCode === 429
              ? copy.rateLimit
              : statusCode >= 500
                ? copy.server
                : copy.network;
        setStatus(message, "error");
        if (retryButton) retryButton.hidden = false;
        showRecovery();
        track("quote_form_error", { status: statusCode || (error.name === "AbortError" ? "timeout" : "network") });
      } finally {
        window.clearTimeout(timeout);
        setSubmitting(false);
      }
    });
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

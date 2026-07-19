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

  const rfqStorageKey = "lonfro-rfq-v2";
  const readRfq = () => {
    try {
      const value = JSON.parse(localStorage.getItem(rfqStorageKey) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };
  const writeRfq = (items) => {
    try { localStorage.setItem(rfqStorageKey, JSON.stringify(items)); } catch {}
  };
  const rfqDialog = document.querySelector("[data-rfq-dialog]");
  const rfqList = rfqDialog?.querySelector("[data-rfq-list]");
  const rfqEmpty = rfqDialog?.querySelector("[data-rfq-empty]");
  const rfqWhatsapp = rfqDialog?.querySelector("[data-rfq-whatsapp]");
  const rfqClear = rfqDialog?.querySelector("[data-rfq-clear]");

  const updateRfq = () => {
    const items = readRfq();
    const isZhDialog = rfqDialog?.dataset.locale === "zh";
    document.querySelectorAll("[data-rfq-count]").forEach((count) => { count.textContent = String(items.length); });
    if (!rfqList || !rfqDialog) return;

    rfqList.replaceChildren();
    items.forEach((item, index) => {
      const itemTitle = isZhDialog ? (item.titleZh || item.title) : (item.titleEn || item.title);
      const itemColor = isZhDialog ? (item.colorZh || item.color) : (item.colorEn || item.color);
      const itemWheel = isZhDialog ? (item.wheelZh || item.wheel) : (item.wheelEn || item.wheel);
      const itemAccessories = isZhDialog ? (item.accessoriesZh || item.accessories || []) : (item.accessoriesEn || item.accessories || []);
      const itemUrl = item.slug ? `${isZhDialog ? "/zh" : ""}/products/${item.slug}/` : item.url;
      const article = document.createElement("article");
      article.className = "rfq-item";

      const imageLink = document.createElement("a");
      imageLink.className = "rfq-item-image";
      imageLink.href = itemUrl;
      const image = document.createElement("img");
      image.src = item.image;
      image.alt = itemTitle;
      image.width = 96;
      image.height = 96;
      imageLink.append(image);

      const copy = document.createElement("div");
      copy.className = "rfq-item-copy";
      const title = document.createElement("a");
      title.href = itemUrl;
      title.className = "rfq-item-title";
      title.textContent = itemTitle;
      const meta = document.createElement("p");
      meta.textContent = [itemColor, itemWheel, ...itemAccessories].filter(Boolean).join(" / ");
      const quantity = document.createElement("strong");
      quantity.textContent = `${Number(item.quantity).toLocaleString("en-US")} ${isZhDialog ? "件" : "pcs"}${item.unitPrice ? ` × $${Number(item.unitPrice).toFixed(2)}` : ""}`;
      copy.append(title, meta, quantity);

      const remove = document.createElement("button");
      remove.className = "rfq-item-remove";
      remove.type = "button";
      remove.textContent = isZhDialog ? "移除" : "Remove";
      remove.addEventListener("click", () => {
        const next = readRfq();
        next.splice(index, 1);
        writeRfq(next);
        updateRfq();
      });

      article.append(imageLink, copy, remove);
      rfqList.append(article);
    });

    if (rfqEmpty) rfqEmpty.hidden = items.length !== 0;
    if (rfqClear) rfqClear.hidden = items.length === 0;
    if (rfqWhatsapp) {
      rfqWhatsapp.toggleAttribute("aria-disabled", items.length === 0);
      rfqWhatsapp.classList.toggle("is-disabled", items.length === 0);
      const lines = items.flatMap((item, index) => [
        `${index + 1}. ${isZhDialog ? (item.modelZh || item.model) : (item.modelEn || item.model)}`,
        `${isZhDialog ? "颜色" : "Color"}: ${isZhDialog ? (item.colorZh || item.color) : (item.colorEn || item.color)}`,
        `${isZhDialog ? "轮子" : "Wheels"}: ${isZhDialog ? (item.wheelZh || item.wheel) : (item.wheelEn || item.wheel)}`,
        `${isZhDialog ? "配件 / 定制" : "Accessories / customization"}: ${(isZhDialog ? (item.accessoriesZh || item.accessories || []) : (item.accessoriesEn || item.accessories || [])).join(", ") || (isZhDialog ? "无额外需求" : "No additional request")}`,
        `${isZhDialog ? "数量" : "Quantity"}: ${item.quantity} ${isZhDialog ? "件" : "pcs"}`,
        `${isZhDialog ? "单件参考价" : "Unit reference"}: ${item.unitPrice ? `$${Number(item.unitPrice).toFixed(2)} ${isZhDialog ? "美元 / 件" : "USD / pc"}` : (isZhDialog ? "联系询价" : "Contact for Price")}`,
        ""
      ]);
      const heading = isZhDialog
        ? "您好 LONFRO，以下是我的 RFQ 询价清单。请确认规格、MOQ、样品、交期、包装、装柜量和正式报价："
        : "Hello LONFRO, this is my RFQ list. Please confirm specifications, MOQ, sample policy, lead time, packing, container load and a formal quotation:";
      rfqWhatsapp.href = `https://wa.me/85291242307?text=${encodeURIComponent([heading, "", ...lines].join("\n"))}`;
    }
  };

  document.querySelectorAll("[data-rfq-open]").forEach((button) => {
    button.addEventListener("click", () => {
      updateRfq();
      if (rfqDialog?.showModal) rfqDialog.showModal();
    });
  });
  rfqDialog?.querySelector("[data-rfq-close]")?.addEventListener("click", () => rfqDialog.close());
  rfqDialog?.addEventListener("click", (event) => {
    if (event.target === rfqDialog) rfqDialog.close();
  });
  rfqClear?.addEventListener("click", () => {
    writeRfq([]);
    updateRfq();
  });
  rfqWhatsapp?.addEventListener("click", (event) => {
    if (!readRfq().length) event.preventDefault();
  });
  updateRfq();

  document.querySelectorAll("[data-product-configurator]").forEach((configurator) => {
    const isZh = configurator.dataset.locale === "zh";
    const quantityInput = configurator.querySelector("[data-product-quantity]");
    const whatsapp = configurator.querySelector("[data-product-whatsapp]");
    const addRfq = configurator.querySelector("[data-add-rfq]");
    const feedback = configurator.querySelector("[data-rfq-feedback]");
    const underPrice = Number(configurator.dataset.priceUnder) || null;
    const overPrice = Number(configurator.dataset.priceOver) || null;

    const selectedOption = (name) => {
      const input = configurator.querySelector(`[data-config-options="${name}"] input:checked`);
      return {
        current: input?.value || "",
        en: input?.dataset.labelEn || input?.value || "",
        zh: input?.dataset.labelZh || input?.value || ""
      };
    };
    const selectedAccessories = () => [...configurator.querySelectorAll('[data-config-options="accessories"] input:checked')].map((input) => ({
      current: input.value,
      en: input.dataset.labelEn || input.value,
      zh: input.dataset.labelZh || input.value
    }));
    const priceFor = (quantity) => quantity <= 500 ? underPrice : quantity >= 1000 ? overPrice : null;
    const money = (value) => value === null ? (isZh ? "联系询价" : "Contact for Price") : `$${Number(value).toFixed(2)}`;

    const currentSelection = () => {
      const quantity = Math.max(1, Math.round(Number(quantityInput?.value) || 1));
      const unitPrice = priceFor(quantity);
      const color = selectedOption("color");
      const wheel = selectedOption("wheel");
      const accessories = selectedAccessories();
      return {
        id: configurator.dataset.productId,
        slug: configurator.dataset.productSlug,
        title: configurator.dataset.productTitle,
        model: configurator.dataset.productModel,
        titleEn: configurator.dataset.productTitleEn,
        titleZh: configurator.dataset.productTitleZh,
        modelEn: configurator.dataset.productModelEn,
        modelZh: configurator.dataset.productModelZh,
        image: configurator.dataset.productImage,
        color: color.current,
        colorEn: color.en,
        colorZh: color.zh,
        wheel: wheel.current,
        wheelEn: wheel.en,
        wheelZh: wheel.zh,
        accessories: accessories.map((item) => item.current),
        accessoriesEn: accessories.map((item) => item.en),
        accessoriesZh: accessories.map((item) => item.zh),
        quantity,
        unitPrice,
        url: `${isZh ? "/zh" : ""}/products/${configurator.dataset.productSlug}/`,
        locale: configurator.dataset.locale
      };
    };

    const updateConfiguration = () => {
      const selection = currentSelection();
      if (quantityInput) quantityInput.value = String(selection.quantity);
      const total = selection.unitPrice === null ? null : selection.unitPrice * selection.quantity;
      const accessories = selection.accessories.length ? selection.accessories.join(", ") : (isZh ? "无额外需求" : "No additional request");
      const tier = selection.quantity <= 500
        ? (isZh ? "500 件及以下参考价" : "Up to 500 pcs reference")
        : selection.quantity >= 1000
          ? (isZh ? "1,000 件及以上参考价" : "1,000+ pcs reference")
          : (isZh ? "该数量需单独报价" : "Custom quotation required");

      const values = {
        "[data-summary-color]": selection.color,
        "[data-summary-wheel]": selection.wheel,
        "[data-summary-accessories]": accessories,
        "[data-summary-quantity]": selection.quantity.toLocaleString("en-US"),
        "[data-summary-unit-price]": money(selection.unitPrice),
        "[data-summary-total]": total === null ? money(null) : `$${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        "[data-summary-status]": tier
      };
      Object.entries(values).forEach(([selector, value]) => {
        const element = configurator.querySelector(selector);
        if (element) element.textContent = String(value);
      });

      if (whatsapp) {
        const lines = isZh
          ? [
              "您好 LONFRO，我想询问以下采购配置：",
              `型号：${selection.model}`,
              `颜色：${selection.color}`,
              `轮子配置：${selection.wheel}`,
              `配件 / 定制：${accessories}`,
              `采购数量：${selection.quantity} 件`,
              `单件参考价：${selection.unitPrice === null ? "联系询价" : `${money(selection.unitPrice)} 美元 / 件`}`,
              `参考货值：${total === null ? "联系询价" : `$${total.toFixed(2)}`}`,
              "请确认 MOQ、样品政策、交期、包装、装柜量和正式报价，谢谢。"
            ]
          : [
              "Hello LONFRO, I would like to inquire about this configuration:",
              `Model: ${selection.model}`,
              `Color: ${selection.color}`,
              `Wheel configuration: ${selection.wheel}`,
              `Accessories / customization: ${accessories}`,
              `Purchase quantity: ${selection.quantity} pcs`,
              `Unit reference: ${selection.unitPrice === null ? "Contact for Price" : `${money(selection.unitPrice)} USD / pc`}`,
              `Reference goods total: ${total === null ? "Contact for Price" : `$${total.toFixed(2)}`}`,
              "Please confirm MOQ, sample policy, lead time, packing, container load and a formal quotation."
            ];
        whatsapp.href = `https://wa.me/85291242307?text=${encodeURIComponent(lines.join("\n"))}`;
      }
    };

    configurator.querySelectorAll("input").forEach((input) => input.addEventListener("change", updateConfiguration));
    quantityInput?.addEventListener("input", updateConfiguration);
    configurator.querySelectorAll("[data-quantity-step]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!quantityInput) return;
        const next = Math.max(1, Math.round(Number(quantityInput.value) || 1) + Number(button.dataset.quantityStep));
        quantityInput.value = String(next);
        updateConfiguration();
      });
    });

    configurator.querySelectorAll("[data-gallery-target]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.galleryTarget;
        configurator.querySelectorAll("[data-gallery-slide]").forEach((slide) => { slide.hidden = slide.dataset.gallerySlide !== target; });
        configurator.querySelectorAll("[data-gallery-target]").forEach((tab) => tab.setAttribute("aria-selected", String(tab === button)));
      });
    });

    addRfq?.addEventListener("click", () => {
      const selection = currentSelection();
      const signature = [selection.id, selection.colorEn, selection.wheelEn, ...selection.accessoriesEn].join("|");
      const items = readRfq();
      const existingIndex = items.findIndex((item) => item.signature === signature);
      const item = { ...selection, signature };
      if (existingIndex >= 0) items[existingIndex] = item;
      else items.push(item);
      writeRfq(items);
      updateRfq();
      if (feedback) {
        feedback.textContent = isZh ? "已加入 RFQ 询价清单，可继续选择其他型号。" : "Added to your RFQ list. You can continue with another model.";
        feedback.hidden = false;
      }
      track("rfq_add", { model: selection.model, quantity: selection.quantity });
    });

    updateConfiguration();
  });

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

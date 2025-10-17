(function () {
  "use strict";
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Pricing toggle (used on pricing page)
  var toggle = document.getElementById("billing-toggle");
  if (toggle) {
    toggle.addEventListener("change", function () {
      var isYearly = toggle.checked;
      var monthlyPrices = document.querySelectorAll("[data-price-monthly]");
      var yearlyPrices = document.querySelectorAll("[data-price-yearly]");
      monthlyPrices.forEach(function (el) { el.style.display = isYearly ? "none" : "inline"; });
      yearlyPrices.forEach(function (el) { el.style.display = isYearly ? "inline" : "none"; });
    });
  }

  // Contact form basic handling (no backend)
  var contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var form = e.currentTarget;
      var button = form.querySelector("button[type=submit]");
      if (button) button.disabled = true;
      var data = new FormData(form);
      var name = data.get("name");
      var email = data.get("email");
      var message = data.get("message");
      alert("Thanks, " + name + "! We'll be in touch at " + email + ".");
      if (button) button.disabled = false;
      form.reset();
    });
  }
})();

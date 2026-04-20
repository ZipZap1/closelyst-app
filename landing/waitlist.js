// Waitlist capture stub.
// Real submission target will be wired up once the backend is stood up
// (see HAC stack proposal). For now this validates the email client-side,
// stores it in localStorage so we don't lose early sign-ups during demos,
// and shows a friendly confirmation.
(function () {
  var form = document.getElementById("waitlist-form");
  var status = document.getElementById("form-status");
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
  if (!form || !status) return;

  var input = form.querySelector('input[type="email"]');
  var button = form.querySelector('button[type="submit"]');
  var STORAGE_KEY = "mdm.waitlist.v1";

  function setStatus(message, kind) {
    status.textContent = message;
    status.classList.remove("success", "error");
    if (kind) status.classList.add(kind);
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function persist(email) {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];
      if (list.indexOf(email) === -1) list.push(email);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (_) {
      // localStorage unavailable (private mode, etc.) — non-fatal for the stub.
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var email = (input.value || "").trim();
    if (!isValidEmail(email)) {
      setStatus("Bitte gib eine gültige E‑Mail‑Adresse ein.", "error");
      input.focus();
      return;
    }
    button.disabled = true;
    persist(email);
    setStatus(
      "Danke! Wir melden uns, sobald dein Platz in der Beta frei ist.",
      "success"
    );
    form.reset();
    setTimeout(function () {
      button.disabled = false;
    }, 600);
  });
})();

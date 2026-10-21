(function () {
  "use strict";

  var LANGUAGES = [
    { code: "en", name: "English", greeting: "Hi", phonetic: "hai", note: "Glad you're here.", region: "Global" },
    { code: "es", name: "Spanish", greeting: "Hola", phonetic: "OH-lah", note: "Qué bueno verte.", region: "Spain · LatAm" },
    { code: "fr", name: "French", greeting: "Bonjour", phonetic: "bohn-ZHOOR", note: "Ravi de te voir.", region: "France" },
    { code: "de", name: "German", greeting: "Hallo", phonetic: "HAH-loh", note: "Schön, dass du da bist.", region: "Germany" },
    { code: "ja", name: "Japanese", greeting: "こんにちは", phonetic: "kon-nee-chee-wah", note: "会えてうれしいです。", region: "Japan" },
    { code: "hi", name: "Hindi", greeting: "नमस्ते", phonetic: "nuh-muh-STAY", note: "आपसे मिलकर खुशी हुई।", region: "India" },
    { code: "sw", name: "Swahili", greeting: "Jambo", phonetic: "JAHM-boh", note: "Karibu sana.", region: "East Africa" },
    { code: "ar", name: "Arabic", greeting: "مرحبا", phonetic: "mar-HAH-bah", note: "سعيد بلقائك.", region: "Middle East" },
    { code: "pt", name: "Portuguese", greeting: "Olá", phonetic: "oh-LAH", note: "Que bom te ver.", region: "Brazil · Portugal" },
    { code: "ko", name: "Korean", greeting: "안녕하세요", phonetic: "an-nyeong-ha-se-yo", note: "만나서 반가워요.", region: "Korea" },
    { code: "it", name: "Italian", greeting: "Ciao", phonetic: "CHOW", note: "Che bello vederti.", region: "Italy" },
    { code: "tr", name: "Turkish", greeting: "Merhaba", phonetic: "mer-hah-BAH", note: "Seni görmek güzel.", region: "Türkiye" }
  ];

  var MOODS = [
    { id: "sunny", label: "Sunny", note: "Glad you're here." },
    { id: "cozy", label: "Cozy", note: "Come in, stay a while." },
    { id: "bold", label: "Bold", note: "Let's make today count." },
    { id: "chill", label: "Chill", note: "No rush. Just hello." },
    { id: "sparkly", label: "Sparkly", note: "You made this moment brighter." }
  ];

  var NAMES = ["Ada", "Sam", "Mei", "Priya", "Leo", "Noor", "Sol", "Finn", "Amara", "Theo", "Iris", "Kai", "Luna", "Omar", "Zoe", "Ravi"];

  var state = {
    name: "",
    moodId: "sunny",
    languageIndex: 0
  };

  var el = {
    body: document.body,
    cardLang: document.getElementById("card-lang"),
    cardGreeting: document.getElementById("card-greeting"),
    cardName: document.getElementById("card-name"),
    cardNote: document.getElementById("card-note"),
    cardMood: document.getElementById("card-mood"),
    cardTime: document.getElementById("card-time"),
    form: document.getElementById("hello-form"),
    name: document.getElementById("name"),
    language: document.getElementById("language"),
    moodChips: document.getElementById("mood-chips"),
    formHint: document.getElementById("form-hint"),
    previewCode: document.getElementById("preview-code"),
    previewGreeting: document.getElementById("preview-greeting"),
    previewNote: document.getElementById("preview-note"),
    previewPhonetic: document.getElementById("preview-phonetic"),
    previewLanguage: document.getElementById("preview-language"),
    copyHello: document.getElementById("copy-hello"),
    worldGrid: document.getElementById("world-grid"),
    surprise: document.getElementById("surprise"),
    share: document.getElementById("share"),
    shareStatus: document.getElementById("share-status"),
    themeToggle: document.getElementById("theme-toggle")
  };

  function safeStorage(action, key, value) {
    try {
      if (action === "get") return window.localStorage.getItem(key);
      if (action === "set") window.localStorage.setItem(key, value);
    } catch (error) {
      return null;
    }
    return null;
  }

  function currentMood() {
    for (var i = 0; i < MOODS.length; i += 1) {
      if (MOODS[i].id === state.moodId) return MOODS[i];
    }
    return MOODS[0];
  }

  function currentLanguage() {
    return LANGUAGES[state.languageIndex] || LANGUAGES[0];
  }

  function timeParts() {
    var now = new Date();
    var hours = now.getHours();
    var label = hours < 12 ? "Morning" : hours < 18 ? "Afternoon" : "Evening";
    var time = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(now);
    return { label: label, time: time };
  }

  function displayName() {
    var name = state.name.trim();
    return name || "friend";
  }

  function renderTime() {
    var parts = timeParts();
    el.cardTime.textContent = parts.label + " · " + parts.time;
  }

  function render() {
    var language = currentLanguage();
    var mood = currentMood();
    var name = displayName();

    el.body.dataset.mood = mood.id;
    el.cardLang.textContent = language.code.toUpperCase();
    el.cardGreeting.textContent = language.greeting;
    el.cardName.textContent = name;
    el.cardNote.textContent = mood.note;
    el.cardMood.textContent = mood.label;

    el.previewCode.textContent = language.code.toUpperCase();
    el.previewGreeting.textContent = language.greeting + ", " + name + ".";
    el.previewNote.textContent = language.note;
    el.previewPhonetic.textContent = language.phonetic;
    el.previewLanguage.textContent = language.name;

    el.language.value = String(state.languageIndex);

    var chips = el.moodChips.querySelectorAll(".chip");
    for (var i = 0; i < chips.length; i += 1) {
      var active = chips[i].getAttribute("data-mood") === mood.id;
      chips[i].classList.toggle("is-active", active);
      chips[i].setAttribute("aria-pressed", active ? "true" : "false");
    }

    renderTime();
  }

  function setHint(message) {
    el.formHint.textContent = message;
  }

  function populateLanguages() {
    for (var i = 0; i < LANGUAGES.length; i += 1) {
      var option = document.createElement("option");
      option.value = String(i);
      option.textContent = LANGUAGES[i].name + " — " + LANGUAGES[i].greeting;
      el.language.appendChild(option);
    }
  }

  function populateWorld() {
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < LANGUAGES.length; i += 1) {
      (function (index) {
        var language = LANGUAGES[index];
        var card = document.createElement("button");
        card.type = "button";
        card.className = "world-card";
        card.setAttribute("aria-label", "Use " + language.name + " greeting " + language.greeting);

        var region = document.createElement("span");
        region.className = "world-region";
        region.textContent = language.region;

        var greeting = document.createElement("span");
        greeting.className = "world-greeting";
        greeting.textContent = language.greeting;

        var phonetic = document.createElement("span");
        phonetic.className = "world-phonetic";
        phonetic.textContent = language.phonetic;

        var name = document.createElement("span");
        name.className = "world-language";
        name.textContent = language.name;

        card.appendChild(region);
        card.appendChild(greeting);
        card.appendChild(phonetic);
        card.appendChild(name);

        card.addEventListener("click", function () {
          state.languageIndex = index;
          render();
          el.name.focus();
          document.getElementById("hello").scrollIntoView({ behavior: "smooth", block: "start" });
          setHint(language.name + " loaded. Add a name or copy the hello.");
        });

        fragment.appendChild(card);
      })(i);
    }
    el.worldGrid.appendChild(fragment);
  }

  function applyTheme(theme) {
    var dark = theme === "dark";
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    el.themeToggle.setAttribute("aria-pressed", dark ? "true" : "false");
    el.themeToggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    safeStorage("set", "hi-theme", dark ? "dark" : "light");
  }

  function initTheme() {
    var stored = safeStorage("get", "hi-theme");
    if (stored === "dark" || stored === "light") {
      applyTheme(stored);
      return;
    }
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark ? "dark" : "light");
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        var ok = document.execCommand("copy");
        document.body.removeChild(area);
        if (ok) resolve();
        else reject(new Error("copy failed"));
      } catch (error) {
        document.body.removeChild(area);
        reject(error);
      }
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    state.name = el.name.value;
    render();
    setHint("Hello updated. Say it out loud — it's good for you.");
  }

  function init() {
    initTheme();
    populateLanguages();
    populateWorld();

    el.name.addEventListener("input", function () {
      state.name = el.name.value;
      render();
    });

    el.name.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        handleSubmit(event);
      }
    });

    el.language.addEventListener("change", function () {
      state.languageIndex = Number(el.language.value) || 0;
      render();
      setHint(currentLanguage().name + " selected.");
    });

    el.moodChips.addEventListener("click", function (event) {
      var button = event.target.closest(".chip");
      if (!button) return;
      state.moodId = button.getAttribute("data-mood") || "sunny";
      render();
      setHint("Mood set to " + currentMood().label + ".");
    });

    el.form.addEventListener("submit", handleSubmit);

    el.copyHello.addEventListener("click", function () {
      var text = el.previewGreeting.textContent;
      copyText(text).then(function () {
        setHint("Copied: " + text);
        el.copyHello.textContent = "Copied";
        window.setTimeout(function () {
          el.copyHello.textContent = "Copy hello";
        }, 1800);
      }).catch(function () {
        setHint("Select the preview text and copy it manually.");
      });
    });

    el.surprise.addEventListener("click", function () {
      state.name = NAMES[Math.floor(Math.random() * NAMES.length)];
      state.languageIndex = Math.floor(Math.random() * LANGUAGES.length);
      state.moodId = MOODS[Math.floor(Math.random() * MOODS.length)].id;
      el.name.value = state.name;
      render();
      setHint("Surprise: " + currentLanguage().name + ", " + currentMood().label.toLowerCase() + ", for " + state.name + ".");
    });

    el.share.addEventListener("click", function () {
      var url = window.location.href;
      copyText(url).then(function () {
        el.shareStatus.textContent = "Page link copied.";
      }).catch(function () {
        el.shareStatus.textContent = "Copy this link: " + url;
      });
    });

    el.themeToggle.addEventListener("click", function () {
      var isDark = document.documentElement.getAttribute("data-theme") === "dark";
      applyTheme(isDark ? "light" : "dark");
    });

    el.name.value = state.name;
    render();
    window.setInterval(renderTime, 30000);

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        document.body.dataset.ready = "true";
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

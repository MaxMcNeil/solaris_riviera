/* =========================================================
   SOLARIS — main.js
   ========================================================= */
(function(){
  "use strict";

  var WHATSAPP_NUMBER = "393513866250"; // +39 351 386 6250

  /* ---------- i18n engine ---------- */
  function detectLang(){
    var saved = null;
    try{ saved = localStorage.getItem("solaris_lang"); }catch(e){}
    if(saved === "fr" || saved === "en" || saved === "it") return saved;
    var langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || navigator.userLanguage || "fr"];
    for(var i=0; i<langs.length; i++){
      var l = (langs[i] || "").toLowerCase();
      if(l.indexOf("fr") === 0) return "fr";
      if(l.indexOf("it") === 0) return "it";
      if(l.indexOf("en") === 0) return "en";
    }
    return "en";
  }

  var currentLang = detectLang();

  function t(key){
    var dict = window.SOLARIS_I18N[currentLang] || {};
    return (key in dict) ? dict[key] : (window.SOLARIS_I18N.fr[key] || key);
  }

  function applyI18n(){
    document.documentElement.lang = currentLang;
    document.querySelectorAll("[data-i18n]").forEach(function(el){
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function(el){
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function(el){
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });
    var titleKey = document.body.getAttribute("data-page-title") || "meta.title";
    var descKey = document.body.getAttribute("data-page-desc") || "meta.desc";
    document.title = t(titleKey);
    var metaDesc = document.querySelector('meta[name="description"]');
    if(metaDesc) metaDesc.setAttribute("content", t(descKey));

    document.querySelectorAll(".lang-switch button").forEach(function(btn){
      btn.classList.toggle("is-active", btn.getAttribute("data-lang") === currentLang);
    });
  }

  function setLang(lang){
    currentLang = lang;
    try{ localStorage.setItem("solaris_lang", lang); }catch(e){}
    applyI18n();
    if(window.SOLARIS_SIM && window.SOLARIS_SIM.refresh) window.SOLARIS_SIM.refresh();
  }

  document.addEventListener("click", function(e){
    var btn = e.target.closest("[data-lang]");
    if(btn){ setLang(btn.getAttribute("data-lang")); }
  });

  /* ---------- Mobile nav ---------- */
  function initMobileNav(){
    var toggle = document.querySelector(".menu-toggle");
    var nav = document.querySelector(".mobile-nav");
    var close = document.querySelector(".mobile-nav-top button");
    if(!toggle || !nav) return;
    function open(){ nav.classList.add("is-open"); document.body.style.overflow = "hidden"; }
    function shut(){ nav.classList.remove("is-open"); document.body.style.overflow = ""; }
    toggle.addEventListener("click", open);
    if(close) close.addEventListener("click", shut);
    nav.querySelectorAll("a").forEach(function(a){ a.addEventListener("click", shut); });
  }

  /* ---------- FAQ accordion ---------- */
  function initFaq(){
    document.querySelectorAll(".faq-item").forEach(function(item){
      var q = item.querySelector(".faq-q");
      var a = item.querySelector(".faq-a");
      if(!q || !a) return;
      q.addEventListener("click", function(){
        var isOpen = item.classList.contains("is-open");
        item.parentNode.querySelectorAll(".faq-item").forEach(function(other){
          other.classList.remove("is-open");
          other.querySelector(".faq-a").style.maxHeight = null;
        });
        if(!isOpen){
          item.classList.add("is-open");
          a.style.maxHeight = a.scrollHeight + "px";
        }
      });
    });
  }

  /* ---------- Cookie banner ---------- */
  function initCookieBar(){
    var bar = document.querySelector(".cookie-bar");
    if(!bar) return;
    var consent = null;
    try{ consent = localStorage.getItem("solaris_cookie_consent"); }catch(e){}
    if(!consent){
      setTimeout(function(){ bar.classList.add("is-visible"); }, 600);
    }
    bar.querySelectorAll("[data-cookie]").forEach(function(btn){
      btn.addEventListener("click", function(){
        try{ localStorage.setItem("solaris_cookie_consent", btn.getAttribute("data-cookie")); }catch(e){}
        bar.classList.remove("is-visible");
      });
    });
  }

  /* ---------- WhatsApp helper ---------- */
  function waLink(message){
    return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
  }

  function initWhatsAppCtas(){
    document.querySelectorAll("[data-wa-cta]").forEach(function(el){
      var msgKey = el.getAttribute("data-wa-cta");
      var messages = {
        fr: "Bonjour SOLARIS, je souhaite être contacté au sujet d'un projet (" + (msgKey || "site web") + ").",
        en: "Hello SOLARIS, I'd like to be contacted about a project (" + (msgKey || "website") + ")."
      };
      el.setAttribute("href", "#");
      el.addEventListener("click", function(ev){
        ev.preventDefault();
        window.open(waLink(messages[currentLang] || messages.fr), "_blank", "noopener");
      });
    });
    document.querySelectorAll("[data-wa-call]").forEach(function(el){
      var messages = {
        fr: "Bonjour SOLARIS, je souhaite parler à un expert.",
        en: "Hello SOLARIS, I'd like to talk to an expert."
      };
      el.setAttribute("href", "#");
      el.addEventListener("click", function(ev){
        ev.preventDefault();
        window.open(waLink(messages[currentLang] || messages.fr), "_blank", "noopener");
      });
    });
  }

  /* ---------- Objective cards -> jump to simulator ---------- */
  function initObjectiveCards(){
    document.querySelectorAll("[data-sim-goal]").forEach(function(card){
      card.addEventListener("click", function(){
        var goal = card.getAttribute("data-sim-goal");
        var sim = document.getElementById("simulateur");
        if(!sim) return;
        if(window.SOLARIS_SIM){
          window.SOLARIS_SIM.presetGoal(goal);
        }
        sim.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  /* ---------- Simulator ---------- */
  function initSimulator(){
    var root = document.querySelector(".simulator");
    if(!root) return;

    var steps = Array.prototype.slice.call(root.querySelectorAll(".sim-step"));
    var progressItems = Array.prototype.slice.call(root.querySelectorAll(".sim-progress i"));
    var successPanel = root.querySelector(".sim-success");
    var backBtn = root.querySelector(".sim-back");
    var nextBtn = root.querySelector(".sim-next");
    var current = 0;

    var state = { type: null, goal: null, budget: null, address: "", firstname: "", lastname: "", phone: "", email: "" };

    function updateProgress(){
      progressItems.forEach(function(el, i){
        el.classList.toggle("is-done", i < current);
        el.classList.toggle("is-active", i === current);
      });
    }

    function showStep(i){
      steps.forEach(function(s, idx){ s.classList.toggle("is-active", idx === i); });
      current = i;
      updateProgress();
      backBtn.disabled = (i === 0);
      var isLast = (i === steps.length - 1);
      nextBtn.textContent = isLast ? t("sim.s5.cta") : t("sim.nav.next");
      root.querySelector(".sim-nav").style.display = "flex";
    }

    function canAdvance(i){
      if(i === 0) return !!state.type;
      if(i === 1) return !!state.goal;
      if(i === 2) return !!state.budget;
      if(i === 3) return true;
      if(i === 4) return !!(state.firstname && (state.phone || state.email));
      return true;
    }

    root.querySelectorAll(".choice").forEach(function(choice){
      choice.addEventListener("click", function(){
        var group = choice.closest(".choice-grid");
        var field = group.getAttribute("data-field");
        var value = choice.getAttribute("data-value");
        group.querySelectorAll(".choice").forEach(function(c){ c.classList.remove("is-selected"); });
        choice.classList.add("is-selected");
        state[field] = value;
      });
    });

    root.querySelectorAll("input[data-field]").forEach(function(input){
      input.addEventListener("input", function(){
        state[input.getAttribute("data-field")] = input.value.trim();
      });
    });

    function buildRecap(){
      var recap = root.querySelector(".recap");
      if(!recap) return;
      recap.innerHTML =
        "<div><b>" + t("sim.recap.type") + ":</b> " + (state.type || "—") + "</div>" +
        "<div><b>" + t("sim.recap.goal") + ":</b> " + (state.goal || "—") + "</div>" +
        "<div><b>" + t("sim.recap.budget") + ":</b> " + (state.budget || "—") + "</div>" +
        "<div><b>" + t("sim.recap.address") + ":</b> " + (state.address || "—") + "</div>";
    }

    function buildWaMessage(){
      var lines = currentLang === "fr" ? [
        "Bonjour SOLARIS, voici ma demande d'étude :",
        "Type de projet : " + (state.type || "—"),
        "Objectif : " + (state.goal || "—"),
        "Consommation : " + (state.budget || "—"),
        "Adresse : " + (state.address || "—"),
        "Nom : " + (state.firstname || "") + " " + (state.lastname || ""),
        "Téléphone : " + (state.phone || "—"),
        "Email : " + (state.email || "—")
      ] : [
        "Hello SOLARIS, here is my study request:",
        "Project type: " + (state.type || "—"),
        "Goal: " + (state.goal || "—"),
        "Energy spend: " + (state.budget || "—"),
        "Address: " + (state.address || "—"),
        "Name: " + (state.firstname || "") + " " + (state.lastname || ""),
        "Phone: " + (state.phone || "—"),
        "Email: " + (state.email || "—")
      ];
      return lines.join("\n");
    }

    function submit(){
      buildRecap();
      steps.forEach(function(s){ s.classList.remove("is-active"); });
      root.querySelector(".sim-nav").style.display = "none";
      root.querySelector(".sim-progress").style.display = "none";
      successPanel.classList.add("is-active");
      var waBtn = successPanel.querySelector("[data-wa-submit]");
      if(waBtn){
        waBtn.onclick = function(){
          window.open(waLink(buildWaMessage()), "_blank", "noopener");
        };
      }
    }

    nextBtn.addEventListener("click", function(){
      if(!canAdvance(current)){
        var activeStep = root.querySelectorAll(".sim-step.is-active")[0];
        activeStep.classList.remove("shake");
        void activeStep.offsetWidth;
        activeStep.classList.add("shake");
        return;
      }
      if(current === steps.length - 1){ submit(); return; }
      showStep(current + 1);
    });

    backBtn.addEventListener("click", function(){
      if(current > 0) showStep(current - 1);
    });

    var retryBtn = successPanel.querySelector("[data-sim-retry]");
    if(retryBtn){
      retryBtn.addEventListener("click", function(){
        successPanel.classList.remove("is-active");
        root.querySelector(".sim-progress").style.display = "flex";
        showStep(0);
      });
    }

    window.SOLARIS_SIM = {
      presetGoal: function(goalKey){
        var map = {
          bill: 0, secure: 2, automate: 3, all: 4
        };
        var idx = map[goalKey];
        if(idx === undefined) return;
        var group = steps[1].querySelector(".choice-grid");
        var choice = group.querySelectorAll(".choice")[idx];
        if(choice){ choice.click(); }
        showStep(1);
      },
      refresh: function(){ updateProgress(); nextBtn.textContent = (current === steps.length - 1) ? t("sim.s5.cta") : t("sim.nav.next"); }
    };

    showStep(0);
  }

  /* ---------- Active nav link on scroll (best-effort, light) ---------- */
  function initActiveNav(){
    var links = document.querySelectorAll(".main-nav a[href^='#']");
    if(!links.length) return;
    var sections = Array.prototype.map.call(links, function(a){
      return document.querySelector(a.getAttribute("href"));
    }).filter(Boolean);
    if(!sections.length) return;
    var onScroll = function(){
      var pos = window.scrollY + 120;
      var activeIdx = 0;
      sections.forEach(function(sec, i){ if(sec.offsetTop <= pos) activeIdx = i; });
      links.forEach(function(a, i){ a.classList.toggle("is-active", i === activeIdx); });
    };
    document.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Intro carousel (hero / objectif / positionnement) ---------- */
  function initCarousel(){
    var track = document.querySelector(".carousel-track");
    if(!track) return;
    var slides = Array.prototype.slice.call(track.querySelectorAll(".carousel-slide"));
    var dots = Array.prototype.slice.call(document.querySelectorAll(".carousel-dot"));
    var prevBtn = document.querySelector(".carousel-arrow--prev");
    var nextBtn = document.querySelector(".carousel-arrow--next");
    if(!slides.length) return;

    function activeIndex(){
      var w = track.clientWidth || 1;
      return Math.round(track.scrollLeft / w);
    }
    function update(){
      var idx = activeIndex();
      dots.forEach(function(d,i){ d.classList.toggle("is-active", i === idx); });
      if(prevBtn) prevBtn.classList.toggle("is-disabled", idx === 0);
      if(nextBtn) nextBtn.classList.toggle("is-disabled", idx === slides.length - 1);
    }
    function goTo(i){
      i = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
    }

    var ticking = false;
    track.addEventListener("scroll", function(){
      if(!ticking){
        window.requestAnimationFrame(function(){ update(); ticking = false; });
        ticking = true;
      }
    }, { passive: true });

    dots.forEach(function(d, i){ d.addEventListener("click", function(){ goTo(i); }); });
    if(prevBtn) prevBtn.addEventListener("click", function(){ goTo(activeIndex() - 1); });
    if(nextBtn) nextBtn.addEventListener("click", function(){ goTo(activeIndex() + 1); });
    window.addEventListener("resize", function(){ goTo(activeIndex()); });

    update();
  }

  document.addEventListener("DOMContentLoaded", function(){
    applyI18n();
    initMobileNav();
    initFaq();
    initCookieBar();
    initWhatsAppCtas();
    initObjectiveCards();
    initSimulator();
    initActiveNav();
    initCarousel();
  });
})();

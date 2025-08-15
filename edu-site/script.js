(function () {
  "use strict";

  function getElement(id) {
    var element = document.getElementById(id);
    if (!element) throw new Error("Missing element: " + id);
    return element;
  }

  function formatTime(totalSeconds) {
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  }

  // Pomodoro
  var timerDisplay = getElement("timer-display");
  var startButton = getElement("start-timer");
  var pauseButton = getElement("pause-timer");
  var resetButton = getElement("reset-timer");
  var focusInput = getElement("focus-minutes");
  var breakInput = getElement("break-minutes");

  var intervalId = null;
  var isOnBreak = false;
  var secondsRemaining = parseInt(focusInput.value, 10) * 60;

  function updateDisplay() {
    timerDisplay.textContent = formatTime(secondsRemaining);
  }

  function tick() {
    secondsRemaining -= 1;
    if (secondsRemaining <= 0) {
      isOnBreak = !isOnBreak;
      var minutes = isOnBreak ? parseInt(breakInput.value, 10) : parseInt(focusInput.value, 10);
      secondsRemaining = minutes * 60;
      try { navigator.vibrate && navigator.vibrate(150); } catch (_) {}
    }
    updateDisplay();
  }

  function startTimer() {
    if (intervalId) return;
    intervalId = setInterval(tick, 1000);
  }

  function pauseTimer() {
    if (!intervalId) return;
    clearInterval(intervalId);
    intervalId = null;
  }

  function resetTimer() {
    pauseTimer();
    isOnBreak = false;
    secondsRemaining = parseInt(focusInput.value, 10) * 60;
    updateDisplay();
  }

  startButton.addEventListener("click", startTimer);
  pauseButton.addEventListener("click", pauseTimer);
  resetButton.addEventListener("click", resetTimer);

  focusInput.addEventListener("change", function () {
    if (!intervalId && !isOnBreak) {
      secondsRemaining = parseInt(focusInput.value, 10) * 60;
      updateDisplay();
    }
  });

  breakInput.addEventListener("change", function () {
    if (!intervalId && isOnBreak) {
      secondsRemaining = parseInt(breakInput.value, 10) * 60;
      updateDisplay();
    }
  });

  updateDisplay();

  // Flashcards
  var termInput = getElement("flash-term");
  var defInput = getElement("flash-definition");
  var addButton = getElement("add-flashcard");
  var list = getElement("flash-list");

  function createFlashItem(term, definition) {
    var li = document.createElement("li");
    li.className = "flash-item";

    var termEl = document.createElement("div");
    termEl.className = "flash-term";
    termEl.textContent = term;

    var defEl = document.createElement("div");
    defEl.className = "flash-definition";
    defEl.textContent = definition;

    li.appendChild(termEl);
    li.appendChild(defEl);

    li.addEventListener("click", function () {
      var isHidden = defEl.style.display === "none";
      defEl.style.display = isHidden ? "block" : "none";
    });

    return li;
  }

  addButton.addEventListener("click", function () {
    var term = termInput.value.trim();
    var def = defInput.value.trim();
    if (!term || !def) return;
    var item = createFlashItem(term, def);
    list.prepend(item);
    termInput.value = "";
    defInput.value = "";
    defInput.style.display = "block";
  });

  // Footer year
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
})();
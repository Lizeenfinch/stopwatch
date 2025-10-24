// script.js - Enhanced Stopwatch with Modern Features
// Author: Hector JS

// ============================================
// STATE VARIABLES
// ============================================
var hr = 0,
  min = 0,
  sec = 0,
  count = 0;

var prev_hr = 0,
  prev_min = 0,
  prev_sec = 0,
  prev_count = 0;

var diff_hr = 0,
  diff_min = 0,
  diff_sec = 0,
  diff_count = 0;

var timer = false;
var lapCounter = 1;

let timerInterval = null;

// --- ADDED FOR PiP ---
let pipWindow = null;
let pipRequestInProgress = false;
// --- END PiP ---

// ============================================
// SOUND EFFECTS
// ============================================
const tickSound = new Audio("audio/ticking.mp3");
tickSound.loop = true;

const beepSound = new Audio("audio/beep_cut.mp3");
const startSound = new Audio("audio/sound_trim.mp3");

let tickToggle = null;
let isTickEnabled = false;

// ============================================
// INITIALIZATION & LOCAL STORAGE
// ============================================
document.addEventListener("DOMContentLoaded", function () {
  // Load saved state from localStorage
  loadStopwatchState();
  
  // Load dark mode preference
  loadDarkModePreference();
  
  // Initialize tick toggle
  tickToggle = document.getElementById("tickToggle");
  if (tickToggle) {
    isTickEnabled = tickToggle.checked;

    // Listen for checkbox change
    tickToggle.addEventListener("change", (e) => {
      isTickEnabled = e.target.checked;

      // Handle real-time toggle during stopwatch running
      if (timer) {
        if (isTickEnabled) {
          tickSound.play().catch(() => {});
        } else {
          tickSound.pause();
          tickSound.currentTime = 0;
        }
      }
    });
  }
  
  // Setup dark mode toggle
  setupDarkModeToggle();
  
  // Initialize voice control (NEW)
  initializeVoiceControl();
});

// Save stopwatch state to localStorage
function saveStopwatchState() {
  const state = {
    hr: hr,
    min: min,
    sec: sec,
    count: count,
    timer: timer,
    lapCounter: lapCounter,
    timestamp: Date.now()
  };
  localStorage.setItem('stopwatchState', JSON.stringify(state));
}

// Load stopwatch state from localStorage
function loadStopwatchState() {
  const savedState = localStorage.getItem('stopwatchState');
  if (savedState) {
    try {
      const state = JSON.parse(savedState);
      // Only restore if saved within last 24 hours
      if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
        hr = state.hr || 0;
        min = state.min || 0;
        sec = state.sec || 0;
        count = state.count || 0;
        lapCounter = state.lapCounter || 1;
        
        // Update display
        updateDisplay();
      }
    } catch (e) {
      console.log('Error loading saved state:', e);
    }
  }
}

// Update display helper
function updateDisplay() {
  if ($id("hr")) $id("hr").innerHTML = hr < 10 ? "0" + hr : "" + hr;
  if ($id("min")) $id("min").innerHTML = min < 10 ? "0" + min : "" + min;
  if ($id("sec")) $id("sec").innerHTML = sec < 10 ? "0" + sec : "" + sec;
  if ($id("count")) $id("count").innerHTML = count < 10 ? "0" + count : "" + count;
}

// ============================================
// DARK MODE FUNCTIONALITY
// ============================================
function setupDarkModeToggle() {
  const checkbox = document.getElementById("light");
  if (checkbox) {
    checkbox.addEventListener("change", function() {
      document.body.classList.toggle("dark-mode");
      // Save preference
      localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    });
  }
}

function loadDarkModePreference() {
  const darkMode = localStorage.getItem('darkMode');
  const checkbox = document.getElementById("light");
  
  if (darkMode === 'true') {
    document.body.classList.add('dark-mode');
    if (checkbox) checkbox.checked = true;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function $id(id) {
  return document.getElementById(id);
}

// Play sound effect
function playSound(sound) {
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

// ============================================
// STOPWATCH CONTROLS
// ============================================
// Start / Pause toggle
function start() {
  if (!timer) {
    timer = true;
    
    // Play start sound
    playSound(startSound);
    
    if (isTickEnabled) {
      tickSound.play().catch(() => {});
    }
    if ($id("start"))
      $id("start").innerHTML = '<i class="far fa-pause-circle"></i> Pause';
    enhancedStopwatch();
  } else {
    timer = false;
    
    // Play beep sound on pause
    playSound(beepSound);
    
    tickSound.pause();
    if ($id("start"))
      $id("start").innerHTML = '<i class="far fa-play-circle"></i> Start';
  }
  
  // Save state
  saveStopwatchState();
}

// -- Stop (explicit) -----------------
function stop() {
  timer = false;
  closePipWindow(); // --- ADDED FOR PiP ---
  tickSound.pause();
  tickSound.currentTime = 0;
  if ($id("start"))
    $id("start").innerHTML = '<i class="far fa-play-circle"></i> Start';
}

// Reset stopwatch
function reset() {
  if ($id("record-container")) $id("record-container").style.display = "none";
  timer = false;
  closePipWindow(); // --- ADDED FOR PiP ---
  
  // Play beep sound on reset
  playSound(beepSound);
  
  tickSound.pause();
  tickSound.currentTime = 0;
  if ($id("start"))
    $id("start").innerHTML = '<i class="far fa-play-circle"></i> Start';

  clearTimeout(timeoutId);
  clearInterval(countdownInterval);

  hr = 0;
  min = 0;
  sec = 0;
  count = 0;

  if ($id("hr")) $id("hr").innerHTML = "00";
  if ($id("min")) $id("min").innerHTML = "00";
  if ($id("sec")) $id("sec").innerHTML = "00";
  if ($id("count")) $id("count").innerHTML = "00";

  if ($id("record-table-body")) $id("record-table-body").innerHTML = "";
  lapCounter = 1;

    // CLEAR COUNTDOWN INPUT & PRESETS
  const countdownInput = $id("countdown-minutes");
  if (countdownInput) {
    countdownInput.value = "";
    countdownInput.style.border = "2px solid rgba(255, 255, 255, 0.3)";
    countdownInput.style.background = "rgba(255, 255, 255, 0.08)";
    countdownInput.style.color = "white";
    countdownInput.style.transform = "scale(1)";
  }

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Clear saved state
  localStorage.removeItem('stopwatchState');
}

// ============================================
// STOPWATCH ENGINE
// ============================================
let timeoutId;
function stopwatch() {
  clearTimeout(timeoutId);
  clearInterval(countdownInterval);

  if (timer === true) count = count + 1;

  if (count == 99) {
    sec = sec + 1;
    count = 0;
  }
  if (sec == 59) {
    min = min + 1;
    sec = 0;
  }
  if (min == 59) {
    hr = hr + 1;
    min = 0;
    sec = 0;
  }

  var hrString = hr < 10 ? "0" + hr : "" + hr;
  var minString = min < 10 ? "0" + min : "" + min;
  var secString = sec < 10 ? "0" + sec : "" + sec;
  var countString = count < 10 ? "0" + count : "" + count;

  if ($id("hr")) $id("hr").innerHTML = hrString;
  if ($id("min")) $id("min").innerHTML = minString;
  if ($id("sec")) $id("sec").innerHTML = secString;
  if ($id("count")) $id("count").innerHTML = countString;

  // --- ADDED FOR PiP ---
  // If the PiP window is open, send it the new time
  if (pipWindow) {
      pipWindow.postMessage({
          hr: hrString,
          min: minString,
          sec: secString,
          count: countString // Send all four values
      });
  }
  // --- END PiP ---

  // Save state periodically (every second)
  if (count % 100 === 0) {
    saveStopwatchState();
  }

  timeoutId = setTimeout(stopwatch, 10);
}

// ============================================
// LAP FUNCTIONALITY
// ============================================
// Calculate lap time difference
function getdiff() {
  diff_hr = hr - prev_hr;
  diff_min = min - prev_min;
  if (diff_min < 0) {
    diff_min += 60;
    diff_hr -= 1;
  }
  diff_sec = sec - prev_sec;
  if (diff_sec < 0) {
    diff_sec += 60;
    diff_min -= 1;
  }
  diff_count = count - prev_count;
  if (diff_count < 0) {
    diff_count += 100;
    diff_sec -= 1;
  }

  prev_count = count;
  prev_sec = sec;
  prev_min = min;
  prev_hr = hr;
}

// Record lap time
function lap() {
  if (timer) {
    // Play beep sound
    playSound(beepSound);
    
    if ($id("record-container"))
      $id("record-container").style.display = "block";
    getdiff();

    var lap_time =
      ($id("hr") ? $id("hr").innerHTML : "00") +
      ":" +
      ($id("min") ? $id("min").innerHTML : "00") +
      ":" +
      ($id("sec") ? $id("sec").innerHTML : "00") +
      ":" +
      ($id("count") ? $id("count").innerHTML : "00");

    const table = $id("record-table-body");
    if (table) {
      const row = table.insertCell(0);
      const no_cell = row.insertCell(0);
      const time_cell = row.insertCell(1);
      const diff_cell = row.insertCell(2);

      no_cell.innerHTML = lapCounter;
      time_cell.innerHTML = lap_time;

      var hrString = diff_hr < 10 ? "0" + diff_hr : "" + diff_hr;
      var minString = diff_min < 10 ? "0" + diff_min : "" + diff_min;
      var secString = diff_sec < 10 ? "0" + diff_sec : "" + diff_sec;
      var countString = diff_count < 10 ? "0" + diff_count : "" + diff_count;

      diff_cell.innerHTML =
        hrString + ":" + minString + ":" + secString + ":" + countString;
      lapCounter++;
    }
  }
}

// Clear all lap records
function clearLap() {
  if ($id("record-container")) $id("record-container").style.display = "none";
  if ($id("record-table-body")) $id("record-table-body").innerHTML = "";
  lapCounter = 1;
}

// ============================================
// DATE DISPLAY
// ============================================
setInterval(() => {
  var d = new Date();
  var year = d.getFullYear();

  var day;
  switch (d.getDay()) {
    case 0:
      day = "Sunday";
      break;
    case 1:
      day = "Monday";
      break;
    case 2:
      day = "Tuesday";
      break;
    case 3:
      day = "Wednesday";
      break;
    case 4:
      day = "Thursday";
      break;
    case 5:
      day = "Friday";
      break;
    case 6:
      day = "Saturday";
      break;
  }

  var month;
  switch (d.getMonth()) {
    case 0:
      month = "Jan";
      break;
    case 1:
      month = "Feb";
      break;
    case 2:
      month = "March";
      break;
    case 3:
      month = "April";
      break;
    case 4:
      month = "May";
      break;
    case 5:
      month = "June";
      break;
    case 6:
      month = "July";
      break;
    case 7:
      month = "Aug";
      break;
    case 8:
      month = "Sept";
      break;
    case 9:
      month = "Oct";
      break;
    case 10:
      month = "Nov";
      break;
    case 11:
      month = "Dec";
      break;
  }

  var dayn = d.getDate();
  var dateStr = dayn + " " + month + " , " + year;

  if ($id("d1")) $id("d1").innerHTML = dateStr;
}, 1000);

const stopwatchBtn = document.getElementById("stopwatch-btn");
const countdownBtn = document.getElementById("countdown-btn");
const countdownInputContainer = document.getElementById(
  "countdown-input-container"
);
let mode = "stopwatch"; // default mode

stopwatchBtn.addEventListener("click", () => {
  mode = "stopwatch";
  stopwatchBtn.classList.add("active");
  countdownBtn.classList.remove("active");
  countdownInputContainer.style.display = "none";
  reset(); // reset stopwatch
});

countdownBtn.addEventListener("click", () => {
  mode = "countdown";
  countdownBtn.classList.add("active");
  stopwatchBtn.classList.remove("active");
  countdownInputContainer.style.display = "block";
  reset(); // reset stopwatch
});

// Countdown logic
let countdownInterval;
document.getElementById("start-countdown").addEventListener("click", () => {
  let minutes = parseFloat(document.getElementById("countdown-minutes").value);
  if (isNaN(minutes) || minutes <= 0) {
    alert("Enter a valid number of minutes");
    return;
  }

  let totalSeconds = Math.floor(minutes * 60);
  clearInterval(countdownInterval);

  if ($id("start"))
    $id("start").innerHTML = '<i class="far fa-play-circle"></i> Start';
  countdownInterval = setInterval(() => {
    let hrs = Math.floor(totalSeconds / 3600);
    let mins = Math.floor((totalSeconds % 3600) / 60);
    let secs = totalSeconds % 60;

    document.getElementById("hr").textContent = String(hrs).padStart(2, "0");
    document.getElementById("min").textContent = String(mins).padStart(2, "0");
    document.getElementById("sec").textContent = String(secs).padStart(2, "0");
    document.getElementById("count").textContent = "00";

    if (totalSeconds <= 0) {
      clearInterval(countdownInterval);
      alert("Time's up!");
    }

    totalSeconds--;
  }, 1000);
});

// Timer Preset functionality
let presetSound = new Audio("../audio/beep_cut.mp3");
presetSound.volume = 0.3;

function setPresetTimer(minutes) {
  // Play sound feedback
  presetSound.play().catch(() => {
    // Ignore audio play errors (browser restrictions)
  });
  
  // Set the input value
  document.getElementById("countdown-minutes").value = minutes.toFixed(1);
  
  // Update active preset button
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Find and activate the clicked preset
  const clickedBtn = document.querySelector(`[data-minutes="${minutes}"]`);
  if (clickedBtn) {
    clickedBtn.classList.add('active');
  }
  
  // Add visual feedback to input field
  const input = document.getElementById("countdown-minutes");
  input.style.border = "2px solid #ffb703";
  input.style.background = "rgba(255, 183, 3, 0.1)";
  input.style.color = "white";
  input.style.transform = "scale(1.02)";
  
  setTimeout(() => {
    input.style.transform = "scale(1)";
    input.style.background = "rgba(255, 255, 255, 0.08)";
    input.style.border = "2px solid rgba(255, 255, 255, 0.3)";
    input.style.color = "white";
  }, 300);
}
// ============================================
// VOICE COMMAND CONTROL (NEW FEATURE)
// ============================================

function initializeVoiceControl() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const voiceStatus = $id('voice-command-status');

    if (!SpeechRecognition) {
        if (voiceStatus) {
            voiceStatus.style.display = 'block';
            voiceStatus.innerHTML = '❌ Voice control not supported in this browser.';
            voiceStatus.style.color = '#ff0000';
        }
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = function() {
        if (voiceStatus) {
            voiceStatus.style.display = 'block';
            voiceStatus.innerHTML = '<i class="fas fa-microphone-alt"></i> **LISTENING:** Say "Start", "Stop", "Reset", or "Lap"';
            voiceStatus.style.color = '#43c6ac';
        }
    };

    recognition.onresult = function(event) {
        const last = event.results.length - 1;
        const rawCommand = event.results[last][0].transcript.trim();
        const command = rawCommand.toLowerCase();
        
        if (voiceStatus) {
            voiceStatus.innerHTML = `<i class="fas fa-bullhorn"></i> **COMMAND HEARD:** "${rawCommand}"`;
            voiceStatus.style.color = '#ffd166';
        }

        if (mode === 'stopwatch') {
            if (command.includes('start') || command.includes('stop') || command.includes('pause')) {
                start();
                if (voiceStatus) {
                    const action = timer ? 'Started' : 'Paused';
                    const icon = timer ? '<i class="fas fa-running"></i>' : '<i class="fas fa-pause-circle"></i>';
                    voiceStatus.innerHTML = `${icon} **ACTION:** Stopwatch ${action}.`;
                    voiceStatus.style.color = '#00ff00';
                }
            } else if (command.includes('reset')) {
                reset();
                if (voiceStatus) {
                    voiceStatus.innerHTML = '<i class="fas fa-undo"></i> **ACTION:** Stopwatch Reset.';
                    voiceStatus.style.color = '#00ff00';
                }
            } else if (command.includes('lap')) {
                lap();
                if (voiceStatus) {
                    voiceStatus.innerHTML = '<i class="fas fa-stopwatch"></i> **ACTION:** Lap Recorded.';
                    voiceStatus.style.color = '#00ff00';
                }
            } else {
                 // Reset status for unrecognized command
                if (voiceStatus) {
                    voiceStatus.innerHTML = '🤷 **DID NOT RECOGNIZE:** Please try "Start" or "Reset"';
                    voiceStatus.style.color = '#ff6b35';
                }
            }
        }
    };

    recognition.onerror = function(event) {
        if (voiceStatus) {
            voiceStatus.innerHTML = `⚠️ **ERROR:** Restarting voice service.`;
            voiceStatus.style.color = '#ff6b35';
        }
    };

    recognition.onend = function() {
     
        if (mode === 'stopwatch') {
             recognition.start();
        } else if (voiceStatus) {
             voiceStatus.innerHTML = '💤 Voice Control is inactive in Countdown Mode.';
        }
    };

    recognition.start();
}
document.addEventListener('keydown', function(event) {
    switch(event.key.toLowerCase()) {
        case ' ':
            event.preventDefault();
            startPauseStopwatch(); 
            break;
        case 'r':
            resetStopwatch();
            break;
        case 'l':
            recordLap();
            break;
        case 'c':
            startCountdownTimer();
            break;
    }
});
function startPauseStopwatch() {
    start();
}
function resetStopwatch() {
    reset();
}
function recordLap() {
    lap();
}
function startCountdownTimer() {
    if (mode === "countdown") {
        document.getElementById("start-countdown").click();
    } else {
        mode = "countdown";
        countdownBtn.click();
        document.getElementById("start-countdown").click();
    } 
}


// ============================================
// ANIMATED PROGRESS CIRCLE FUNCTIONALITY
// ============================================

let progressCircle = null;
let lapProgressBars = [];
let maxLapTime = 0;

function initializeProgressCircle() {
  progressCircle = document.getElementById('progress-ring-circle');
  if (progressCircle) {
    const radius = progressCircle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    progressCircle.style.strokeDashoffset = circumference;
  }
}

function updateProgressCircle() {
  if (!progressCircle || !timer) return;
  
  // Calculate progress based on seconds (0-60 seconds = full circle)
  const totalSeconds = (hr * 3600) + (min * 60) + sec + (count / 100);
  const progress = (totalSeconds % 60) / 60; // Reset every minute
  
  const radius = progressCircle.r.baseVal.value;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress * circumference);
  
  progressCircle.style.strokeDashoffset = offset;
}

function createLapProgressBar(lapNumber, lapTime, isLatest = false) {
  const lapBarsContainer = document.getElementById('lap-bars-container');
  const lapProgressContainer = document.getElementById('lap-progress-bars');
  
  if (!lapBarsContainer || !lapProgressContainer) return;
  
  // Show lap progress container
  lapProgressContainer.style.display = 'block';
  
  // Parse lap time to get total milliseconds
  const timeParts = lapTime.split(':');
  const totalMs = (parseInt(timeParts[0]) * 3600000) + 
                  (parseInt(timeParts[1]) * 60000) + 
                  (parseInt(timeParts[2]) * 1000) + 
                  (parseInt(timeParts[3]) * 10);
  
  // Update max lap time for scaling
  if (totalMs > maxLapTime) {
    maxLapTime = totalMs;
    // Rescale all existing bars
    updateAllLapBars();
  }
  
  // Create new lap bar
  const lapBar = document.createElement('div');
  lapBar.className = 'lap-bar';
  lapBar.innerHTML = `
    <div class="lap-bar-fill" style="width: 0%"></div>
    <div class="lap-bar-text">Lap ${lapNumber}: ${lapTime}</div>
  `;
  
  lapBarsContainer.insertBefore(lapBar, lapBarsContainer.firstChild);
  
  // Store lap data
  lapProgressBars.unshift({
    element: lapBar,
    time: totalMs,
    lapNumber: lapNumber
  });
  
  // Animate the bar
  setTimeout(() => {
    const fillElement = lapBar.querySelector('.lap-bar-fill');
    const percentage = maxLapTime > 0 ? (totalMs / maxLapTime) * 100 : 100;
    fillElement.style.width = `${percentage}%`;
  }, 100);
  
  // Keep only last 5 laps visible
  if (lapProgressBars.length > 5) {
    const oldestBar = lapProgressBars.pop();
    oldestBar.element.remove();
  }
}

function updateAllLapBars() {
  lapProgressBars.forEach(lapData => {
    const fillElement = lapData.element.querySelector('.lap-bar-fill');
    const percentage = maxLapTime > 0 ? (lapData.time / maxLapTime) * 100 : 100;
    fillElement.style.width = `${percentage}%`;
  });
}

function clearLapProgressBars() {
  const lapBarsContainer = document.getElementById('lap-bars-container');
  const lapProgressContainer = document.getElementById('lap-progress-bars');
  
  if (lapBarsContainer) lapBarsContainer.innerHTML = '';
  if (lapProgressContainer) lapProgressContainer.style.display = 'none';
  
  lapProgressBars = [];
  maxLapTime = 0;
}

// ============================================
// THEME PACKS FUNCTIONALITY
// ============================================

function initializeThemes() {
  const themeSelector = document.getElementById('seasonal-theme');
  if (!themeSelector) return;
  
  // Load saved theme
  const savedTheme = localStorage.getItem('selectedTheme') || 'default';
  themeSelector.value = savedTheme;
  applyTheme(savedTheme);
  
  // Listen for theme changes
  themeSelector.addEventListener('change', (e) => {
    const selectedTheme = e.target.value;
    applyTheme(selectedTheme);
    localStorage.setItem('selectedTheme', selectedTheme);
  });
}

function applyTheme(themeName) {
  // Remove all theme classes
  document.body.classList.remove('halloween-theme', 'winter-theme', 'summer-theme', 'spring-theme', 'neon-theme');
  
  // Apply selected theme
  if (themeName !== 'default') {
    document.body.classList.add(`${themeName}-theme`);
  }
  
  // Update progress circle color based on theme
  updateProgressCircleTheme(themeName);
}

function updateProgressCircleTheme(themeName) {
  const progressCircle = document.getElementById('progress-ring-circle');
  if (!progressCircle) return;
  
  const themeColors = {
    default: '#00ff88',
    halloween: '#ff6b35',
    winter: '#87ceeb',
    summer: '#ffd700',
    spring: '#98fb98',
    neon: '#ff00ff'
  };
  
  const color = themeColors[themeName] || themeColors.default;
  progressCircle.style.stroke = color;
  progressCircle.style.filter = `drop-shadow(0 0 15px ${color})`;
}

// ============================================
// ANIMATED BACKGROUNDS FUNCTIONALITY
// ============================================

let currentBackground = 'video';
let animationFrameId = null;

function initializeBackgrounds() {
  const bgToggle = document.getElementById('bg-toggle');
  const bgControls = document.getElementById('background-controls');
  const bgSelector = document.getElementById('background-selector');
  const customVideo = document.getElementById('custom-video');
  
  if (!bgToggle || !bgControls || !bgSelector) return;
  
  // Toggle background controls
  bgToggle.addEventListener('click', () => {
    bgControls.style.display = bgControls.style.display === 'none' ? 'block' : 'none';
  });
  
  // Background selector
  bgSelector.addEventListener('change', (e) => {
    switchBackground(e.target.value);
  });
  
  // Custom video upload
  if (customVideo) {
    customVideo.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        const video = document.getElementById('background-video');
        if (video) {
          video.src = url;
          switchBackground('video');
        }
      }
    });
  }
  
  // Load saved background preference
  const savedBg = localStorage.getItem('selectedBackground') || 'video';
  bgSelector.value = savedBg;
  switchBackground(savedBg);
}

function switchBackground(type) {
  const video = document.getElementById('background-video');
  const animatedBg = document.getElementById('animated-background');
  
  if (!video || !animatedBg) return;
  
  // Stop any running animations
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  // Clear animated background
  animatedBg.innerHTML = '';
  animatedBg.className = 'animated-bg';
  
  currentBackground = type;
  localStorage.setItem('selectedBackground', type);
  
  switch (type) {
    case 'video':
      video.style.display = 'block';
      animatedBg.style.display = 'none';
      break;
      
    case 'particles':
      video.style.display = 'none';
      animatedBg.style.display = 'block';
      animatedBg.classList.add('particles-bg');
      createParticles();
      break;
      
    case 'waves':
      video.style.display = 'none';
      animatedBg.style.display = 'block';
      animatedBg.classList.add('waves-bg');
      createWaves();
      break;
      
    case 'matrix':
      video.style.display = 'none';
      animatedBg.style.display = 'block';
      animatedBg.classList.add('matrix-bg');
      createMatrixRain();
      break;
      
    case 'stars':
      video.style.display = 'none';
      animatedBg.style.display = 'block';
      animatedBg.classList.add('stars-bg');
      createStarfield();
      break;
  }
}

function createParticles() {
  const container = document.getElementById('animated-background');
  if (!container) return;
  
  for (let i = 0; i < 50; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.width = (Math.random() * 4 + 2) + 'px';
    particle.style.height = particle.style.width;
    particle.style.animationDelay = Math.random() * 6 + 's';
    particle.style.animationDuration = (Math.random() * 4 + 4) + 's';
    container.appendChild(particle);
  }
}

function createWaves() {
  const container = document.getElementById('animated-background');
  if (!container) return;
  
  for (let i = 0; i < 3; i++) {
    const wave = document.createElement('div');
    wave.className = 'wave';
    wave.style.animationDelay = (i * 1.5) + 's';
    wave.style.bottom = (i * 20) + 'px';
    wave.style.opacity = 0.3 - (i * 0.1);
    container.appendChild(wave);
  }
}

function createMatrixRain() {
  const container = document.getElementById('animated-background');
  if (!container) return;
  
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
  
  function createMatrixChar() {
    const char = document.createElement('div');
    char.className = 'matrix-char';
    char.textContent = chars[Math.floor(Math.random() * chars.length)];
    char.style.left = Math.random() * 100 + '%';
    char.style.animationDuration = (Math.random() * 2 + 2) + 's';
    container.appendChild(char);
    
    setTimeout(() => {
      if (char.parentNode) {
        char.parentNode.removeChild(char);
      }
    }, 4000);
  }
  
  function animateMatrix() {
    if (currentBackground === 'matrix') {
      createMatrixChar();
      setTimeout(animateMatrix, 100);
    }
  }
  
  animateMatrix();
}

function createStarfield() {
  const container = document.getElementById('animated-background');
  if (!container) return;
  
  for (let i = 0; i < 100; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    const size = Math.random() * 3 + 1;
    star.style.width = size + 'px';
    star.style.height = size + 'px';
    star.style.animationDelay = Math.random() * 2 + 's';
    star.style.animationDuration = (Math.random() * 2 + 1) + 's';
    container.appendChild(star);
  }
}

// ============================================
// ENHANCED FUNCTIONALITY INTEGRATION
// ============================================

// Store references to original functions
let originalLapFunction = null;
let originalClearLapFunction = null;
let originalStopwatchFunction = null;

// Enhanced lap function
function enhancedLap() {
  if (timer) {
    // Play beep sound
    playSound(beepSound);
    
    if ($id("record-container"))
      $id("record-container").style.display = "block";
    getdiff();

    var lap_time =
      ($id("hr") ? $id("hr").innerHTML : "00") +
      ":" +
      ($id("min") ? $id("min").innerHTML : "00") +
      ":" +
      ($id("sec") ? $id("sec").innerHTML : "00") +
      ":" +
      ($id("count") ? $id("count").innerHTML : "00");

    const table = $id("record-table-body");
    if (table) {
      const row = table.insertRow(0);
      const no_cell = row.insertCell(0);
      const time_cell = row.insertCell(1);
      const diff_cell = row.insertCell(2);

      no_cell.innerHTML = lapCounter;
      time_cell.innerHTML = lap_time;

      var hrString = diff_hr < 10 ? "0" + diff_hr : "" + diff_hr;
      var minString = diff_min < 10 ? "0" + diff_min : "" + diff_min;
      var secString = diff_sec < 10 ? "0" + diff_sec : "" + diff_sec;
      var countString = diff_count < 10 ? "0" + diff_count : "" + diff_count;

      diff_cell.innerHTML =
        hrString + ":" + minString + ":" + secString + ":" + countString;
      lapCounter++;
    }
    
    // Create progress bar for this lap
    createLapProgressBar(lapCounter - 1, lap_time, true);
  }
}

// Enhanced clearLap function
function enhancedClearLap() {
  if ($id("record-container")) $id("record-container").style.display = "none";
  if ($id("record-table-body")) $id("record-table-body").innerHTML = "";
  lapCounter = 1;
  clearLapProgressBars(); // Clear progress bars
}

// Enhanced stopwatch function
function enhancedStopwatch() {
  clearTimeout(timeoutId);

  if (timer === true) count = count + 1;

  if (count == 99) {
    sec = sec + 1;
    count = 0;
  }
  if (sec == 59) {
    min = min + 1;
    sec = 0;
  }
  if (min == 59) {
    hr = hr + 1;
    min = 0;
    sec = 0;
  }

  var hrString = hr < 10 ? "0" + hr : "" + hr;
  var minString = min < 10 ? "0" + min : "" + min;
  var secString = sec < 10 ? "0" + sec : "" + sec;
  var countString = count < 10 ? "0" + count : "" + count;

  if ($id("hr")) $id("hr").innerHTML = hrString;
  if ($id("min")) $id("min").innerHTML = minString;
  if ($id("sec")) $id("sec").innerHTML = secString;
  if ($id("count")) $id("count").innerHTML = countString;

  // Update progress circle
  updateProgressCircle();

  // Save state periodically (every second)
  if (count % 100 === 0) {
    saveStopwatchState();
  }

  timeoutId = setTimeout(enhancedStopwatch, 10);
}

// Replace the original functions
function replaceOriginalFunctions() {
  // Replace lap function
  window.lap = enhancedLap;
  
  // Replace clearLap function  
  window.clearLap = enhancedClearLap;
  
  // Replace stopwatch function
  window.stopwatch = enhancedStopwatch;
}

// ============================================
// INITIALIZATION
// ============================================

// Enhanced DOMContentLoaded event
document.addEventListener("DOMContentLoaded", function () {
  // Replace original functions with enhanced versions
  replaceOriginalFunctions();
  
  // Initialize all new features
  initializeProgressCircle();
  initializeThemes();
  initializeBackgrounds();
  
  // Load saved state from localStorage (existing functionality)
  loadStopwatchState();
  
  // Load dark mode preference (existing functionality)
  loadDarkModePreference();
  
  // Initialize tick toggle (existing functionality)
  tickToggle = document.getElementById("tickToggle");
  if (tickToggle) {
    isTickEnabled = tickToggle.checked;
    tickToggle.addEventListener("change", (e) => {
      isTickEnabled = e.target.checked;
      if (timer) {
        if (isTickEnabled) {
          tickSound.play().catch(() => {});
        } else {
          tickSound.pause();
          tickSound.currentTime = 0;
        }
      }
    });
  }
  
  // Setup dark mode toggle (existing functionality)
  setupDarkModeToggle();
});

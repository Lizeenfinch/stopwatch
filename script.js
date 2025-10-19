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
  
  // Initialize voice control (ENHANCED)
  initializeVoiceControl();
  
  // Load voice preference
  const savedVoiceEnabled = localStorage.getItem('voiceEnabled');
  if (savedVoiceEnabled === 'true') {
    // Delay to ensure proper initialization
    setTimeout(() => {
      if (voiceRecognition) {
        toggleVoiceControl();
      }
    }, 1000);
  }
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
    stopwatch();
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
  tickSound.pause();
  tickSound.currentTime = 0;
  if ($id("start"))
    $id("start").innerHTML = '<i class="far fa-play-circle"></i> Start';
}

// Reset stopwatch
function reset() {
  if ($id("record-container")) $id("record-container").style.display = "none";
  timer = false;
  
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
    
    // Show export button when first lap is recorded
    if ($id("exportlap") && lapCounter === 1) {
      $id("exportlap").style.display = "inline-block";
    }
    
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
  if ($id("exportlap")) $id("exportlap").style.display = "none";
  lapCounter = 1;
}

// ============================================
// LAP EXPORT FUNCTIONALITY (NEW FEATURE)
// ============================================

// Export lap times to CSV
function exportLaps() {
  const tableBody = $id("record-table-body");
  if (!tableBody || tableBody.children.length === 0) {
    alert("No lap data to export!");
    return;
  }

  const rows = Array.from(tableBody.children);
  const lapData = [];
  
  // Add header
  lapData.push(['Lap Number', 'Total Time', 'Lap Time', 'Export Date']);
  
  // Add lap data (reverse order since table shows newest first)
  rows.reverse().forEach((row, index) => {
    const cells = row.children;
    if (cells.length >= 3) {
      lapData.push([
        cells[0].textContent, // Lap number
        cells[1].textContent, // Total time
        cells[2].textContent, // Lap difference
        new Date().toLocaleString() // Export timestamp
      ]);
    }
  });

  // Create CSV content
  const csvContent = lapData.map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `stopwatch-laps-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success message
    showVoiceStatus('📁 **EXPORTED** Lap times to CSV', '#43c6ac');
  } else {
    // Fallback for older browsers
    alert('Export not supported in this browser. Please use a modern browser.');
  }
}

// Export lap times to JSON format
function exportLapsJSON() {
  const tableBody = $id("record-table-body");
  if (!tableBody || tableBody.children.length === 0) {
    alert("No lap data to export!");
    return;
  }

  const rows = Array.from(tableBody.children);
  const lapData = {
    exportDate: new Date().toISOString(),
    totalLaps: rows.length,
    laps: []
  };
  
  // Add lap data (reverse order since table shows newest first)
  rows.reverse().forEach((row, index) => {
    const cells = row.children;
    if (cells.length >= 3) {
      lapData.laps.push({
        lapNumber: parseInt(cells[0].textContent),
        totalTime: cells[1].textContent,
        lapTime: cells[2].textContent,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Create JSON content
  const jsonContent = JSON.stringify(lapData, null, 2);

  // Create and download file
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `stopwatch-laps-${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success message
    showVoiceStatus('📁 **EXPORTED** Lap times to JSON', '#43c6ac');
  }
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
  let minutes = parseInt(document.getElementById("countdown-minutes").value);
  if (isNaN(minutes) || minutes < 0) {
    alert("Enter a valid number of minutes");
    return;
  }

  let totalSeconds = minutes * 60;
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
  document.getElementById("countdown-minutes").value = minutes;
  
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
// VOICE COMMAND CONTROL (ENHANCED FEATURE)
// ============================================

let voiceRecognition = null;
let isVoiceEnabled = false;

function initializeVoiceControl() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const voiceStatus = $id('voice-command-status');
    const voiceToggleBtn = $id('voice-toggle');

    if (!SpeechRecognition) {
        if (voiceStatus) {
            voiceStatus.style.display = 'block';
            voiceStatus.innerHTML = '❌ Voice control not supported in this browser.';
            voiceStatus.style.color = '#ff0000';
        }
        if (voiceToggleBtn) {
            voiceToggleBtn.style.display = 'none';
        }
        return;
    }

    // Show voice toggle button
    if (voiceToggleBtn) {
        voiceToggleBtn.style.display = 'inline-block';
        voiceToggleBtn.addEventListener('click', toggleVoiceControl);
    }

    voiceRecognition = new SpeechRecognition();
    voiceRecognition.continuous = true;
    voiceRecognition.interimResults = false;
    voiceRecognition.lang = 'en-US';

    voiceRecognition.onstart = function() {
        if (voiceStatus) {
            voiceStatus.style.display = 'block';
            voiceStatus.innerHTML = '<i class="fas fa-microphone-alt"></i> **LISTENING:** Say "Start", "Stop", "Reset", "Lap", "Export", or "Next Video"';
            voiceStatus.style.color = '#43c6ac';
        }
    };

    voiceRecognition.onresult = function(event) {
        const last = event.results.length - 1;
        const rawCommand = event.results[last][0].transcript.trim();
        const command = rawCommand.toLowerCase();
        
        if (voiceStatus) {
            voiceStatus.innerHTML = `<i class="fas fa-bullhorn"></i> **COMMAND:** "${rawCommand}"`;
            voiceStatus.style.color = '#ffd166';
        }

        // Enhanced command recognition with more variations
        if (command.includes('start') || command.includes('go') || command.includes('begin')) {
            if (!timer) {
                start();
                showVoiceStatus('▶️ **STARTED** Stopwatch', '#00ff00');
            }
        } else if (command.includes('stop') || command.includes('pause') || command.includes('halt')) {
            if (timer) {
                start(); // This toggles to pause
                showVoiceStatus('⏸️ **PAUSED** Stopwatch', '#ffd166');
            }
        } else if (command.includes('reset') || command.includes('clear all') || command.includes('restart')) {
            reset();
            showVoiceStatus('🔄 **RESET** Stopwatch', '#ff6b35');
        } else if (command.includes('lap') || command.includes('split') || command.includes('record')) {
            if (timer) {
                lap();
                showVoiceStatus('🏁 **LAP** Recorded', '#00ff00');
            } else {
                showVoiceStatus('⚠️ Start stopwatch first', '#ff6b35');
            }
        } else if (command.includes('clear lap') || command.includes('delete lap')) {
            clearLap();
            showVoiceStatus('🗑️ **CLEARED** All laps', '#ff6b35');
        } else if (command.includes('export') || command.includes('download') || command.includes('save lap')) {
            exportLaps();
            showVoiceStatus('📁 **EXPORTING** Lap times', '#43c6ac');
        } else if (command.includes('next video') || command.includes('change video') || command.includes('switch video')) {
            if (window.videoManager) {
                window.videoManager.nextVideo();
                showVoiceStatus('🎬 **SWITCHED** to next video', '#667eea');
            }
        } else if (command.includes('previous video') || command.includes('last video')) {
            if (window.videoManager) {
                window.videoManager.previousVideo();
                showVoiceStatus('🎬 **SWITCHED** to previous video', '#667eea');
            }
        } else if (command.includes('video one') || command.includes('first video')) {
            if (window.videoManager) {
                window.videoManager.setVideo(0);
                showVoiceStatus('🎬 **SWITCHED** to video 1', '#667eea');
            }
        } else if (command.includes('video two') || command.includes('second video')) {
            if (window.videoManager) {
                window.videoManager.setVideo(1);
                showVoiceStatus('🎬 **SWITCHED** to video 2', '#667eea');
            }
        } else if (command.includes('video three') || command.includes('third video')) {
            if (window.videoManager) {
                window.videoManager.setVideo(2);
                showVoiceStatus('🎬 **SWITCHED** to video 3', '#667eea');
            }
        } else if (command.includes('video four') || command.includes('fourth video')) {
            if (window.videoManager) {
                window.videoManager.setVideo(3);
                showVoiceStatus('🎬 **SWITCHED** to video 4', '#667eea');
            }
        } else if (command.includes('random video') || command.includes('shuffle video')) {
            if (window.videoManager) {
                window.videoManager.switchToRandomVideo();
                showVoiceStatus('🎲 **RANDOM** video selected', '#667eea');
            }
        } else if (command.includes('dark mode') || command.includes('night mode')) {
            toggleDarkMode();
            showVoiceStatus('🌙 **TOGGLED** Dark mode', '#43c6ac');
        } else if (command.includes('light mode') || command.includes('day mode')) {
            toggleLightMode();
            showVoiceStatus('☀️ **TOGGLED** Light mode', '#43c6ac');
        } else {
            showVoiceStatus('🤷 Try: "Start", "Stop", "Reset", "Lap", or "Clear"', '#ff6b35');
        }
    };

    voiceRecognition.onerror = function(event) {
        console.log('Voice recognition error:', event.error);
        if (voiceStatus) {
            voiceStatus.innerHTML = `⚠️ **ERROR:** ${event.error}. Click voice button to restart.`;
            voiceStatus.style.color = '#ff6b35';
        }
        isVoiceEnabled = false;
        updateVoiceButton();
    };

    voiceRecognition.onend = function() {
        if (isVoiceEnabled && mode === 'stopwatch') {
            // Auto-restart if voice is enabled
            setTimeout(() => {
                if (isVoiceEnabled) {
                    voiceRecognition.start();
                }
            }, 1000);
        }
    };
}

function toggleVoiceControl() {
    if (!voiceRecognition) return;
    
    isVoiceEnabled = !isVoiceEnabled;
    
    if (isVoiceEnabled) {
        voiceRecognition.start();
        showVoiceStatus('🎤 **VOICE ACTIVATED** - Say commands now!', '#43c6ac');
    } else {
        voiceRecognition.stop();
        showVoiceStatus('🔇 **VOICE DISABLED**', '#666');
    }
    
    updateVoiceButton();
    // Save preference
    localStorage.setItem('voiceEnabled', isVoiceEnabled);
}

function updateVoiceButton() {
    const voiceToggleBtn = $id('voice-toggle');
    if (voiceToggleBtn) {
        voiceToggleBtn.innerHTML = isVoiceEnabled ? 
            '<i class="fas fa-microphone"></i> Voice ON' : 
            '<i class="fas fa-microphone-slash"></i> Voice OFF';
        voiceToggleBtn.style.background = isVoiceEnabled ? 
            'linear-gradient(135deg, #43c6ac, #191654)' : 
            'rgba(255, 255, 255, 0.1)';
    }
}

function showVoiceStatus(message, color) {
    const voiceStatus = $id('voice-command-status');
    if (voiceStatus) {
        voiceStatus.innerHTML = message;
        voiceStatus.style.color = color;
        voiceStatus.style.display = 'block';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (isVoiceEnabled) {
                voiceStatus.innerHTML = '<i class="fas fa-microphone-alt"></i> **LISTENING** for commands...';
                voiceStatus.style.color = '#43c6ac';
            }
        }, 3000);
    }
}

function toggleDarkMode() {
    const checkbox = document.getElementById("light");
    if (checkbox && !document.body.classList.contains('dark-mode')) {
        checkbox.checked = true;
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', true);
    }
}

function toggleLightMode() {
    const checkbox = document.getElementById("light");
    if (checkbox && document.body.classList.contains('dark-mode')) {
        checkbox.checked = false;
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', false);
    }
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


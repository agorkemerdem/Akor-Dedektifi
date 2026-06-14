const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const flatNoteNames = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const naturalRoots = ["C", "D", "E", "F", "G", "A", "B"];
const pianoSampleNotes = ["C3", "Ds3", "Fs3", "A3", "C4", "Ds4", "Fs4", "A4", "C5"];
const pianoSampleBaseUrl = "https://nbrosowsky.github.io/tonejs-instruments/samples/piano/";

const chordTypes = {
  major: {
    label: "Majör",
    formula: "1 - 3 - 5",
    intervals: [0, 4, 7],
    description: "Majör akor parlak ve kararlı duyulur. Kök ses, büyük üçlü ve tam beşliden oluşur."
  },
  minor: {
    label: "Minör",
    formula: "1 - b3 - 5",
    intervals: [0, 3, 7],
    description: "Minör akor daha koyu ve duygusal bir karakter taşır. Büyük üçlü yerine küçük üçlü kullanır."
  },
  sus2: {
    label: "Sus2",
    formula: "1 - 2 - 5",
    intervals: [0, 2, 7],
    description: "Sus2 akorda üçüncü derece çıkar, yerine ikinci derece gelir. Bu yüzden açık ve askıda bir his verir."
  },
  sus4: {
    label: "Sus4",
    formula: "1 - 4 - 5",
    intervals: [0, 5, 7],
    description: "Sus4 akorda üçüncü derece yerine dördüncü derece vardır. Çözülme beklentisi güçlüdür."
  },
  dom7: {
    label: "Dominant7",
    formula: "1 - 3 - 5 - b7",
    intervals: [0, 4, 7, 10],
    description: "Dominant7 akor majör üçlü ile küçük yediliyi birleştirir. Blues ve cazda güçlü gerilim yaratır."
  },
  maj7: {
    label: "Maj7",
    formula: "1 - 3 - 5 - 7",
    intervals: [0, 4, 7, 11],
    description: "Maj7 akor majör akora büyük yedili ekler. Yumuşak, geniş ve modern bir renge sahiptir."
  },
  min7: {
    label: "Min7",
    formula: "1 - b3 - 5 - b7",
    intervals: [0, 3, 7, 10],
    description: "Min7 akor minör üçlü ve küçük yediliden oluşur. Caz, funk ve popta sık kullanılır."
  }
};

const difficultyMap = {
  easy: ["major", "minor"],
  medium: ["major", "minor", "sus2", "sus4"],
  hard: ["major", "minor", "sus2", "sus4", "dom7", "maj7", "min7"]
};

const guitarStrings = [
  { label: "e", open: "E", octave: 4 },
  { label: "B", open: "B", octave: 3 },
  { label: "G", open: "G", octave: 3 },
  { label: "D", open: "D", octave: 3 },
  { label: "A", open: "A", octave: 2 },
  { label: "E", open: "E", octave: 2 }
];

const screens = document.querySelectorAll(".screen");
const navButtons = document.querySelectorAll("[data-screen]");
const difficultySelect = document.getElementById("difficulty-select");
const newQuestionButton = document.getElementById("new-question");
const replayQuestionButton = document.getElementById("replay-question");
const answerOptions = document.getElementById("answer-options");
const feedback = document.getElementById("feedback");
const resultPanel = document.getElementById("result-panel");
const resultTitle = document.getElementById("result-title");
const resultDescription = document.getElementById("result-description");
const resultFormula = document.getElementById("result-formula");
const resultNotes = document.getElementById("result-notes");
const resultPosition = document.getElementById("result-position");
const resultInversions = document.getElementById("result-inversions");
const gamePiano = document.getElementById("game-piano");
const gameGuitar = document.getElementById("game-guitar");
const playResultChordButton = document.getElementById("play-result-chord");
const learnRoot = document.getElementById("learn-root");
const learnType = document.getElementById("learn-type");
const playLearnChordButton = document.getElementById("play-learn-chord");
const learnTitleDetail = document.getElementById("learn-title-detail");
const learnDescription = document.getElementById("learn-description");
const learnFormula = document.getElementById("learn-formula");
const learnNotes = document.getElementById("learn-notes");
const learnPosition = document.getElementById("learn-position");
const learnInversions = document.getElementById("learn-inversions");
const learnPiano = document.getElementById("learn-piano");
const learnGuitar = document.getElementById("learn-guitar");
const scoreOutput = document.getElementById("score");
const highScoreOutput = document.getElementById("high-score");
const accuracyOutput = document.getElementById("accuracy");
const statsScore = document.getElementById("stats-score");
const statsHighScore = document.getElementById("stats-high-score");
const statsAnswered = document.getElementById("stats-answered");
const statsCorrect = document.getElementById("stats-correct");

let audioContext;
let currentQuestion = null;
let score = 0;
let answered = 0;
let correct = 0;
let highScore = Number(localStorage.getItem("akorDedektifiHighScore") || 0);
let pianoReverb;
let pianoSamplesPromise;
const pianoSamples = new Map();

// Web Audio API nesnesi kullanıcı etkileşiminden sonra oluşturulur.
function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function noteIndex(note) {
  return noteNames.indexOf(note);
}

function midiToNoteName(midi) {
  return noteNames[midi % 12];
}

function midiToOctave(midi) {
  return Math.floor(midi / 12) - 1;
}

function noteToMidi(note, octave = 4) {
  return 12 * (octave + 1) + noteIndex(note);
}

function transpose(note, semitone) {
  return noteNames[(noteIndex(note) + semitone + 120) % 12];
}

// Akoru daima kök pozisyonda kurar; her aralık kök sesin üstüne eklenir.
function getChordMidiNotes(root, typeKey, octave = 4) {
  const rootMidi = noteToMidi(root, octave);
  return chordTypes[typeKey].intervals.map((interval) => rootMidi + interval);
}

function getChordNotes(root, typeKey) {
  return getChordMidiNotes(root, typeKey).map(midiToNoteName);
}

function getChordDisplayNotes(root, typeKey) {
  return chordTypes[typeKey].intervals.map((interval) => {
    const notePosition = (noteIndex(root) + interval + 120) % 12;
    const shouldUseFlatName = chordTypes[typeKey].formula.includes("b") && [3, 10].includes(interval);
    return shouldUseFlatName ? flatNoteNames[notePosition] : noteNames[notePosition];
  });
}

function getInversionText(root, typeKey) {
  const notes = getChordDisplayNotes(root, typeKey);

  if (notes.length < 3) {
    return "";
  }

  const firstInversion = [...notes.slice(1), notes[0]].join(" - ");
  const secondInversion = [...notes.slice(2), ...notes.slice(0, 2)].join(" - ");
  const thirdInversion = notes.length === 4 ? ` | 3. çevrim: ${notes[3]} - ${notes[0]} - ${notes[1]} - ${notes[2]}` : "";
  return `Ana gösterim kök pozisyondur: ${notes.join(" - ")}. Örnek çevrimler: 1. çevrim: ${firstInversion} | 2. çevrim: ${secondInversion}${thirdInversion}`;
}

function getFrequency(note, octave = 4) {
  const midi = noteToMidi(note, octave);
  return 440 * 2 ** ((midi - 69) / 12);
}

function midiToFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function sampleNoteToMidi(sampleNote) {
  const match = sampleNote.match(/^([A-G](?:s)?)(\d)$/);
  const note = match[1].replace("s", "#");
  return noteToMidi(note, Number(match[2]));
}

// Ücretsiz acoustic grand piano sample'larını yükler. Yükleme olmazsa synth yedeği kullanılır.
async function loadPianoSamples() {
  if (pianoSamplesPromise) {
    return pianoSamplesPromise;
  }

  const context = getAudioContext();
  pianoSamplesPromise = Promise.all(
    pianoSampleNotes.map(async (sampleNote) => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${pianoSampleBaseUrl}${sampleNote}.mp3`, { signal: controller.signal });
      window.clearTimeout(timeoutId);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(arrayBuffer);
      pianoSamples.set(sampleNoteToMidi(sampleNote), audioBuffer);
    })
  ).catch(() => {
    pianoSamples.clear();
  });

  return pianoSamplesPromise;
}

function getNearestPianoSample(midi) {
  let bestMidi = null;
  let bestDistance = Infinity;

  pianoSamples.forEach((buffer, sampleMidi) => {
    const distance = Math.abs(sampleMidi - midi);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMidi = sampleMidi;
    }
  });

  return bestMidi === null ? null : { midi: bestMidi, buffer: pianoSamples.get(bestMidi) };
}

// Kısa bir oda yankısı oluşturur; grand piyano hissini daha doğal yapar.
function getPianoReverb(context) {
  if (pianoReverb) {
    return pianoReverb;
  }

  const length = context.sampleRate * 1.6;
  const impulse = context.createBuffer(2, length, context.sampleRate);

  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);

    for (let index = 0; index < length; index += 1) {
      const decay = (1 - index / length) ** 2.4;
      data[index] = (Math.random() * 2 - 1) * decay * 0.34;
    }
  }

  pianoReverb = context.createConvolver();
  pianoReverb.buffer = impulse;
  return pianoReverb;
}

// Çekiç sesini taklit eden çok kısa, filtrelenmiş gürültü katmanı üretir.
function addHammerAttack(context, destination, start, level) {
  const noiseBuffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.035), context.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  const noise = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  for (let index = 0; index < data.length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
  }

  filter.type = "bandpass";
  filter.frequency.setValueAtTime(2600, start);
  filter.Q.setValueAtTime(1.1, start);
  gain.gain.setValueAtTime(level * 0.28, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.045);

  noise.buffer = noiseBuffer;
  noise.connect(filter).connect(gain).connect(destination);
  noise.start(start);
  noise.stop(start + 0.05);
}

// Sample yüklenemediğinde devreye giren yedek piyano benzeri ses.
function playFallbackPianoTone(midi, delay = 0, duration = 1.45, level = 0.15) {
  const context = getAudioContext();
  const start = context.currentTime + delay;
  const baseFrequency = midiToFrequency(midi);
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const reverb = getPianoReverb(context);

  dryGain.gain.setValueAtTime(0.86, start);
  wetGain.gain.setValueAtTime(0.18, start);
  dryGain.connect(context.destination);
  dryGain.connect(reverb);
  reverb.connect(wetGain).connect(context.destination);
  addHammerAttack(context, dryGain, start, level);

  [
    { ratio: 1, gain: 1, detune: -3, type: "triangle", decay: duration },
    { ratio: 1, gain: 0.78, detune: 4, type: "sine", decay: duration * 0.92 },
    { ratio: 2, gain: 0.31, detune: 1, type: "sine", decay: duration * 0.55 },
    { ratio: 3, gain: 0.14, detune: -2, type: "sine", decay: duration * 0.32 },
    { ratio: 4, gain: 0.08, detune: 0, type: "triangle", decay: duration * 0.22 }
  ].forEach((partial) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const partialLevel = level * partial.gain;

    oscillator.type = partial.type;
    oscillator.frequency.setValueAtTime(baseFrequency * partial.ratio, start);
    oscillator.detune.setValueAtTime(partial.detune, start);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(3600 - partial.ratio * 360, start);
    filter.frequency.exponentialRampToValueAtTime(900, start + partial.decay);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(partialLevel, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(partialLevel * 0.42, start + 0.16);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + partial.decay);

    oscillator.connect(filter).connect(gain).connect(dryGain);
    oscillator.start(start);
    oscillator.stop(start + partial.decay + 0.08);
  });
}

// Öncelik gerçek piano sample'ındadır; sample yoksa yedek sentez kullanılır.
async function playTone(note, octave = 4, delay = 0, duration = 1.45, level = 0.15) {
  const midi = noteToMidi(note, octave);
  const context = getAudioContext();

  if (pianoSamples.size === 0) {
    await loadPianoSamples();
  }

  const sample = getNearestPianoSample(midi);

  if (!sample) {
    playFallbackPianoTone(midi, delay, duration, level);
    return;
  }

  const start = context.currentTime + delay;
  const source = context.createBufferSource();
  const gain = context.createGain();
  const reverbGain = context.createGain();
  const reverb = getPianoReverb(context);

  source.buffer = sample.buffer;
  source.playbackRate.setValueAtTime(2 ** ((midi - sample.midi) / 12), start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(level * 1.5, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  reverbGain.gain.setValueAtTime(0.12, start);

  source.connect(gain).connect(context.destination);
  gain.connect(reverb).connect(reverbGain).connect(context.destination);
  source.start(start);
  source.stop(start + duration + 0.08);
}

// Akorun tüm notalarını aynı anda seslendirir.
async function playChord(root, typeKey) {
  await loadPianoSamples();
  getChordMidiNotes(root, typeKey).forEach((midi, index) => {
    playTone(midiToNoteName(midi), midiToOctave(midi), index * 0.012, 2.1, index === 0 ? 0.18 : 0.14);
  });
}

function showScreen(screenId) {
  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.id === screenId);
  });
  updateStats();
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function updateScores() {
  const accuracy = answered === 0 ? 0 : Math.round((correct / answered) * 100);
  scoreOutput.textContent = score;
  highScoreOutput.textContent = highScore;
  accuracyOutput.textContent = `${accuracy}%`;
  statsScore.textContent = score;
  statsHighScore.textContent = highScore;
  statsAnswered.textContent = answered;
  statsCorrect.textContent = correct;
}

function updateStats() {
  updateScores();
}

function populateStaticControls() {
  answerOptions.innerHTML = Object.entries(chordTypes)
    .map(([key, chord]) => `<button class="answer-button" data-type="${key}">${chord.label}</button>`)
    .join("");

  learnRoot.innerHTML = naturalRoots
    .map((root) => `<option value="${root}">${root}</option>`)
    .join("");

  learnType.innerHTML = Object.entries(chordTypes)
    .map(([key, chord]) => `<option value="${key}">${chord.label}</option>`)
    .join("");
}

// Yeni soru üretir; kullanıcı sadece türü görür, kök nota gizli tutulur.
function startQuestion() {
  const availableTypes = difficultyMap[difficultySelect.value];
  currentQuestion = {
    root: randomItem(naturalRoots),
    type: randomItem(availableTypes)
  };

  answerOptions.querySelectorAll(".answer-button").forEach((button) => {
    button.disabled = false;
    button.classList.remove("correct", "wrong");
  });

  resultPanel.classList.add("hidden");
  feedback.textContent = "Akor çalındı. Sadece akor türünü tahmin edin.";
  replayQuestionButton.disabled = false;
  playChord(currentQuestion.root, currentQuestion.type);
}

// Cevabı değerlendirir, skoru günceller ve teori/görsel açıklamaları gösterir.
function answerQuestion(selectedType) {
  if (!currentQuestion) {
    feedback.textContent = "Önce Yeni Soru düğmesine basın.";
    return;
  }

  const isCorrect = selectedType === currentQuestion.type;
  const correctChord = chordTypes[currentQuestion.type];

  answerOptions.querySelectorAll(".answer-button").forEach((button) => {
    button.disabled = true;
    button.classList.toggle("correct", button.dataset.type === currentQuestion.type);
    button.classList.toggle("wrong", button.dataset.type === selectedType && !isCorrect);
  });

  answered += 1;

  if (isCorrect) {
    score += 10;
    correct += 1;
    feedback.textContent = `Tebrikler! Doğru cevap: ${correctChord.label}. +10 puan.`;
  } else {
    feedback.textContent = `Yanlış cevap. Doğru cevap: ${correctChord.label}. ${correctChord.description}`;
  }

  highScore = Math.max(highScore, score);
  localStorage.setItem("akorDedektifiHighScore", highScore);
  showChordResult(currentQuestion.root, currentQuestion.type, "game");
  updateScores();
}

function getGuitarVoicing(root, typeKey) {
  const chordNotes = getChordNotes(root, typeKey);
  const rootStringIndex = guitarStrings.findIndex((string) => {
    for (let fret = 0; fret <= 4; fret += 1) {
      if (transpose(string.open, fret) === root) {
        return true;
      }
    }
    return false;
  });

  return guitarStrings.map((string, stringIndex) => {
    let chosenFret = null;

    for (let fret = 0; fret <= 4; fret += 1) {
      const note = transpose(string.open, fret);
      if (chordNotes.includes(note)) {
        chosenFret = fret;
        break;
      }
    }

    const shouldMute = chosenFret === null || (rootStringIndex !== -1 && stringIndex > rootStringIndex + 1);
    return {
      ...string,
      fret: shouldMute ? "x" : chosenFret,
      note: chosenFret === null ? null : transpose(string.open, chosenFret)
    };
  });
}

function getPositionName(voicing) {
  const frets = voicing
    .filter((item) => typeof item.fret === "number" && item.fret > 0)
    .map((item) => item.fret);
  const lowest = frets.length ? Math.min(...frets) : 0;
  return lowest <= 1 ? "Açık pozisyon" : `${lowest}. perde yakın pozisyon`;
}

function showChordResult(root, typeKey, target) {
  const chord = chordTypes[typeKey];
  const chordNotes = getChordDisplayNotes(root, typeKey);
  const voicing = getGuitarVoicing(root, typeKey);
  const positionName = getPositionName(voicing);

  if (target === "game") {
    resultTitle.textContent = `Akor Türü: ${chord.label}`;
    resultDescription.textContent = chord.description;
    resultFormula.textContent = chord.formula;
    resultNotes.textContent = chordNotes.join(" - ");
    resultPosition.textContent = positionName;
    resultInversions.textContent = getInversionText(root, typeKey);
    renderPiano(gamePiano, root, typeKey);
    renderGuitar(gameGuitar, root, typeKey);
    resultPanel.classList.remove("hidden");
  } else {
    learnTitleDetail.textContent = chord.label;
    learnDescription.textContent = chord.description;
    learnFormula.textContent = chord.formula;
    learnNotes.textContent = chordNotes.join(" - ");
    learnPosition.textContent = positionName;
    learnInversions.textContent = getInversionText(root, typeKey);
    renderPiano(learnPiano, root, typeKey);
    renderGuitar(learnGuitar, root, typeKey);
  }
}

// Piyano SVG'sini çizer ve akor notalarını renklendirir.
function renderPiano(container, root, typeKey) {
  const activeMidis = new Set(getChordMidiNotes(root, typeKey));
  const whiteNotes = [
    { note: "C", octave: 4 },
    { note: "D", octave: 4 },
    { note: "E", octave: 4 },
    { note: "F", octave: 4 },
    { note: "G", octave: 4 },
    { note: "A", octave: 4 },
    { note: "B", octave: 4 },
    { note: "C", octave: 5 },
    { note: "D", octave: 5 },
    { note: "E", octave: 5 },
    { note: "F", octave: 5 },
    { note: "G", octave: 5 },
    { note: "A", octave: 5 },
    { note: "B", octave: 5 }
  ];
  const blackKeys = [
    { note: "C#", octave: 4, x: 44 },
    { note: "D#", octave: 4, x: 110 },
    { note: "F#", octave: 4, x: 242 },
    { note: "G#", octave: 4, x: 308 },
    { note: "A#", octave: 4, x: 374 },
    { note: "C#", octave: 5, x: 506 },
    { note: "D#", octave: 5, x: 572 },
    { note: "F#", octave: 5, x: 704 },
    { note: "G#", octave: 5, x: 770 },
    { note: "A#", octave: 5, x: 836 }
  ];
  const whiteWidth = 66;
  let svg = `<svg class="piano-svg" viewBox="0 0 924 180" role="img" aria-label="Piyano akor gösterimi">`;

  whiteNotes.forEach((key, index) => {
    const midi = noteToMidi(key.note, key.octave);
    const active = activeMidis.has(midi);
    svg += `<rect class="piano-key" data-note="${key.note}" data-octave="${key.octave}" x="${index * whiteWidth}" y="0" width="${whiteWidth}" height="180" rx="7" fill="${active ? "#45e0b8" : "#f8fafc"}" stroke="#cbd5e1"></rect>`;
    svg += `<text x="${index * whiteWidth + 33}" y="162" text-anchor="middle" fill="#101827" font-size="14" font-weight="800">${key.note}${key.octave}</text>`;
  });

  blackKeys.forEach((key) => {
    const midi = noteToMidi(key.note, key.octave);
    const active = activeMidis.has(midi);
    svg += `<rect class="piano-key" data-note="${key.note}" data-octave="${key.octave}" x="${key.x}" y="0" width="44" height="112" rx="6" fill="${active ? "#ffbd59" : "#111827"}" stroke="#06080d"></rect>`;
    svg += `<text x="${key.x + 22}" y="92" text-anchor="middle" fill="${active ? "#101827" : "#f8fafc"}" font-size="12" font-weight="800">${key.note}${key.octave}</text>`;
  });

  svg += "</svg>";
  container.innerHTML = svg;
}

// Gitar klavyesini SVG ile çizer; açık teller, susturulan teller ve basılacak perdeler gösterilir.
function renderGuitar(container, root, typeKey) {
  const voicing = getGuitarVoicing(root, typeKey);
  const width = 500;
  const height = 230;
  const left = 74;
  const top = 42;
  const fretGap = 78;
  const stringGap = 26;
  let svg = `<svg class="guitar-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Gitar akor diyagramı">`;

  svg += `<text x="${width / 2}" y="22" text-anchor="middle" fill="#ffbd59" font-size="16" font-weight="900">${getPositionName(voicing)}</text>`;

  for (let fret = 0; fret <= 5; fret += 1) {
    const x = left + fret * fretGap;
    svg += `<line x1="${x}" y1="${top}" x2="${x}" y2="${top + stringGap * 5}" stroke="${fret === 0 ? "#f8fafc" : "rgba(255,255,255,0.34)"}" stroke-width="${fret === 0 ? 7 : 3}"></line>`;
    if (fret > 0) {
      svg += `<text x="${x - fretGap / 2}" y="${height - 18}" text-anchor="middle" fill="#9aa7bd" font-size="12">${fret}</text>`;
    }
  }

  guitarStrings.forEach((string, index) => {
    const y = top + index * stringGap;
    const mark = voicing[index];
    svg += `<line x1="${left}" y1="${y}" x2="${left + fretGap * 5}" y2="${y}" stroke="rgba(255,255,255,0.35)" stroke-width="${2 + (5 - index) * 0.26}"></line>`;
    svg += `<text x="30" y="${y + 5}" text-anchor="middle" fill="#9aa7bd" font-size="13" font-weight="800">${string.label}</text>`;

    if (mark.fret === "x") {
      svg += `<text x="${left - 28}" y="${y + 6}" text-anchor="middle" fill="#ff6b6b" font-size="18" font-weight="900">x</text>`;
    } else if (mark.fret === 0) {
      svg += `<text x="${left - 28}" y="${y + 6}" text-anchor="middle" fill="#45e0b8" font-size="18" font-weight="900">o</text>`;
    } else {
      const x = left + mark.fret * fretGap - fretGap / 2;
      svg += `<circle cx="${x}" cy="${y}" r="11" fill="#45e0b8"></circle>`;
      svg += `<text x="${x}" y="${y + 4}" text-anchor="middle" fill="#04120e" font-size="11" font-weight="900">${mark.note}</text>`;
    }
  });

  svg += "</svg>";
  container.innerHTML = svg;
}

function updateLearningMode() {
  showChordResult(learnRoot.value, learnType.value, "learn");
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.screen));
});

newQuestionButton.addEventListener("click", startQuestion);
replayQuestionButton.addEventListener("click", () => {
  if (currentQuestion) {
    playChord(currentQuestion.root, currentQuestion.type);
  }
});

answerOptions.addEventListener("click", (event) => {
  const button = event.target.closest(".answer-button");
  if (button) {
    answerQuestion(button.dataset.type);
  }
});

playResultChordButton.addEventListener("click", () => {
  if (currentQuestion) {
    playChord(currentQuestion.root, currentQuestion.type);
  }
});

playLearnChordButton.addEventListener("click", () => {
  playChord(learnRoot.value, learnType.value);
});

learnRoot.addEventListener("change", updateLearningMode);
learnType.addEventListener("change", updateLearningMode);

document.addEventListener("click", (event) => {
  const key = event.target.closest(".piano-key");
  if (key) {
    playTone(key.dataset.note, Number(key.dataset.octave || 4), 0, 0.55, 0.18);
  }
});

populateStaticControls();
updateLearningMode();
updateScores();

const modeNames = [
  "Self Driving",
  "Carpooling",
  "E-Hailing",
  "Public Transportation",
];

const attributeNames = [
  "Cost",
  "Journey Comfort",
  "Food Availability",
  "Driving Experience",
];

const STORAGE_KEY = "transport-mode-choice-state";

const state = {
  respondentCount: 0,
  currentRespondentIndex: 0,
  respondents: [],
  currentDraft: createEmptyDraft(),
};

const setupForm = document.getElementById("setup-form");
const surveyForm = document.getElementById("survey-form");
const restartButton = document.getElementById("restart-button");

const setupPanel = document.getElementById("setup-panel");
const surveyPanel = document.getElementById("survey-panel");
const resultsPanel = document.getElementById("results-panel");

const surveyTitle = document.getElementById("survey-title");
const progressText = document.getElementById("progress-text");
const progressFill = document.getElementById("progress-fill");
const ratingsTableWrap = document.getElementById("ratings-table-wrap");
const rankingsWrap = document.getElementById("rankings-wrap");
const formMessage = document.getElementById("form-message");
const surveySubmit = document.getElementById("survey-submit");

const weightCards = document.getElementById("weight-cards");
const probabilityBars = document.getElementById("probability-bars");
const averageScoresTable = document.getElementById("average-scores-table");
const utilityCards = document.getElementById("utility-cards");

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const respondentCountInput = document.getElementById("respondent-count");
  const respondentCount = Number.parseInt(respondentCountInput.value, 10);

  if (!Number.isInteger(respondentCount) || respondentCount < 1) {
    respondentCountInput.focus();
    return;
  }

  state.respondentCount = respondentCount;
  state.currentRespondentIndex = 0;
  state.respondents = [];
  state.currentDraft = createEmptyDraft();
  persistState();

  setupPanel.classList.add("hidden");
  resultsPanel.classList.add("hidden");
  surveyPanel.classList.remove("hidden");

  renderSurveyForm();
});

surveyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  formMessage.textContent = "";

  const ratings = readRatingsFromForm();
  if (!ratings) {
    formMessage.textContent = "Complete every transport method rating before continuing.";
    return;
  }

  const rankings = readRankingsFromForm();
  if (!rankings) {
    formMessage.textContent = "Choose a ranking for every attribute before continuing.";
    return;
  }

  if (new Set(rankings).size !== attributeNames.length) {
    formMessage.textContent = "Each attribute rank must be unique. Use 1, 2, 3, and 4 once each.";
    return;
  }

  state.respondents.push({ ratings, rankings });
  state.currentRespondentIndex += 1;
  state.currentDraft = createEmptyDraft();
  persistState();

  if (state.currentRespondentIndex < state.respondentCount) {
    renderSurveyForm();
    return;
  }

  renderResults();
});

surveyForm.addEventListener("change", handleSurveyFieldChange);

restartButton.addEventListener("click", () => {
  resetState();
  clearPersistedState();

  resultsPanel.classList.add("hidden");
  surveyPanel.classList.add("hidden");
  setupPanel.classList.remove("hidden");
  setupForm.reset();
  document.getElementById("respondent-count").value = "1";
});

function renderSurveyForm() {
  const respondentNumber = state.currentRespondentIndex + 1;
  surveyTitle.textContent = `Respondent ${respondentNumber}`;
  progressText.textContent = `${respondentNumber} / ${state.respondentCount}`;
  progressFill.style.width = `${(respondentNumber / state.respondentCount) * 100}%`;
  surveySubmit.textContent =
    respondentNumber === state.respondentCount ? "Calculate Results" : "Save and Continue";
  formMessage.textContent = "";

  ratingsTableWrap.innerHTML = buildRatingsTable();
  rankingsWrap.innerHTML = buildRankingsForm();
  syncRankingSelectStates();
}

function buildRatingsTable() {
  const headerCells = attributeNames
    .map((attribute) => `<th scope="col">${attribute}</th>`)
    .join("");

  const rows = modeNames
    .map((mode, modeIndex) => {
      const selects = attributeNames
        .map((attribute, attributeIndex) => {
          const inputName = `rating-${modeIndex}-${attributeIndex}`;
          const selectedValue = state.currentDraft.ratings[modeIndex][attributeIndex];
          return `
            <td>
              <label class="sr-only" for="${inputName}">${mode} - ${attribute}</label>
              ${buildSelect(inputName, 1, 5, selectedValue)}
            </td>
          `;
        })
        .join("");

      return `
        <tr>
          <th scope="row">${mode}</th>
          ${selects}
        </tr>
      `;
    })
    .join("");

  return `
    <table>
      <thead>
        <tr>
          <th scope="col">Transport Method</th>
          ${headerCells}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildRankingsForm() {
  return attributeNames
    .map((attribute, attributeIndex) => {
      const inputName = `ranking-${attributeIndex}`;
      return `
        <article class="ranking-card">
          <label for="${inputName}">
            <span>${attribute}</span>
            ${buildRankingSelect(inputName, attributeIndex)}
          </label>
        </article>
      `;
    })
    .join("");
}

function buildSelect(id, min, max, selectedValue = "") {
  const options = ['<option value="">Select</option>'];

  for (let value = min; value <= max; value += 1) {
    const selectedAttribute = String(selectedValue) === String(value) ? " selected" : "";
    options.push(`<option value="${value}"${selectedAttribute}>${value}</option>`);
  }

  return `<select id="${id}" name="${id}">${options.join("")}</select>`;
}

function buildRankingSelect(id, attributeIndex) {
  const selectedValue = state.currentDraft.rankings[attributeIndex];
  const usedRankings = new Set(
    state.currentDraft.rankings
      .filter((value, index) => index !== attributeIndex && value !== "")
      .map((value) => String(value))
  );

  const options = ['<option value="">Select</option>'];

  for (let value = 1; value <= attributeNames.length; value += 1) {
    const valueText = String(value);
    const selectedAttribute = String(selectedValue) === valueText ? " selected" : "";
    const disabledAttribute =
      selectedAttribute === "" && usedRankings.has(valueText) ? " disabled" : "";

    options.push(
      `<option value="${valueText}"${selectedAttribute}${disabledAttribute}>${valueText}</option>`
    );
  }

  return `<select id="${id}" name="${id}">${options.join("")}</select>`;
}

function readRatingsFromForm() {
  const ratings = [];

  for (let modeIndex = 0; modeIndex < modeNames.length; modeIndex += 1) {
    const row = [];

    for (let attributeIndex = 0; attributeIndex < attributeNames.length; attributeIndex += 1) {
      const select = document.getElementById(`rating-${modeIndex}-${attributeIndex}`);
      const value = Number.parseInt(select.value, 10);

      if (!Number.isInteger(value)) {
        return null;
      }

      row.push(value);
    }

    ratings.push(row);
  }

  return ratings;
}

function readRankingsFromForm() {
  const rankings = [];

  for (let attributeIndex = 0; attributeIndex < attributeNames.length; attributeIndex += 1) {
    const select = document.getElementById(`ranking-${attributeIndex}`);
    const value = Number.parseInt(select.value, 10);

    if (!Number.isInteger(value)) {
      return null;
    }

    rankings.push(value);
  }

  return rankings;
}

function renderResults() {
  if (state.respondents.length === 0) {
    formMessage.textContent = "Add at least one completed respondent before calculating results.";
    surveyPanel.classList.remove("hidden");
    resultsPanel.classList.add("hidden");
    return;
  }

  const aggregatedPreferenceScores = attributeNames.map((_, attributeIndex) =>
    state.respondents.reduce(
      (total, respondent) => total + respondent.rankings[attributeIndex],
      0
    )
  );

  const averagePreferenceScores = aggregatedPreferenceScores.map(
    (total) => total / state.respondents.length
  );

  const weights = normalizeScaleToZeroOne(
    averagePreferenceScores,
    attributeNames.length
  );

  const averageScores = modeNames.map((_, modeIndex) =>
    attributeNames.map((_, attributeIndex) => {
      const total = state.respondents.reduce(
        (sum, respondent) => sum + respondent.ratings[modeIndex][attributeIndex],
        0
      );

      return total / state.respondents.length;
    })
  );

  const utilities = averageScores.map((scores) =>
    -weights[0] * scores[0] +
    weights[1] * scores[1] +
    weights[2] * scores[2] +
    weights[3] * scores[3]
  );

  const probabilities = computeSoftmax(utilities);

  weightCards.innerHTML = attributeNames
    .map((attribute, index) => {
      const direction = index === 0 ? "Penalty" : "Benefit";
      return `
        <article class="metric-card">
          <p class="metric-label">${attribute}</p>
          <p class="metric-value">${weights[index].toFixed(3)}</p>
          <p class="metric-subcopy">
            Total rank ${aggregatedPreferenceScores[index].toFixed(0)} |
            Average ${averagePreferenceScores[index].toFixed(2)} |
            ${direction}
          </p>
        </article>
      `;
    })
    .join("");

  probabilityBars.innerHTML = modeNames
    .map((mode, index) => `
      <article class="bar-item">
        <div class="bar-row">
          <span>${mode}</span>
          <span>${(probabilities[index] * 100).toFixed(2)}%</span>
        </div>
        <div class="bar-track" aria-hidden="true">
          <div class="bar-fill" style="width: ${(probabilities[index] * 100).toFixed(2)}%"></div>
        </div>
      </article>
    `)
    .join("");

  averageScoresTable.innerHTML = buildAverageScoresTable(averageScores);

  utilityCards.innerHTML = modeNames
    .map((mode, index) => `
      <article class="metric-card">
        <p class="metric-label">${mode}</p>
        <p class="metric-value">${utilities[index].toFixed(3)}</p>
        <p class="metric-subcopy">Utility from aggregated dynamic weights and average ratings.</p>
      </article>
    `)
    .join("");

  surveyPanel.classList.add("hidden");
  resultsPanel.classList.remove("hidden");
  persistState();
  resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function buildAverageScoresTable(averageScores) {
  const headerCells = attributeNames
    .map((attribute) => `<th scope="col">${attribute}</th>`)
    .join("");

  const rows = averageScores
    .map((scores, modeIndex) => {
      const cells = scores
        .map((score) => `<td>${score.toFixed(2)}</td>`)
        .join("");

      return `
        <tr>
          <th scope="row">${modeNames[modeIndex]}</th>
          ${cells}
        </tr>
      `;
    })
    .join("");

  return `
    <table>
      <thead>
        <tr>
          <th scope="col">Transport Method</th>
          ${headerCells}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function normalizeScaleToZeroOne(values, maxRank) {
  return values.map((value) => (value - 1) / (maxRank - 1));
}

function computeSoftmax(values) {
  const maxValue = Math.max(...values);
  const exponents = values.map((value) => Math.exp(value - maxValue));
  const denominator = exponents.reduce((sum, value) => sum + value, 0);
  return exponents.map((value) => value / denominator);
}

function createEmptyDraft() {
  return {
    ratings: modeNames.map(() => attributeNames.map(() => "")),
    rankings: attributeNames.map(() => ""),
  };
}

function resetState() {
  state.respondentCount = 0;
  state.currentRespondentIndex = 0;
  state.respondents = [];
  state.currentDraft = createEmptyDraft();
}

function handleSurveyFieldChange(event) {
  const { id, value } = event.target;

  if (!id) {
    return;
  }

  if (id.startsWith("rating-")) {
    const [, modeIndexText, attributeIndexText] = id.split("-");
    const modeIndex = Number.parseInt(modeIndexText, 10);
    const attributeIndex = Number.parseInt(attributeIndexText, 10);

    if (Number.isInteger(modeIndex) && Number.isInteger(attributeIndex)) {
      state.currentDraft.ratings[modeIndex][attributeIndex] = value;
      persistState();
    }

    return;
  }

  if (id.startsWith("ranking-")) {
    const [, attributeIndexText] = id.split("-");
    const attributeIndex = Number.parseInt(attributeIndexText, 10);

    if (Number.isInteger(attributeIndex)) {
      state.currentDraft.rankings[attributeIndex] = value;
      syncRankingSelectStates(attributeIndex);
      persistState();
    }
  }
}

function syncRankingSelectStates(changedAttributeIndex = null) {
  state.currentDraft.rankings = dedupeRankings(state.currentDraft.rankings, changedAttributeIndex);

  for (let attributeIndex = 0; attributeIndex < attributeNames.length; attributeIndex += 1) {
    const select = document.getElementById(`ranking-${attributeIndex}`);
    if (!select) {
      continue;
    }

    const currentValue = state.currentDraft.rankings[attributeIndex];
    const unavailableValues = new Set(
      state.currentDraft.rankings
        .filter((value, index) => index !== attributeIndex && value !== "")
        .map((value) => String(value))
    );

    Array.from(select.options).forEach((option) => {
      if (option.value === "") {
        option.disabled = false;
        return;
      }

      option.disabled = option.value !== currentValue && unavailableValues.has(option.value);
    });

    select.value = currentValue;
  }
}

function persistState() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Unable to persist survey state.", error);
  }
}

function clearPersistedState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Unable to clear persisted survey state.", error);
  }
}

function restorePersistedState() {
  try {
    const savedState = window.localStorage.getItem(STORAGE_KEY);
    if (!savedState) {
      return;
    }

    const parsedState = JSON.parse(savedState);
    if (!isValidPersistedState(parsedState)) {
      clearPersistedState();
      return;
    }

    state.respondentCount = parsedState.respondentCount;
    state.currentRespondentIndex = parsedState.currentRespondentIndex;
    state.respondents = parsedState.respondents;
    state.currentDraft = parsedState.currentDraft;
    state.currentDraft.rankings = dedupeRankings(state.currentDraft.rankings);

    document.getElementById("respondent-count").value = String(state.respondentCount);

    if (state.currentRespondentIndex >= state.respondentCount) {
      setupPanel.classList.add("hidden");
      surveyPanel.classList.add("hidden");
      resultsPanel.classList.remove("hidden");
      renderResults();
      return;
    }

    if (state.respondentCount > 0) {
      setupPanel.classList.add("hidden");
      resultsPanel.classList.add("hidden");
      surveyPanel.classList.remove("hidden");
      renderSurveyForm();
    }
  } catch (error) {
    console.warn("Unable to restore survey state.", error);
    clearPersistedState();
  }
}

function isValidPersistedState(candidate) {
  return (
    candidate &&
    Number.isInteger(candidate.respondentCount) &&
    candidate.respondentCount >= 0 &&
    Number.isInteger(candidate.currentRespondentIndex) &&
    candidate.currentRespondentIndex >= 0 &&
    candidate.currentRespondentIndex <= candidate.respondentCount &&
    Array.isArray(candidate.respondents) &&
    candidate.respondents.length === candidate.currentRespondentIndex &&
    candidate.respondents.every(isValidRespondent) &&
    isValidDraft(candidate.currentDraft)
  );
}

function isValidRespondent(candidate) {
  return (
    candidate &&
    Array.isArray(candidate.ratings) &&
    candidate.ratings.length === modeNames.length &&
    candidate.ratings.every(
      (row) =>
        Array.isArray(row) &&
        row.length === attributeNames.length &&
        row.every((value) => Number.isInteger(value) && value >= 1 && value <= 5)
    ) &&
    Array.isArray(candidate.rankings) &&
    candidate.rankings.length === attributeNames.length &&
    candidate.rankings.every(
      (value) => Number.isInteger(value) && value >= 1 && value <= attributeNames.length
    )
  );
}

function isValidDraft(candidate) {
  return (
    candidate &&
    Array.isArray(candidate.ratings) &&
    candidate.ratings.length === modeNames.length &&
    candidate.ratings.every(
      (row) =>
        Array.isArray(row) &&
        row.length === attributeNames.length &&
        row.every((value) => value === "" || isValidScoreValue(value, 5))
    ) &&
    Array.isArray(candidate.rankings) &&
    candidate.rankings.length === attributeNames.length &&
    candidate.rankings.every(
      (value) => value === "" || isValidScoreValue(value, attributeNames.length)
    )
  );
}

function isValidScoreValue(value, maxValue) {
  const numericValue = Number.parseInt(value, 10);
  return Number.isInteger(numericValue) && numericValue >= 1 && numericValue <= maxValue;
}

function dedupeRankings(rankings, preferredIndex = null) {
  const usedRankings = new Set();
  const normalizedRankings = rankings.map((value) => (value === "" ? "" : String(value)));

  if (preferredIndex !== null) {
    const preferredValue = normalizedRankings[preferredIndex];

    if (preferredValue !== "") {
      usedRankings.add(preferredValue);

      for (let index = 0; index < normalizedRankings.length; index += 1) {
        if (index !== preferredIndex && normalizedRankings[index] === preferredValue) {
          normalizedRankings[index] = "";
        }
      }
    }
  }

  return normalizedRankings.map((value, index) => {
    if (value === "") {
      return "";
    }

    if (preferredIndex !== null && index === preferredIndex) {
      return value;
    }

    if (usedRankings.has(value)) {
      return "";
    }

    usedRankings.add(value);
    return value;
  });
}

restorePersistedState();

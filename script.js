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

const state = {
  respondentCount: 0,
  currentRespondentIndex: 0,
  respondents: [],
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

  if (state.currentRespondentIndex < state.respondentCount) {
    renderSurveyForm();
    return;
  }

  renderResults();
});

restartButton.addEventListener("click", () => {
  state.respondentCount = 0;
  state.currentRespondentIndex = 0;
  state.respondents = [];

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
          return `
            <td>
              <label class="sr-only" for="${inputName}">${mode} - ${attribute}</label>
              ${buildSelect(inputName, 1, 5)}
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
            ${buildSelect(inputName, 1, attributeNames.length)}
          </label>
        </article>
      `;
    })
    .join("");
}

function buildSelect(id, min, max) {
  const options = ['<option value="">Select</option>'];

  for (let value = min; value <= max; value += 1) {
    options.push(`<option value="${value}">${value}</option>`);
  }

  return `<select id="${id}" name="${id}" required>${options.join("")}</select>`;
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

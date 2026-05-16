type Dice = {
  id: number;
  value: number;
  kept: boolean;
  selected: boolean;
};

const diceBoard = document.querySelector<HTMLDivElement>('#dice-board');
const statusEl = document.querySelector<HTMLDivElement>('#status');
const resultEl = document.querySelector<HTMLDivElement>('#result');
const scoreEl = document.querySelector<HTMLDivElement>('#score');
const finishDialog = document.querySelector<HTMLDivElement>('#finish-dialog');
const finishMessage = document.querySelector<HTMLParagraphElement>('#finish-message');
const finishClose = document.querySelector<HTMLButtonElement>('#finish-close');
const actionBtn = document.querySelector<HTMLButtonElement>('#action-btn');
const resetBtn = document.querySelector<HTMLButtonElement>('#reset-btn');

const createDiceSVG = (value: number) => {
  const pipMap: Record<number, Array<[number, number]>> = {
    1: [[100, 100]],
    2: [[60, 60], [140, 140]],
    3: [[60, 60], [100, 100], [140, 140]],
    4: [[60, 60], [140, 60], [60, 140], [140, 140]],
    5: [[60, 60], [140, 60], [100, 100], [60, 140], [140, 140]],
    6: [[60, 60], [140, 60], [60, 100], [140, 100], [60, 140], [140, 140]],
  };

  const pips = pipMap[value]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="14" fill="#ffffff" />`)
    .join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect x="10" y="10" width="180" height="180" rx="28" ry="28" fill="#2563eb" stroke="#1d4ed8" stroke-width="12" />
      ${pips}
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const randomFace = (): number => Math.floor(Math.random() * 6) + 1;

const createDiceSet = (): Dice[] =>
  Array.from({ length: 6 }, (_, index) => ({
    id: index + 1,
    value: randomFace(),
    kept: false,
    selected: false,
  }));

let dice: Dice[] = createDiceSet();
let round = 1;

const activeDice = () => dice.filter((die) => !die.kept);
const selectedDice = () => dice.filter((die) => die.selected && !die.kept);
const keptDice = () => dice.filter((die) => die.kept);

const allActiveSelected = () => {
  const active = activeDice();
  return active.length > 0 && selectedDice().length === active.length;
};

const renderDice = () => {
  if (!diceBoard) return;

  diceBoard.innerHTML = dice
    .map((die) => {
      const classes = [
        'die',
        die.kept ? 'kept' : 'active',
        die.selected ? 'selected' : '',
      ]
        .filter(Boolean)
        .join(' ');

      return `
        <button type="button" class="die ${classes}" data-id="${die.id}" aria-pressed="${die.selected}">
          <img src="${createDiceSVG(die.value)}" alt="Die face ${die.value}" />
          <span class="die-label">${die.kept ? 'Kept' : die.selected ? 'Selected' : 'Choose'}</span>
        </button>
      `;
    })
    .join('');

  diceBoard.querySelectorAll('button.die').forEach((button) => {
    const id = Number(button.getAttribute('data-id'));
    const die = dice.find((item) => item.id === id);

    if (!die || die.kept) return;

    button.addEventListener('click', () => {
      dice = dice.map((item) =>
        item.id === id && !item.kept
          ? { ...item, selected: !item.selected }
          : item,
      ); 

      if (allActiveSelected()) {
        keepSelectedDice();
      }

      render();
    });
  });
};

const renderStatus = () => {
  if (!statusEl || !actionBtn || !resultEl) return;

  const remaining = activeDice().length;
  const selected = selectedDice().length;
  const isComplete = remaining === 0;

  const currentScore = keptDice().reduce((sum, die) => sum + die.value, 0);

  if (isComplete) {
    statusEl.textContent = `Game complete! Final result has ${keptDice().length} dice kept.`;
    resultEl.textContent = `Final dice: ${keptDice().map((die) => die.value).join(', ')}.`;
    scoreEl && (scoreEl.textContent = `Final score: ${currentScore}`);
    actionBtn.textContent = 'Restart Game';
    actionBtn.disabled = false;
    showFinishDialog(currentScore);
  } else {
    statusEl.textContent = `Round ${round}: select at least one die for the final result, then roll the remaining ${remaining} dice.`;
    resultEl.textContent = `Kept dice: ${keptDice().map((die) => die.value).join(', ') || 'none'}.`;
    scoreEl && (scoreEl.textContent = `Current score: ${currentScore}`);
    actionBtn.textContent = selected > 0 ? 'Keep selected and roll remaining' : 'Select at least one die';
    actionBtn.disabled = selected === 0;
  }
};

const showFinishDialog = (score: number) => {
  if (!finishDialog || !finishMessage) return;
  finishMessage.textContent = `Your final score is ${score}. Great game!`;
  finishDialog.classList.remove('hidden');
};

const hideFinishDialog = () => {
  finishDialog?.classList.add('hidden');
};

const rollRemainingDice = () => {
  dice = dice.map((die) =>
    die.kept
      ? die
      : {
          ...die,
          value: randomFace(),
          selected: false,
        },
  );
};

const keepSelectedDice = () => {
  if (selectedDice().length === 0) return;

  dice = dice.map((die) =>
    die.selected && !die.kept ? { ...die, kept: true, selected: false } : die,
  );
};

const onAction = () => {
  const remaining = activeDice().length;

  if (remaining === 0) {
    resetGame();
    return;
  }

  if (selectedDice().length === 0) return;

  keepSelectedDice();

  if (activeDice().length > 0) {
    round += 1;
    rollRemainingDice();
  }

  render();
};

const resetGame = () => {
  hideFinishDialog();
  dice = createDiceSet();
  round = 1;
  render();
};

const render = () => {
  renderDice();
  renderStatus();
};

if (actionBtn) {
  actionBtn.addEventListener('click', onAction);
}

if (resetBtn) {
  resetBtn.addEventListener('click', resetGame);
}

if (finishClose) {
  finishClose.addEventListener('click', hideFinishDialog);
}

render();

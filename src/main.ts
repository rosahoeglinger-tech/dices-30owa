type Dice = {
  id: number;
  value: number;
  kept: boolean;
  selected: boolean;
};

type Player = {
  name: string;
  score: number;
  lastResult: number;
  eliminated: boolean;
};

const diceBoard = document.querySelector<HTMLDivElement>('#dice-board');
const statusEl = document.querySelector<HTMLDivElement>('#status');
const resultEl = document.querySelector<HTMLDivElement>('#result');
const scoreEl = document.querySelector<HTMLDivElement>('#score');
const playersSummary = document.querySelector<HTMLDivElement>('#players-summary');

const overviewBtn = document.querySelector<HTMLButtonElement>('#overview-btn');
const playerDialog = document.querySelector<HTMLDivElement>('#player-dialog');
const playerNameInput = document.querySelector<HTMLInputElement>('#player-name-input');
const addPlayerBtn = document.querySelector<HTMLButtonElement>('#add-player-btn');
const playerList = document.querySelector<HTMLUListElement>('#player-list');
const startPlayBtn = document.querySelector<HTMLButtonElement>('#start-play-btn');
const closePlayerDialog = document.querySelector<HTMLButtonElement>('#close-player-dialog');

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
let players: Player[] = [];
let currentPlayerIndex = 0;
let isPlaying = false;
let playerCompleted = false;
let gameOver = false;

const activeDice = () => dice.filter((die) => !die.kept);
const selectedDice = () => dice.filter((die) => die.selected && !die.kept);
const keptDice = () => dice.filter((die) => die.kept);

const openPlayerDialog = () => {
  playerDialog?.classList.remove('hidden');
  renderPlayerDialog();
};

const closePlayerDialogPanel = (autoStart = true) => {
  playerDialog?.classList.add('hidden');
  if (autoStart && !isPlaying && players.length > 0 && !gameOver) {
    startPlay();
  }
};

const alivePlayers = () => players.filter((player) => !player.eliminated);
const firstAliveIndex = () => players.findIndex((player) => !player.eliminated);
const currentPlayer = () => {
  if (players.length === 0) return undefined;
  if (currentPlayerIndex < 0 || currentPlayerIndex >= players.length || players[currentPlayerIndex].eliminated) {
    const firstIndex = firstAliveIndex();
    if (firstIndex === -1) return undefined;
    currentPlayerIndex = firstIndex;
  }
  return players[currentPlayerIndex];
};

const renderPlayersSummary = () => {
  if (!playersSummary) return;

  if (players.length === 0) {
    playersSummary.textContent = 'No players yet. Open Players to add names.';
    return;
  }

  playersSummary.innerHTML = `
    <strong>Players</strong>
    <ul>${players
      .map(
        (player, index) =>
          `<li>${index === currentPlayerIndex && isPlaying ? '<strong>▶</strong> ' : ''}${player.name}: ${player.score} pts${player.eliminated ? ' (eliminated)' : ''}</li>`,
      )
      .join('')}</ul>
  `;
};

const renderPlayerDialog = () => {
  if (!playerList || !startPlayBtn) return;

  playerList.innerHTML = players
    .map(
      (player, index) =>
        `<li><strong>${player.name}</strong> — ${player.score} pts${player.eliminated ? ' (eliminated)' : ''}</li>`,
    )
    .join('');

  startPlayBtn.disabled = players.length === 0;
};

const addPlayer = () => {
  const name = playerNameInput?.value.trim();
  if (!name) return;

  players.push({ name, score: 30, lastResult: 0, eliminated: false });
  if (playerNameInput) playerNameInput.value = '';
  renderPlayerDialog();
  renderPlayersSummary();
};

const resetDice = () => {
  dice = createDiceSet();
  round = 1;
  playerCompleted = false;
  render();
};

const startPlay = () => {
  if (players.length === 0) return;

  const firstIndex = firstAliveIndex();
  if (firstIndex === -1) return;

  currentPlayerIndex = firstIndex;
  isPlaying = true;
  gameOver = false;
  playerCompleted = false;
  hideFinishDialog();
  resetDice();
  closePlayerDialogPanel(false);
  renderPlayersSummary();
};

const startNextPlayer = () => {
  const alive = alivePlayers();
  if (alive.length <= 1) {
    gameOver = true;
    isPlaying = false;
    return;
  }

  let nextIndex = players.findIndex(
    (player, index) => index > currentPlayerIndex && !player.eliminated,
  );
  if (nextIndex === -1) {
    nextIndex = players.findIndex((player) => !player.eliminated);
  }

  if (nextIndex === -1) {
    gameOver = true;
    isPlaying = false;
    return;
  }

  currentPlayerIndex = nextIndex;
  isPlaying = true;
  playerCompleted = false;
  resetDice();
  renderPlayersSummary();
};

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

    if (!die || die.kept || !isPlaying) return;

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
  if (!statusEl || !actionBtn || !resultEl || !scoreEl) return;

  const remaining = activeDice().length;
  const selected = selectedDice().length;
  const currentScore = keptDice().reduce((sum, die) => sum + die.value, 0);
  const player = currentPlayer();

  if (!players.length) {
    statusEl.textContent = 'No players added yet. Open Players to add names and start a game.';
    resultEl.textContent = '';
    scoreEl.textContent = '';
    actionBtn.disabled = true;
    actionBtn.textContent = 'Keep selected and roll remaining';
    return;
  }

  if (!player) {
    statusEl.textContent = 'No active player remains.';
    resultEl.textContent = '';
    scoreEl.textContent = '';
    actionBtn.disabled = true;
    actionBtn.textContent = 'Keep selected and roll remaining';
    return;
  }

  if (gameOver) {
    const winner = alivePlayers()[0];
    statusEl.textContent = winner
      ? `Game over! ${winner.name} is the last remaining player.`
      : 'Game over! No players remain.';
    resultEl.textContent = '';
    scoreEl.textContent = winner ? `Winner credit: ${winner.score} pts` : '';
    actionBtn.disabled = true;
    actionBtn.textContent = 'Keep selected and roll remaining';
    return;
  }

  if (!isPlaying) {
    statusEl.textContent = playerCompleted
      ? `Round complete for ${player.name}. Waiting for next player.`
      : `Ready to start play for ${player.name}. Open Players to manage players.`;
    resultEl.textContent = `Latest result: ${player.lastResult || 'none'}.`;
    scoreEl.textContent = `Account: ${player.score} pts`;
    actionBtn.disabled = true;
    actionBtn.textContent = 'Keep selected and roll remaining';
    return;
  }

  if (remaining === 0) {
    statusEl.textContent = `${player.name} has finished the round.`;
    actionBtn.disabled = true;
    actionBtn.textContent = 'Keep selected and roll remaining';
    return;
  }

  statusEl.textContent = `${player.name}'s turn — round ${round}: select at least one die for the final result, then roll the remaining ${remaining} dice.`;
  resultEl.textContent = `Kept dice: ${keptDice().map((die) => die.value).join(', ') || 'none'}.`;
  scoreEl.textContent = `Current score: ${currentScore}`;
  actionBtn.textContent = selected > 0 ? 'Keep selected and roll remaining' : 'Select at least one die';
  actionBtn.disabled = selected === 0;
};

const showFinishDialog = (message: string) => {
  if (!finishDialog || !finishMessage) return;
  finishMessage.textContent = message;
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

  if (activeDice().length === 0) {
    completePlayerTurn();
  }
};

const completePlayerTurn = () => {
  const player = currentPlayer();
  if (!player) return;

  const finalScore = keptDice().reduce((sum, die) => sum + die.value, 0);
  player.lastResult = finalScore;

  let message = `${player.name} scored ${finalScore}.`;

  if (finalScore < 30) {
    const penalty = 30 - finalScore;
    player.score -= penalty;
    message += ` ${penalty} points were subtracted from the account.`;
  } else {
    message += ' No penalty applied.';
  }

  if (player.score <= 0) {
    player.eliminated = true;
    message += ` ${player.name} has been eliminated.`;
  }

  if (alivePlayers().length <= 1) {
    gameOver = true;
    isPlaying = false;
    const winner = alivePlayers()[0];
    if (winner) {
      message += ` ${winner.name} is the last remaining player and wins with ${winner.score} pts.`;
    } else {
      message += ' No players remain.';
    }
    showFinishDialog(message);
  } else {
    isPlaying = false;
    playerCompleted = true;
    showFinishDialog(message);
  }

  renderPlayersSummary();
  render();
};

const onAction = () => {
  const remaining = activeDice().length;

  if (remaining === 0 || !isPlaying) return;
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
  if (isPlaying) {
    resetDice();
  } else if (players.length > 0) {
    currentPlayerIndex = 0;
    isPlaying = false;
    playerCompleted = false;
    players.forEach((player) => {
      player.lastResult = 0;
    });
    renderPlayersSummary();
    render();
  }
};

const render = () => {
  renderDice();
  renderStatus();
};

if (overviewBtn) {
  overviewBtn.addEventListener('click', openPlayerDialog);
}

if (addPlayerBtn) {
  addPlayerBtn.addEventListener('click', addPlayer);
}

if (startPlayBtn) {
  startPlayBtn.addEventListener('click', startPlay);
}

if (closePlayerDialog) {
  closePlayerDialog.addEventListener('click', closePlayerDialogPanel);
}

if (actionBtn) {
  actionBtn.addEventListener('click', onAction);
}

if (resetBtn) {
  resetBtn.addEventListener('click', resetGame);
}

if (finishClose) {
  finishClose.addEventListener('click', () => {
    hideFinishDialog();
    if (!gameOver && playerCompleted) {
      startNextPlayer();
      if (gameOver) {
        const winner = alivePlayers()[0];
        if (winner) {
          showFinishDialog(`${winner.name} is the last remaining player and wins with ${winner.score} pts.`);
        }
      } else {
        render();
      }
    }
  });
}

renderPlayersSummary();
renderPlayerDialog();
render();

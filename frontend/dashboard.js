const token = localStorage.getItem('tdah_token');

if (!token) {
  window.location.href = 'index.html';
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

// ==========================================
// ESTATÍSTICAS
// ==========================================
async function carregarEstatisticas() {
  try {
    const response = await fetch('http://localhost:3000/api/progress', { headers });
    if (response.ok) {
      const data = await response.json();
      document.getElementById('statTasks').textContent = data.completedTasks;
      document.getElementById('statCycles').textContent = data.totalPomodoros;
      document.getElementById('statTime').textContent = `${data.totalFocusTimeMinutes} min`;
    }
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
  }
}

// ==========================================
// TAREFAS
// ==========================================
const tasksList = document.getElementById('tasksList');
const taskInput = document.getElementById('taskInput');
const btnTask = document.getElementById('btnTask');

async function carregarTarefas() {
  const response = await fetch('http://localhost:3000/api/tasks', { headers });
  const tasks = await response.json();
  
  tasksList.innerHTML = '';
  tasks.forEach(task => {
    const item = document.createElement('div');
    item.className = `list-item ${task.completed ? 'completed' : ''}`;
    item.innerHTML = `
      <div class="item-left">
        <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="atualizarTarefa('${task.id}', this.checked)">
        <p>${task.title || 'Tarefa sem título'}</p>
      </div>
      <button onclick="deletarTarefa('${task.id}')">❌</button>
    `;
    tasksList.appendChild(item);
  });
}

btnTask.addEventListener('click', async () => {
  if (!taskInput.value) return;
  await fetch('http://localhost:3000/api/tasks', {
    method: 'POST', headers, body: JSON.stringify({ title: taskInput.value })
  });
  taskInput.value = '';
  await carregarTarefas(); // Espera a tarefa ser criada para recarregar a lista
});

// Permite enviar a tarefa apertando a tecla Enter
taskInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    btnTask.click(); // Finge um clique no botão de adicionar
  }
});

window.atualizarTarefa = async (id, completed) => {
  await fetch(`http://localhost:3000/api/tasks/${id}`, {
    method: 'PUT', headers, body: JSON.stringify({ completed })
  });
  await carregarTarefas();       // O await garante o tempo real
  await carregarEstatisticas();  // Atualiza as estatísticas instantaneamente
};

window.deletarTarefa = async (id) => {
  await fetch(`http://localhost:3000/api/tasks/${id}`, { method: 'DELETE', headers });
  await carregarTarefas();
  await carregarEstatisticas();  // Se apagar uma tarefa concluída, o número cai na hora
};

// ==========================================
// BRAINDUMP
// ==========================================
const braindumpsList = document.getElementById('braindumpsList');
const braindumpInput = document.getElementById('braindumpInput');
const btnBraindump = document.getElementById('btnBraindump');

async function carregarBraindumps() {
  const response = await fetch('http://localhost:3000/api/braindumps', { headers });
  const dumps = await response.json();
  
  braindumpsList.innerHTML = '';
  dumps.forEach(dump => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <div class="item-left">
        <span>💭</span>
        <p>${dump.content || 'Sem conteúdo'}</p>
      </div>
      <button onclick="deletarBraindump('${dump.id}')">✔</button>
    `;
    braindumpsList.appendChild(item);
  });
}

btnBraindump.addEventListener('click', async () => {
  if (!braindumpInput.value) return;
  await fetch('http://localhost:3000/api/braindumps', {
    method: 'POST', headers, body: JSON.stringify({ content: braindumpInput.value })
  });
  braindumpInput.value = '';
  await carregarBraindumps();
});

// Permite enviar o pensamento apertando a tecla Enter
braindumpInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    btnBraindump.click(); // Finge um clique no botão de salvar
  }
});

window.deletarBraindump = async (id) => {
  await fetch(`http://localhost:3000/api/braindumps/${id}`, { method: 'DELETE', headers });
  await carregarBraindumps();
};

// ==========================================
// POMODORO
// ==========================================
let timerInterval;
let timeLeft = 25 * 60; 
let isRunning = false;
let isFocusMode = true;

const timerDisplay = document.getElementById('timerDisplay');
const timerStatus = document.getElementById('timerStatus');
const btnPomodoro = document.getElementById('btnPomodoro');
const focusInput = document.getElementById('focusInput');
const pauseInput = document.getElementById('pauseInput');

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateDisplay() {
  timerDisplay.textContent = formatTime(timeLeft);
}

focusInput.addEventListener('change', () => {
  if (!isRunning && isFocusMode) {
    timeLeft = focusInput.value * 60;
    updateDisplay();
  }
});

btnPomodoro.addEventListener('click', () => {
  if (isRunning) {
    clearInterval(timerInterval);
    btnPomodoro.textContent = 'Continuar';
    timerStatus.textContent = 'Pausado';
    isRunning = false;
  } else {
    isRunning = true;
    btnPomodoro.textContent = 'Parar';
    timerStatus.textContent = isFocusMode ? 'Modo Foco' : 'Modo Pausa';
    
    timerInterval = setInterval(async () => {
      timeLeft--;
      updateDisplay();

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        isRunning = false;
        
        if (isFocusMode) {
          // Salva o ciclo no backend
          await fetch('http://localhost:3000/api/pomodoros', {
            method: 'POST', headers, 
            body: JSON.stringify({ focusDuration: focusInput.value, pauseDuration: pauseInput.value })
          });
          
          // Força a atualização do visual ANTES do alerta
          await carregarEstatisticas(); 
          
          // O setTimeout de 50ms dá respiro para a tela pintar o novo número
          setTimeout(() => {
            alert('Foco concluído! Hora da pausa.');
            isFocusMode = false;
            timeLeft = pauseInput.value * 60;
            timerStatus.textContent = 'Pausa pronta';
            btnPomodoro.textContent = 'Iniciar Pausa';
            updateDisplay();
          }, 50);

        } else {
          setTimeout(() => {
            alert('Pausa concluída! De volta ao foco.');
            isFocusMode = true;
            timeLeft = focusInput.value * 60;
            timerStatus.textContent = 'Foco pronto';
            btnPomodoro.textContent = 'Iniciar Foco';
            updateDisplay();
          }, 50);
        }
      }
    }, 1000);
  }
});

// Inicialização da página
carregarEstatisticas();
carregarTarefas();
carregarBraindumps();
updateDisplay();
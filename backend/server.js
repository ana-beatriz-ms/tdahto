import 'dotenv/config'; 
import express from 'express';
import cors from 'cors'; // <-- Importação do CORS
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import db from './db.js';

const app = express();

// Pega a porta do .env ou usa 3000 como segurança (fallback)
const PORT = process.env.PORT || 3000; 

// Pega a chave secreta do .env
const JWT_SECRET = process.env.JWT_SECRET;


// MIDDLEWARES GERAIS
app.use(cors()); // <-- CORS liberando as portas
app.use(express.json()); // <-- Permite ler JSON


// ==========================================
// ROTAS DE TESTE
// ==========================================
app.get('/', (req, res) => {
  res.json({ message: 'API do TDAH.to está online! 🚀' });
});

app.get('/api/test-db', (req, res) => {
  res.json(db.data);
});

// ==========================================
// ROTAS DE AUTENTICAÇÃO
// ==========================================

// POST /api/auth/register - Criar um novo utilizador
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Por favor, preencha todos os campos.' });
    }

    const userExists = db.data.users.find(user => user.email === email);
    if (userExists) {
      return res.status(400).json({ error: 'Este email já está a ser utilizado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      id: crypto.randomUUID(),
      name,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    db.data.users.push(newUser);
    await db.write();

    const { password: _, ...userWithoutPassword } = newUser;
    
    return res.status(201).json({
      message: 'Utilizador registado com sucesso!',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// POST /api/auth/login - Entrar no sistema
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Por favor, preencha email e senha.' });
    }

    const user = db.data.users.find(u => u.email === email);
    
    if (!user) {
      return res.status(401).json({ error: 'Email ou senha incorretos.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email ou senha incorretos.' });
    }

    const { password: _, ...userWithoutPassword } = user;

    const token = jwt.sign(
      { id: user.id }, 
      JWT_SECRET, 
      { expiresIn: '7d' } 
    );

    return res.status(200).json({
      message: 'Login realizado com sucesso!',
      token, 
      user: userWithoutPassword
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// ==========================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ==========================================
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next(); 
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};

// ==========================================
// ROTAS DE TAREFAS (CRUD) - PROTEGIDAS POR JWT
// ==========================================

// 1. GET /api/tasks - Listar todas as tarefas do utilizador logado
app.get('/api/tasks', verificarToken, (req, res) => {
  try {
    const userId = req.userId; 
    const userTasks = db.data.tasks.filter(task => task.userId === userId);
    return res.status(200).json(userTasks);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar tarefas.' });
  }
});

// 2. POST /api/tasks - Criar uma nova tarefa para o utilizador logado
app.post('/api/tasks', verificarToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'O título da tarefa é obrigatório.' });
    }

    const newTask = {
      id: crypto.randomUUID(),
      userId,
      title,
      completed: false,
      createdAt: new Date().toISOString()
    };

    db.data.tasks.push(newTask);
    await db.write(); 

    return res.status(201).json(newTask);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao criar tarefa.' });
  }
});

// 3. PUT /api/tasks/:id - Atualizar uma tarefa
app.put('/api/tasks/:id', verificarToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params; 
    const { title, completed } = req.body;

    const task = db.data.tasks.find(t => t.id === id && t.userId === userId);

    if (!task) {
      return res.status(404).json({ error: 'Tarefa não encontrada ou acesso negado.' });
    }

    if (title !== undefined) task.title = title;
    if (completed !== undefined) task.completed = completed;

    await db.write(); 

    return res.status(200).json(task);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar tarefa.' });
  }
});

// 4. DELETE /api/tasks/:id - Excluir uma tarefa
app.delete('/api/tasks/:id', verificarToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const taskIndex = db.data.tasks.findIndex(t => t.id === id && t.userId === userId);

    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Tarefa não encontrada ou acesso negado.' });
    }

    db.data.tasks.splice(taskIndex, 1);
    await db.write();

    return res.status(200).json({ message: 'Tarefa excluída com sucesso.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao excluir tarefa.' });
  }
});

// ==========================================
// ROTAS DE BRAINDUMP - PROTEGIDAS POR JWT
// ==========================================

// 1. GET /api/braindumps - Listar os pensamentos do utilizador
app.get('/api/braindumps', verificarToken, (req, res) => {
  try {
    const userId = req.userId; 
    
    // Filtra os pensamentos pertencentes ao utilizador logado
    const userBraindumps = db.data.braindumps.filter(b => b.userId === userId);
    
    return res.status(200).json(userBraindumps);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar pensamentos intrusivos.' });
  }
});

// 2. POST /api/braindumps - Salvar um novo pensamento rapidamente
app.post('/api/braindumps', verificarToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { content } = req.body; // Recebe o texto do pensamento

    if (!content) {
      return res.status(400).json({ error: 'O conteúdo do pensamento é obrigatório.' });
    }

    const newBraindump = {
      id: crypto.randomUUID(),
      userId,
      content,
      createdAt: new Date().toISOString() // Salva o momento exato em que o pensamento ocorreu
    };

    db.data.braindumps.push(newBraindump);
    await db.write(); 

    return res.status(201).json(newBraindump);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao salvar o pensamento.' });
  }
});

// 3. DELETE /api/braindumps/:id - Limpar um pensamento após ser resolvido
app.delete('/api/braindumps/:id', verificarToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Busca o índice do pensamento garantindo que pertence ao utilizador
    const braindumpIndex = db.data.braindumps.findIndex(b => b.id === id && b.userId === userId);

    if (braindumpIndex === -1) {
      return res.status(404).json({ error: 'Pensamento não encontrado ou acesso negado.' });
    }

    // Remove do banco de dados
    db.data.braindumps.splice(braindumpIndex, 1);
    await db.write();

    return res.status(200).json({ message: 'Pensamento descartado com sucesso.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao excluir pensamento.' });
  }
});

// ==========================================
// ROTAS DE POMODORO E PROGRESSO - PROTEGIDAS POR JWT
// ==========================================

// 1. POST /api/pomodoros - Salvar um ciclo de estudo concluído
app.post('/api/pomodoros', verificarToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { focusDuration, pauseDuration } = req.body;

    // Valida se o tempo de foco foi enviado
    if (!focusDuration) {
      return res.status(400).json({ error: 'O tempo de foco é obrigatório.' });
    }

    const newPomodoro = {
      id: crypto.randomUUID(),
      userId,
      focusDuration: Number(focusDuration), // Garante que será salvo como número
      pauseDuration: pauseDuration ? Number(pauseDuration) : 5, // Padrão de 5 min se não for enviado
      completedAt: new Date().toISOString()
    };

    db.data.pomodoros.push(newPomodoro);
    await db.write();

    return res.status(201).json(newPomodoro);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao registrar ciclo de pomodoro.' });
  }
});

// 2. GET /api/progress - Dashboard de estatísticas do utilizador
app.get('/api/progress', verificarToken, (req, res) => {
  try {
    const userId = req.userId;

    // Passo 1: Contar as tarefas que pertencem ao utilizador e estão marcadas como concluídas
    const completedTasksCount = db.data.tasks.filter(
      task => task.userId === userId && task.completed === true
    ).length;

    // Passo 2: Buscar todos os ciclos de pomodoro do utilizador
    const userPomodoros = db.data.pomodoros.filter(p => p.userId === userId);
    
    // Conta a quantidade total de ciclos realizados
    const totalPomodoros = userPomodoros.length;

    // Passo 3: Somar o tempo de foco de todos esses ciclos usando a função reduce do JavaScript
    const totalFocusTimeMinutes = userPomodoros.reduce(
      (acumulador, pomodoro) => acumulador + pomodoro.focusDuration, 
      0 // 0 é o valor inicial do acumulador
    );

    // Passo 4: Devolver os dados mastigados para o frontend
    return res.status(200).json({
      completedTasks: completedTasksCount,
      totalPomodoros,
      totalFocusTimeMinutes
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao carregar o progresso do utilizador.' });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor a rodar em http://localhost:${PORT}`);
});
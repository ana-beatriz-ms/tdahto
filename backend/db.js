import { JSONFilePreset } from 'lowdb/node';

// A estrutura inicial banco de dados
const defaultData = {
  users: [],
  tasks: [],
  braindumps: [],
  pomodoros: []
};

// Cria ou lê o arquivo db.json usando a estrutura padrão
const db = await JSONFilePreset('db.json', defaultData);

export default db;
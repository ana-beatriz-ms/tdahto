let isLoginMode = true;

// Captura os elementos da tela
const form = document.getElementById('authForm');
const nameGroup = document.getElementById('nameGroup');
const toggleLink = document.getElementById('toggleLink');
const toggleText = document.getElementById('toggleText');
const submitBtn = document.getElementById('submitBtn');
const messageBox = document.getElementById('messageBox');

// Lógica para alternar entre Login e Cadastro
toggleLink.addEventListener('click', () => {
  isLoginMode = !isLoginMode;
  if (isLoginMode) {
    nameGroup.style.display = 'none';
    submitBtn.textContent = 'Entrar';
    toggleText.textContent = 'Ainda não tem conta?';
    toggleLink.textContent = 'Criar agora';
  } else {
    nameGroup.style.display = 'block';
    submitBtn.textContent = 'Cadastrar';
    toggleText.textContent = 'Já tem uma conta?';
    toggleLink.textContent = 'Fazer login';
  }
  messageBox.textContent = ''; // Limpa as mensagens
});

// Lógica para enviar os dados para o Backend
form.addEventListener('submit', async (e) => {
  e.preventDefault(); // Impede a página de recarregar
  
  const email = document.getElementById('emailInput').value;
  const password = document.getElementById('passwordInput').value;
  const name = document.getElementById('nameInput').value;

  // Define se vai chamar a rota de login ou de register
  const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
  const bodyData = isLoginMode ? { email, password } : { name, email, password };

  try {
    // Faz a requisição para o seu servidor Express
    const response = await fetch(`https://tdahto.onrender.com${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyData)
    });

    const data = await response.json();

    if (response.ok) {
      messageBox.style.color = '#A385E0'; // Roxo da marca para sucesso
      messageBox.textContent = data.message;
      
      if (isLoginMode) {
        // Guarda o Token VIP no navegador para usar depois
        localStorage.setItem('tdah_token', data.token);
    setTimeout(() => window.location.href = 'dashboard.html', 1000);      
    } else {
        // Se cadastrou, muda para a tela de login
        setTimeout(() => toggleLink.click(), 1500);
      }
    } else {
      // Mostra o erro que o seu backend mandou
      messageBox.style.color = '#ff6b6b';
      messageBox.textContent = data.error;
    }

  } catch (error) {
    messageBox.style.color = '#ff6b6b';
    messageBox.textContent = 'Erro ao conectar com o servidor.';
  }
});
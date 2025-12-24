// ===== CONFIGURAÇÃO SUPABASE =====
const SUPABASE_URL = 'https://xyiyjpmznqnwgwgfncbr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5aXlqcG16bnFud2d3Z2ZuY2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MTMzOTMsImV4cCI6MjA4MjE4OTM5M30.cda7nDz3vfon0NA1tzGpK7OCVAFybZLDAcfbTdOTXmQ';

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ELEMENTOS DO DOM =====
const form = document.getElementById('inscricao-form');
const btnSubmit = document.getElementById('btn-submit');
const btnText = btnSubmit.querySelector('.btn-text');
const btnLoading = btnSubmit.querySelector('.btn-loading');
const mensagemSucesso = document.getElementById('mensagem-sucesso');
const mensagemErro = document.getElementById('mensagem-erro');
const erroTexto = document.getElementById('erro-texto');

// ===== FUNÇÕES =====

// Mostrar estado de loading
function setLoading(loading) {
    btnSubmit.disabled = loading;
    btnText.style.display = loading ? 'none' : 'inline';
    btnLoading.style.display = loading ? 'inline' : 'none';
}

// Mostrar mensagem de sucesso
function mostrarSucesso() {
    mensagemSucesso.style.display = 'flex';
    mensagemErro.style.display = 'none';
    form.style.display = 'none';
}

// Mostrar mensagem de erro
function mostrarErro(mensagem) {
    erroTexto.textContent = mensagem;
    mensagemErro.style.display = 'flex';
    mensagemSucesso.style.display = 'none';
}

// Esconder mensagens
function esconderMensagens() {
    mensagemSucesso.style.display = 'none';
    mensagemErro.style.display = 'none';
}

// Validar email
function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Inscrever participante
async function inscreverParticipante(nome, email) {
    try {
        setLoading(true);
        esconderMensagens();

        // Validações
        if (!nome.trim()) {
            throw new Error('Por favor, digite seu nome.');
        }

        if (!validarEmail(email)) {
            throw new Error('Por favor, digite um email válido.');
        }

        // Verificar se email já existe
        const { data: existente, error: erroConsulta } = await supabase
            .from('participantes')
            .select('email')
            .eq('email', email.toLowerCase().trim())
            .single();

        if (existente) {
            throw new Error('Este email já está inscrito no sorteio!');
        }

        // Inserir novo participante
        const { data, error } = await supabase
            .from('participantes')
            .insert([
                {
                    nome: nome.trim(),
                    email: email.toLowerCase().trim()
                }
            ])
            .select();

        if (error) {
            // Erro de duplicidade do banco
            if (error.code === '23505') {
                throw new Error('Este email já está inscrito no sorteio!');
            }
            throw new Error('Erro ao realizar inscrição. Tente novamente.');
        }

        // Sucesso!
        mostrarSucesso();

    } catch (error) {
        mostrarErro(error.message);
    } finally {
        setLoading(false);
    }
}

// ===== EVENT LISTENERS =====

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    
    await inscreverParticipante(nome, email);
});

// Esconder erro ao digitar
document.getElementById('nome').addEventListener('input', esconderMensagens);
document.getElementById('email').addEventListener('input', esconderMensagens);

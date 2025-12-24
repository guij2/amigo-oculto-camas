// ===== CONFIGURAÇÃO SUPABASE =====
const SUPABASE_URL = 'https://xyiyjpmznqnwgwgfncbr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5aXlqcG16bnFud2d3Z2ZuY2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MTMzOTMsImV4cCI6MjA4MjE4OTM5M30.cda7nDz3vfon0NA1tzGpK7OCVAFybZLDAcfbTdOTXmQ';

document.addEventListener('DOMContentLoaded', () => {
    // Verificar se Supabase carregou
    if (typeof window.supabase === 'undefined') {
        console.error('Erro Crítico: Biblioteca Supabase não carregou.');
        alert('Erro ao carregar o sistema. Por favor, recarregue a página.');
        return;
    }

    // Inicializar Supabase
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ===== ELEMENTOS DO DOM =====
    const form = document.getElementById('inscricao-form');
    const btnSubmit = document.getElementById('btn-submit');
    const btnText = btnSubmit.querySelector('.btn-text');
    const btnLoading = btnSubmit.querySelector('.btn-loading');
    const mensagemErro = document.getElementById('mensagem-erro');
    const erroTexto = document.getElementById('erro-texto');

    // ===== FUNÇÕES =====

    // Mostrar estado de loading
    function setLoading(loading) {
        btnSubmit.disabled = loading;
        btnText.style.display = loading ? 'none' : 'inline';
        btnLoading.style.display = loading ? 'inline' : 'none';
    }

    // Mostrar erro
    function mostrarErro(mensagem) {
        erroTexto.textContent = mensagem;
        mensagemErro.style.display = 'flex';
    }

    // Esconder erro
    function esconderErro() {
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
            esconderErro();

            // Validações
            if (!nome.trim()) throw new Error('Por favor, digite seu nome.');
            if (!validarEmail(email)) throw new Error('Por favor, digite um email válido.');

            // Verificar duplicidade
            const { data: existente, error: erroConsulta } = await supabase
                .from('participantes')
                .select('email')
                .eq('email', email.toLowerCase().trim())
                .single();

            // Ignorar erro se for "não encontrado" (PGRST116), mas tratar outros
            if (erroConsulta && erroConsulta.code !== 'PGRST116') {
                 console.error('Erro consulta:', erroConsulta);
            }

            if (existente) {
                throw new Error('Este email já está inscrito no sorteio!');
            }

            // Inserir
            const { error } = await supabase
                .from('participantes')
                .insert([{
                    nome: nome.trim(),
                    email: email.toLowerCase().trim()
                }]);

            if (error) {
                if (error.code === '23505') throw new Error('Este email já está inscrito!');
                console.error('Erro insert:', error);
                throw new Error('Erro ao salvar inscrição. Tente novamente.');
            }

            // Redirecionar para confirmação
            window.location.href = 'confirmacao.html';

        } catch (error) {
            console.error(error);
            mostrarErro(error.message);
        } finally {
            setLoading(false);
        }
    }

    // ===== EVENT LISTENERS =====
    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // Impede o recarregamento da página
        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        await inscreverParticipante(nome, email);
    });

    document.getElementById('nome').addEventListener('input', esconderErro);
    document.getElementById('email').addEventListener('input', esconderErro);
});

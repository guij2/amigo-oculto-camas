// ===== CONFIGURAÇÃO =====
const SUPABASE_URL = 'https://xyiyjpmznqnwgwgfncbr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5aXlqcG16bnFud2d3Z2ZuY2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MTMzOTMsImV4cCI6MjA4MjE4OTM5M30.cda7nDz3vfon0NA1tzGpK7OCVAFybZLDAcfbTdOTXmQ';

// EmailJS Config
const EMAILJS_PUBLIC_KEY = 'utsmOAcQLp-gEyPxW';
const EMAILJS_SERVICE_ID = 'service_phx6elk';
const EMAILJS_TEMPLATE_ID = 'template_y1lcplq';

// Chave secreta do admin
const CHAVE_SECRETA = 'camas2025';

document.addEventListener('DOMContentLoaded', () => {
    // ===== ELEMENTOS DO DOM =====
    const acessoNegado = document.getElementById('acesso-negado');
    const painelAdmin = document.getElementById('painel-admin');
    const listaParticipantes = document.getElementById('lista-participantes');
    const totalParticipantes = document.getElementById('total-participantes');
    const btnSortear = document.getElementById('btn-sortear');
    const btnText = btnSortear.querySelector('.btn-text');
    const btnLoading = btnSortear.querySelector('.btn-loading');
    const resultadoSection = document.getElementById('resultado-section');
    const resultadoLista = document.getElementById('resultado-lista');
    const mensagemErro = document.getElementById('mensagem-erro');
    const erroTexto = document.getElementById('erro-texto');

    // Verificar dependências
    if (typeof window.supabase === 'undefined' || typeof emailjs === 'undefined') {
        console.error('Erro: Bibliotecas não carregaram.');
        alert('Erro ao carregar sistema. Recarregue a página.');
        return;
    }

    // Inicializar Supabase
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Inicializar EmailJS
    emailjs.init(EMAILJS_PUBLIC_KEY);

    // ===== VERIFICAR ACESSO =====
    function verificarAcesso() {
        const params = new URLSearchParams(window.location.search);
        const chave = params.get('chave');
        
        console.log('Verificando acesso...'); // Debug

        if (chave === CHAVE_SECRETA) {
            acessoNegado.style.display = 'none';
            painelAdmin.style.display = 'block';
            carregarParticipantes();
        } else {
            acessoNegado.style.display = 'block';
            painelAdmin.style.display = 'none';
        }
    }

    // ===== CARREGAR PARTICIPANTES =====
    async function carregarParticipantes() {
        try {
            const { data, error } = await supabaseClient
                .from('participantes')
                .select('*')
                .order('criado_em', { ascending: true });

            if (error) throw error;

            renderizarParticipantes(data);
            
        } catch (error) {
            listaParticipantes.innerHTML = '<p class="loading">Erro ao carregar participantes.</p>';
            console.error('Erro:', error);
            mostrarErro('Erro de conexão com o banco de dados.');
        }
    }

    // ===== RENDERIZAR PARTICIPANTES =====
    function renderizarParticipantes(participantes) {
        if (!totalParticipantes) return;
        totalParticipantes.textContent = participantes.length;
        
        if (participantes.length === 0) {
            listaParticipantes.innerHTML = '<p class="loading">Nenhum participante inscrito ainda.</p>';
            btnSortear.disabled = true;
            return;
        }

        // Precisa de pelo menos 3 participantes para sortear
        if (participantes.length < 3) {
            btnSortear.disabled = true;
            listaParticipantes.innerHTML = participantes.map(p => `
                <div class="participante-item">
                    <span class="participante-nome">${escapeHtml(p.nome)}</span>
                    <span class="participante-email">${escapeHtml(p.email)}</span>
                </div>
            `).join('');
            // Aviso visual extra
            listaParticipantes.innerHTML += '<p style="color: var(--vermelho); text-align: center; margin-top: 10px;">Mínimo de 3 participantes para sortear.</p>';
            return;
        }

        btnSortear.disabled = false;
        
        listaParticipantes.innerHTML = participantes.map(p => `
            <div class="participante-item">
                <span class="participante-nome">${escapeHtml(p.nome)}</span>
                <span class="participante-email">${escapeHtml(p.email)}</span>
            </div>
        `).join('');
    }

    // ===== ALGORITMO DE SORTEIO =====
    function realizarSorteio(participantes) {
        // Algoritmo: embaralhar e fazer um ciclo
        // Cada pessoa dá presente para a próxima na lista embaralhada
        // Isso garante que ninguém tire a si mesmo
        
        const embaralhados = [...participantes];
        
        // Fisher-Yates shuffle
        for (let i = embaralhados.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [embaralhados[i], embaralhados[j]] = [embaralhados[j], embaralhados[i]];
        }
        
        // Criar pares: cada um dá presente para o próximo (circular)
        const pares = embaralhados.map((participante, index) => {
            const amigoIndex = (index + 1) % embaralhados.length;
            return {
                de: participante,
                para: embaralhados[amigoIndex]
            };
        });
        
        return pares;
    }

    // ===== ENVIAR EMAILS =====
    async function enviarEmails(pares) {
        const resultados = [];
        
        for (const par of pares) {
            try {
                await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
                    to_name: par.de.nome,
                    to_email: par.de.email,
                    amigo_sorteado: par.para.nome
                });
                
                resultados.push({
                    ...par,
                    sucesso: true
                });
                
            } catch (error) {
                console.error(`Erro ao enviar email para ${par.de.email}:`, error);
                resultados.push({
                    ...par,
                    sucesso: false,
                    erro: error.message
                });
            }
            
            // Pequeno delay para não sobrecarregar o serviço
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        return resultados;
    }

    // ===== EXECUTAR SORTEIO COMPLETO =====
    async function executarSorteio() {
        try {
            setLoading(true);
            esconderErro();
            
            // Buscar participantes atualizados
            const { data: participantes, error } = await supabaseClient
                .from('participantes')
                .select('*');

            if (error) throw error;

            if (participantes.length < 3) {
                throw new Error('É necessário pelo menos 3 participantes para realizar o sorteio.');
            }

            // Realizar sorteio
            const pares = realizarSorteio(participantes);
            
            // Enviar emails
            const resultados = await enviarEmails(pares);
            
            // Verificar se todos foram enviados
            const falhas = resultados.filter(r => !r.sucesso);
            
            if (falhas.length > 0) {
                mostrarErro(`Alguns emails falharam: ${falhas.map(f => f.de.nome).join(', ')}`);
            }
            
            // Mostrar resultado
            mostrarResultado(resultados);
            
            // Desabilitar botão
            btnSortear.disabled = true;
            btnSortear.querySelector('.btn-text').textContent = 'Sorteio Realizado!';
            
        } catch (error) {
            mostrarErro(error.message);
        } finally {
            setLoading(false);
        }
    }

    // ===== MOSTRAR RESULTADO =====
    function mostrarResultado(resultados) {
        resultadoSection.style.display = 'block';
        
        resultadoLista.innerHTML = resultados.map(r => `
            <div class="resultado-item">
                <strong>${escapeHtml(r.de.nome)}</strong> tirou 
                <strong>${escapeHtml(r.para.nome)}</strong>
                ${r.sucesso ? '&#10003;' : '&#10007;'}
            </div>
        `).join('');
    }

    // ===== FUNÇÕES AUXILIARES =====
    function setLoading(loading) {
        btnSortear.disabled = loading;
        btnText.style.display = loading ? 'none' : 'inline';
        btnLoading.style.display = loading ? 'inline' : 'none';
    }

    function mostrarErro(mensagem) {
        erroTexto.textContent = mensagem;
        mensagemErro.style.display = 'flex';
    }

    function esconderErro() {
        mensagemErro.style.display = 'none';
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===== EVENT LISTENERS =====
    if (btnSortear) {
        btnSortear.addEventListener('click', async () => {
            if (confirm('Tem certeza que deseja realizar o sorteio? Esta ação não pode ser desfeita e todos receberão seus emails!')) {
                await executarSorteio();
            }
        });
    }

    // ===== INICIALIZAÇÃO =====
    verificarAcesso();
});

const SUPABASE_URL = "https://oomruxmmdlmfcwenxnnh.supabase.co";
const SUPABASE_KEY = "sb_publishable_3qQbBUh6Mp5e3No473Weew_lp-V5GCh";
const WHATSAPP = "5584994262298";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const form = document.getElementById("form-agendamento");
const campoNome = document.getElementById("nome-cliente");
const campoTelefone = document.getElementById("telefone-cliente");
const campoServico = document.getElementById("servico");
const campoData = document.getElementById("data-agendamento");
const campoHorario = document.getElementById("horario-manual");
const campoHorarioSelecionado = document.getElementById("horario-selecionado");
const listaHorarios = document.getElementById("lista-horarios");
const mensagemHorarios = document.getElementById("mensagem-horarios");
const mensagemFormulario = document.getElementById("mensagem-formulario");
const botaoAgendar = document.getElementById("botao-agendar");

let barbeiros = [];
let servicos = [];
let consultaAtual = 0;

const EXPEDIENTE = {
    0: [["09:00", "12:00"]],
    1: [],
    2: [["09:00", "12:00"], ["14:00", "20:00"]],
    3: [["09:00", "12:00"], ["14:00", "20:00"]],
    4: [["09:00", "12:00"], ["14:00", "20:00"]],
    5: [["09:00", "12:00"], ["14:00", "20:00"]],
    6: [["09:00", "12:00"], ["14:00", "20:00"]]
};

document.addEventListener("DOMContentLoaded", iniciar);

async function iniciar() {
    atualizarAno();
    prepararAnimacaoLogo();
    prepararCampoBarbeiro();
    prepararCampoHorario();
    definirDatasDisponiveis();

    if (campoData) {
        campoData.addEventListener("change", verificarHorario);
    }

    if (campoServico) {
        campoServico.addEventListener("change", verificarHorario);
    }

    if (campoHorario) {
        campoHorario.addEventListener("input", () => {
            formatarHorarioDigitado();
            verificarHorario();
        });

        campoHorario.addEventListener("blur", verificarHorario);
    }

    const seletorBarbeiro = document.getElementById("barbeiro");

    if (seletorBarbeiro) {
        seletorBarbeiro.addEventListener("change", verificarHorario);
    }

    if (form) {
        form.addEventListener("submit", enviarAgendamento);
    }

    await Promise.all([
        carregarBarbeiros(),
        carregarServicos()
    ]);
}

function atualizarAno() {
    const elemento = document.getElementById("ano-atual");

    if (elemento) {
        elemento.textContent = new Date().getFullYear();
    }
}

function prepararAnimacaoLogo() {
    const abertura = document.getElementById("abertura-barbearia");

    if (!abertura) return;

    setTimeout(() => {
        abertura.classList.add("finalizada");

        setTimeout(() => abertura.remove(), 800);
    }, 1200);
}

function prepararCampoBarbeiro() {
    if (document.getElementById("barbeiro")) return;

    const grupo = document.createElement("div");
    grupo.className = "campo-grupo";

    const label = document.createElement("label");
    label.htmlFor = "barbeiro";
    label.textContent = "Escolha o barbeiro";

    const select = document.createElement("select");
    select.id = "barbeiro";
    select.name = "barbeiro";
    select.required = true;
    select.innerHTML = '<option value="">Carregando barbeiros...</option>';

    grupo.append(label, select);

    const grupoServico = campoServico?.closest(".campo-grupo");

    if (grupoServico) {
        grupoServico.before(grupo);
    } else if (form) {
        form.prepend(grupo);
    }
}

function prepararCampoHorario() {
    if (!campoHorario) {
        console.error("Campo #horario-manual não encontrado no HTML.");
        return;
    }

    if (listaHorarios) {
        listaHorarios.hidden = true;
        listaHorarios.replaceChildren();
    }

    if (campoHorarioSelecionado) {
        campoHorarioSelecionado.value = "";
    }

    campoHorario.type = "text";
    campoHorario.placeholder = "Ex.: 09:20 ou 14:10";
    campoHorario.autocomplete = "off";
    campoHorario.inputMode = "numeric";
    campoHorario.maxLength = 5;
}

// Retorna uma data no formato AAAA-MM-DD usando o horário local.
function dataLocalISO(data = new Date()) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

// CORREÇÃO: preenche o campo com hoje e os próximos 7 dias,
// retirando as segundas-feiras, quando a barbearia está fechada.
function definirDatasDisponiveis() {
    if (!campoData) {
        console.error("Campo #data-agendamento não encontrado no HTML.");
        return;
    }

    const hoje = new Date();
    const hojeISO = dataLocalISO(hoje);

    campoData.innerHTML = "";
    campoData.min = hojeISO;

    const opcaoInicial = document.createElement("option");
    opcaoInicial.value = "";
    opcaoInicial.textContent = "Selecione a data do atendimento";
    opcaoInicial.disabled = true;
    opcaoInicial.selected = true;

    campoData.appendChild(opcaoInicial);

    for (let i = 0; i <= 7; i++) {
        const data = new Date(hoje);
        data.setDate(hoje.getDate() + i);

        // Segunda-feira: barbearia fechada.
        if (data.getDay() === 1) {
            continue;
        }

        const valor = dataLocalISO(data);

        const diaSemana = data.toLocaleDateString("pt-BR", {
            weekday: "long"
        });

        const dataFormatada = data.toLocaleDateString("pt-BR");

        const opcao = document.createElement("option");
        opcao.value = valor;
        opcao.textContent =
            `${diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)} — ${dataFormatada}`;

        campoData.appendChild(opcao);
    }

    // Obriga o cliente a escolher a data.
    campoData.value = "";

    if (campoData.options.length <= 1) {
        opcaoInicial.textContent = "Nenhuma data disponível";
    }
}

async function carregarBarbeiros() {
    const select = document.getElementById("barbeiro");

    if (!select) return;

    const { data, error } = await supabaseClient
        .from("barbeiros")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");

    if (error) {
        console.error("Erro ao carregar barbeiros:", error);
        select.innerHTML = '<option value="">Erro ao carregar barbeiros</option>';
        mostrarMensagem("Não foi possível carregar os barbeiros.", "erro");
        return;
    }

    barbeiros = data || [];
    select.innerHTML = '<option value="">Selecione o barbeiro</option>';

    barbeiros.forEach(barbeiro => {
        const option = document.createElement("option");
        option.value = barbeiro.id;
        option.textContent = barbeiro.nome;
        select.appendChild(option);
    });
}

async function carregarServicos() {
    if (!campoServico) return;

    const { data, error } = await supabaseClient
        .from("servicos")
        .select("id, nome, preco, duracao_minutos")
        .eq("ativo", true)
        .order("nome");

    if (error) {
        console.error("Erro ao carregar serviços:", error);
        campoServico.innerHTML = '<option value="">Erro ao carregar serviços</option>';
        mostrarMensagem("Não foi possível carregar os serviços.", "erro");
        return;
    }

    servicos = data || [];
    campoServico.innerHTML = '<option value="">Selecione o serviço</option>';

    servicos.forEach(servico => {
        const option = document.createElement("option");
        option.value = servico.nome;

        const preco = servico.preco == null
            ? "Consulte o valor"
            : Number(servico.preco).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
            });

        option.textContent = `${servico.nome} — ${preco}`;
        campoServico.appendChild(option);
    });
}

function obterBarbeiro() {
    const select = document.getElementById("barbeiro");

    return barbeiros.find(item => item.id === select?.value) || null;
}

function obterServico() {
    return servicos.find(item => item.nome === campoServico?.value) || null;
}

function formatarHorarioDigitado() {
    if (!campoHorario) return;

    let valor = campoHorario.value.replace(/\D/g, "").slice(0, 4);

    if (valor.length > 2) {
        valor = `${valor.slice(0, 2)}:${valor.slice(2)}`;
    }

    campoHorario.value = valor;
}

function paraMinutos(horario) {
    if (!/^\d{2}:\d{2}$/.test(horario)) return null;

    const [hora, minuto] = horario.split(":").map(Number);

    if (hora > 23 || minuto > 59) return null;

    return hora * 60 + minuto;
}

function horarioDentroDoExpediente(dataISO, inicio, duracao) {
    const [ano, mes, dia] = dataISO.split("-").map(Number);
    const diaSemana = new Date(ano, mes - 1, dia).getDay();
    const periodos = EXPEDIENTE[diaSemana] || [];
    const fim = inicio + duracao;

    return periodos.some(([abertura, fechamento]) => {
        return inicio >= paraMinutos(abertura) &&
            fim <= paraMinutos(fechamento);
    });
}

function horarioPassado(dataISO, horario) {
    const hoje = dataLocalISO();

    if (dataISO < hoje) return true;
    if (dataISO > hoje) return false;

    const agora = new Date();
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

    return paraMinutos(horario) <= minutosAgora;
}

function mostrarMensagemHorario(texto, tipo = "") {
    if (!mensagemHorarios) return;

    mensagemHorarios.textContent = texto;
    mensagemHorarios.classList.remove("erro", "sucesso");

    if (tipo) mensagemHorarios.classList.add(tipo);
}

function mostrarMensagem(texto, tipo = "") {
    if (!mensagemFormulario) return;

    mensagemFormulario.textContent = texto;
    mensagemFormulario.classList.remove("erro", "sucesso");

    if (tipo) mensagemFormulario.classList.add(tipo);
}

async function buscarIntervalosOcupados(dataISO, barbeiroId) {
    const { data, error } = await supabaseClient.rpc(
        "intervalos_ocupados",
        {
            p_data: dataISO,
            p_barbeiro_id: barbeiroId
        }
    );

    if (error) {
        console.error("Erro ao consultar horários:", error);
        throw new Error("Não foi possível consultar os horários ocupados.");
    }

    return data || [];
}

function intervaloConflita(inicio, duracao, intervalos) {
    const fim = inicio + duracao;

    return intervalos.some(item => {
        const inicioOcupado = paraMinutos(String(item.inicio).slice(0, 5));
        const fimOcupado = paraMinutos(String(item.fim).slice(0, 5));

        if (inicioOcupado === null || fimOcupado === null) return false;

        return inicio < fimOcupado && fim > inicioOcupado;
    });
}

async function verificarHorario() {
    const consulta = ++consultaAtual;

    if (campoHorarioSelecionado) {
        campoHorarioSelecionado.value = "";
    }

    const dataISO = campoData?.value;
    const horario = campoHorario?.value.trim();
    const barbeiro = obterBarbeiro();
    const servico = obterServico();

    if (!dataISO || !horario || !barbeiro || !servico) {
        mostrarMensagemHorario(
            "Escolha o barbeiro, o serviço, a data e digite o horário."
        );
        return false;
    }

    const inicio = paraMinutos(horario);
    const duracao = Number(servico.duracao_minutos);

    if (inicio === null) {
        mostrarMensagemHorario("Digite um horário válido, como 09:20.", "erro");
        return false;
    }

    if (!Number.isFinite(duracao) || duracao <= 0) {
        mostrarMensagemHorario("A duração do serviço é inválida.", "erro");
        return false;
    }

    if (horarioPassado(dataISO, horario)) {
        mostrarMensagemHorario("Esse horário já passou.", "erro");
        return false;
    }

    if (!horarioDentroDoExpediente(dataISO, inicio, duracao)) {
        mostrarMensagemHorario(
            "Esse horário está fora do expediente ou o serviço termina após o fechamento.",
            "erro"
        );
        return false;
    }

    mostrarMensagemHorario("Verificando disponibilidade...");

    try {
        const intervalos = await buscarIntervalosOcupados(dataISO, barbeiro.id);

        if (consulta !== consultaAtual) return false;

        if (intervaloConflita(inicio, duracao, intervalos)) {
            mostrarMensagemHorario(
                "Esse horário conflita com outro agendamento. Escolha outro.",
                "erro"
            );
            return false;
        }

        if (campoHorarioSelecionado) {
            campoHorarioSelecionado.value = horario;
        }

        mostrarMensagemHorario(
            "Horário aparentemente disponível. Você pode solicitar a reserva.",
            "sucesso"
        );

        return true;
    } catch (error) {
        if (consulta === consultaAtual) {
            mostrarMensagemHorario(error.message, "erro");
        }

        return false;
    }
}

function formatarDataBrasileira(dataISO) {
    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
}

async function enviarAgendamento(event) {
    event.preventDefault();
    mostrarMensagem("");

    const nome = campoNome?.value.trim() || "";
    const telefone = campoTelefone?.value.trim() || "";
    const servico = obterServico();
    const barbeiro = obterBarbeiro();
    const dataISO = campoData?.value || "";
    const horario = campoHorario?.value.trim() || "";

    if (!nome || !telefone || !servico || !barbeiro || !dataISO || !horario) {
        mostrarMensagem(
            "Preencha seu nome, telefone, barbeiro, serviço, data e horário.",
            "erro"
        );
        return;
    }

    if (botaoAgendar) {
        botaoAgendar.disabled = true;
        botaoAgendar.textContent = "Reservando...";
    }

    try {
        const valido = await verificarHorario();

        if (!valido) {
            mostrarMensagem("Confira os dados e o horário informado.", "erro");
            return;
        }

        const { data, error } = await supabaseClient.rpc(
            "criar_agendamento_seguro",
            {
                p_nome: nome,
                p_telefone: telefone,
                p_servico: servico.nome,
                p_data: dataISO,
                p_horario: horario,
                p_barbeiro_id: barbeiro.id
            }
        );

        if (error) {
            console.error("Erro ao criar agendamento:", error);

            if (
                error.code === "23P01" ||
                /sobreposi|ocupado|exclusion/i.test(error.message || "")
            ) {
                mostrarMensagem(
                    "Esse horário acabou de ser ocupado. Escolha outro.",
                    "erro"
                );
            } else {
                mostrarMensagem(
                    "Não foi possível concluir a reserva. Tente novamente.",
                    "erro"
                );
            }

            return;
        }

        const reserva = Array.isArray(data) ? data[0] : data;

        if (!reserva?.id || !reserva?.token_cancelamento) {
            console.error("Resposta inesperada do Supabase:", data);
            mostrarMensagem(
                "Não foi possível confirmar os dados retornados da reserva. Verifique o Supabase antes de tentar novamente.",
                "erro"
            );
            return;
        }

        // Monta a mensagem de confirmação do WhatsApp.
        const dataObjeto = new Date(`${dataISO}T12:00:00`);

        const diaSemana = dataObjeto.toLocaleDateString("pt-BR", {
            weekday: "long"
        });

        const dataCompleta = formatarDataBrasileira(dataISO);
        const horarioFormatado =
            `${horario.slice(0, 2)}h${horario.slice(3, 5)}`;

        const linkCancelamento =
            `https://matiasgomes.vercel.app/cancelar.html?token=${reserva.token_cancelamento}`;

        const mensagemWhatsApp = [
            "✂️ *NOVO AGENDAMENTO*",
            "",
            "Olá! Tudo bem? Gostaria de confirmar meu agendamento.",
            "",
            "📋 *DETALHES DO ATENDIMENTO*",
            "",
            `👤 *Nome:* ${nome}`,
            `✂️ *Serviço:* ${servico.nome}`,
            `📅 *Data:* ${diaSemana}`,
            `🗓️ *Data completa:* ${dataCompleta}`,
            `🕒 *Horário:* ${horarioFormatado}`,
            "",
            "Estou entrando em contato para confirmar meu horário. Obrigado!",
            "",
            "━━━━━━━━━━━━━━",
            "",
            "⚠️ *PRECISA CANCELAR?*",
            "",
            "Se você não puder comparecer, acesse o link abaixo para cancelar seu agendamento e liberar o horário para outra pessoa.",
            "",
            "🔗 *Cancelar meu agendamento:*",
            linkCancelamento,
            "",
            "Agradecemos pela compreensão! 💈"
        ].join("\n");

        const linkWhatsApp =
            `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagemWhatsApp)}`;

        mostrarMensagem(
            "Agendamento registrado! Abrindo o WhatsApp para confirmação.",
            "sucesso"
        );

        window.open(linkWhatsApp, "_blank", "noopener,noreferrer");

        form.reset();

        // Repopula as datas depois de limpar o formulário.
        definirDatasDisponiveis();

        if (campoHorarioSelecionado) {
            campoHorarioSelecionado.value = "";
        }

        mostrarMensagemHorario(
            "Reserva registrada. Para outro agendamento, informe novos dados."
        );
    } catch (error) {
        console.error("Erro inesperado:", error);
        mostrarMensagem(
            error.message || "Ocorreu um erro inesperado. Tente novamente.",
            "erro"
        );
    } finally {
        if (botaoAgendar) {
            botaoAgendar.disabled = false;
            botaoAgendar.textContent = "Agendar horário";
        }
    }
}
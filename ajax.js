const cidadeInput = document.querySelector("#cidadeInput");
const btnBuscar = document.querySelector("#btnBuscar");
const statusMensagem = document.querySelector("#statusMensagem");
const resultadoClima = document.querySelector("#resultadoClima");
const listaSugestoes = document.querySelector("#listaSugestoes");
const sugestoesProximas = document.querySelector("#sugestoesProximas");
const abas = document.querySelectorAll(".aba");
const abasConteudo = document.querySelectorAll(".aba-conteudo");

const DESCRICAO_TEMPO = {
    0: "Céu limpo e sol",
    1: "Sol com poucas nuvens",
    2: "Parcialmente nublado",
    3: "Tempo nublado",
    45: "Nevoeiro",
    48: "Nevoeiro intenso",
    51: "Garoa leve",
    53: "Garoa moderada",
    55: "Garoa forte",
    61: "Chuva leve",
    63: "Chuva moderada",
    65: "Chuva forte",
    66: "Chuva congelante leve",
    67: "Chuva congelante forte",
    71: "Neve leve",
    73: "Neve moderada",
    75: "Neve forte",
    77: "Grãos de neve",
    80: "Pancadas de chuva leves",
    81: "Pancadas de chuva moderadas",
    82: "Chuva forte com pancadas",
    85: "Pancadas de neve leves",
    86: "Pancadas de neve fortes",
    95: "Trovoada",
    96: "Trovoada com granizo",
    99: "Temporal forte"
};

// tokenBusca incrementa a cada nova busca; callbacks antigos são ignorados.
// requisicaoAtual guarda o XHR em andamento para poder ser abortado.
let tokenBusca = 0;
let requisicaoAtual = null;

function definirMensagem(mensagem, tipo = "info") {
    if (!statusMensagem) return;
    statusMensagem.textContent = mensagem;
    statusMensagem.classList.remove("sucesso", "erro");
    if (tipo === "erro") statusMensagem.classList.add("erro");
    if (tipo === "sucesso") statusMensagem.classList.add("sucesso");
}

function desabilitarBotao() {
    if (!btnBuscar) return;
    btnBuscar.disabled = true;
    btnBuscar.textContent = "Buscando...";
}

function reabilitarBotao() {
    if (!btnBuscar) return;
    btnBuscar.disabled = false;
    btnBuscar.textContent = "Pesquisar";
}

function exibirAba(abaId) {
    abas.forEach((botao) => {
        const ativa = botao.dataset.aba === abaId;
        botao.classList.toggle("active", ativa);
        botao.setAttribute("aria-selected", ativa ? "true" : "false");
    });

    abasConteudo.forEach((painel) => {
        const esperado = `painel${abaId.charAt(0).toUpperCase()}${abaId.slice(1)}`;
        const ativa = painel.id === esperado;
        painel.classList.toggle("active", ativa);
        painel.hidden = !ativa;
    });
}
function requisicaoAjax(url, onSucesso, onErro, timeoutMs = 10000) {
    const xhr = new XMLHttpRequest();
    let finalizado = false;

    const falhar = (msg) => {
        if (finalizado) return;
        finalizado = true;
        onErro(msg);
    };

    xhr.open("GET", url, true);
    xhr.timeout = timeoutMs;

    xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4 || finalizado) return;

        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                const dados = JSON.parse(xhr.responseText);
                finalizado = true;
                onSucesso(dados);
            } catch (e) {
                falhar("Erro ao ler os dados recebidos.");
            }
        } else if (xhr.status !== 0) {
            // status 0 é tratado em onerror/ontimeout/onabort (evita duplicidade)
            falhar("Não foi possível conectar ao serviço de previsão do tempo.");
        }
    };

    xhr.ontimeout = () => falhar("O serviço demorou demais para responder.");
    xhr.onerror   = () => falhar("Sem conexão com a internet. Verifique sua rede.");
    xhr.onabort   = () => { finalizado = true; };

    xhr.send();
    return xhr;
}

function carregarSugestoesProximas(nomeLocal) {
    if (!sugestoesProximas || !listaSugestoes) return;

    if (!nomeLocal) {
        sugestoesProximas.hidden = true;
        listaSugestoes.innerHTML = "";
        return;
    }

    const urlGeo = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nomeLocal)}&count=5&language=pt&format=json`;

    requisicaoAjax(
        urlGeo,
        function (dadosGeo) {
            const resultados = dadosGeo.results || [];

            if (!resultados.length) {
                sugestoesProximas.hidden = true;
                listaSugestoes.innerHTML = "";
                return;
            }

            listaSugestoes.innerHTML = "";
            resultados.forEach(function (item) {
                const botao = document.createElement("button");
                botao.type = "button";
                botao.className = "botao-sugestao";
                botao.textContent = [item.name, item.admin1, item.country]
                    .filter(Boolean)
                    .join(" - ");

                botao.addEventListener("click", function () {
                    if (cidadeInput) cidadeInput.value = item.name;

                    const tokenAtual = ++tokenBusca;

                    if (requisicaoAtual) {
                        try { requisicaoAtual.abort(); } catch (_) {}
                        requisicaoAtual = null;
                    }

                    desabilitarBotao();
                    definirMensagem(`Buscando previsão do tempo para ${item.name}...`);
                    if (resultadoClima) resultadoClima.hidden = true;

                    buscarPrevisaoPorCoordenadas(item, tokenAtual);
                });

                listaSugestoes.appendChild(botao);
            });

            sugestoesProximas.hidden = false;
        },
        function () {
            sugestoesProximas.hidden = true;
            listaSugestoes.innerHTML = "";
        }
    );
}

function consultarClima(nomeCidade) {
    const cidade = (nomeCidade || (cidadeInput ? cidadeInput.value : "")).trim();

    if (!cidade) {
        definirMensagem("Por favor, digite o nome de uma cidade, bairro ou região.", "erro");
        if (resultadoClima) resultadoClima.hidden = true;
        if (cidadeInput) cidadeInput.focus();
        return;
    }

    if (cidadeInput) cidadeInput.value = cidade;
    definirMensagem(`Buscando previsão do tempo para ${cidade}...`);
    if (resultadoClima) resultadoClima.hidden = true;
    const tokenAtual = ++tokenBusca;
    if (requisicaoAtual) {
        try { requisicaoAtual.abort(); } catch (_) {}
        requisicaoAtual = null;
    }
    desabilitarBotao();

    const urlGeo = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=1&language=pt&format=json`;

    requisicaoAtual = requisicaoAjax(
        urlGeo,
        function (dadosGeo) {
            if (tokenAtual !== tokenBusca) return; // resposta obsoleta

            if (!dadosGeo.results || dadosGeo.results.length === 0) {
                reabilitarBotao();
                definirMensagem(`Local "${cidade}" não encontrado. Tente escrever com mais detalhes.`, "erro");
                return;
            }

            const local = dadosGeo.results[0];
            carregarSugestoesProximas(local.name);
            buscarPrevisaoPorCoordenadas(local, tokenAtual);
        },
        function (mensagemErro) {
            if (tokenAtual !== tokenBusca) return;
            reabilitarBotao();
            definirMensagem(mensagemErro, "erro");
        }
    );
}

function buscarPrevisaoPorCoordenadas(local, tokenAtual) {
    const urlClima = `https://api.open-meteo.com/v1/forecast?latitude=${local.latitude}&longitude=${local.longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=6`;

    requisicaoAtual = requisicaoAjax(
        urlClima,
        function (dadosClima) {
            if (tokenAtual !== tokenBusca) return;
            reabilitarBotao();
            definirMensagem("", "info");
            exibirResultado(local, dadosClima);
        },
        function (mensagemErro) {
            if (tokenAtual !== tokenBusca) return;
            reabilitarBotao();
            definirMensagem(mensagemErro, "erro");
        }
    );
}

function formatarDiaSemana(dataIso) {
    const data = new Date(dataIso + "T12:00:00");
    return data.toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit"
    });
}

function obterHorarioChuva(horarioDados, horaAtualIso) {
    if (!horarioDados?.time || !horarioDados?.precipitation_probability) {
        return "Sem previsão de chuva para hoje";
    }

    const horas = horarioDados.time;
    const chances = horarioDados.precipitation_probability;

    const prefixoHoraAtual = horaAtualIso.slice(0, 13);
    const indiceInicio = horas.findIndex(h => h.startsWith(prefixoHoraAtual));

    // Se a hora atual não estiver no array, é mais honesto não mostrar do que mostrar errado.
    if (indiceInicio === -1) return "Sem previsão de chuva para hoje";

    const limite = Math.min(indiceInicio + 24, horas.length);
    for (let i = indiceInicio; i < limite; i++) {
        if (chances[i] >= 40) {
            const partes = horas[i].split("T");
            if (partes[1]) return `Por volta das ${partes[1]}`;
        }
    }

    return "Sem chuva prevista nas próximas horas";
}

function exibirResultado(local, dados) {
    const atual = dados.current;
    const diario = dados.daily;

    const elNomeCidade = document.querySelector("#nomeCidade");
    const elEstadoPais = document.querySelector("#estadoPais");
    const elTempAtual = document.querySelector("#temperaturaAtual");
    const elDescClima = document.querySelector("#descricaoClima");
    const elSensacao = document.querySelector("#sensacaoTermica");
    const elMinMax = document.querySelector("#minMaxHoje");
    const elChanceChuva = document.querySelector("#chanceChuva");
    const elVento = document.querySelector("#velocidadeVento");
    const listaDias = document.querySelector("#listaDias");

    if (elNomeCidade) elNomeCidade.textContent = local.name;
    if (elEstadoPais) elEstadoPais.textContent = [local.admin1, local.country].filter(Boolean).join(" - ");

    if (elTempAtual) elTempAtual.textContent = `${Math.round(atual.temperature_2m)}°C`;
    if (elDescClima) elDescClima.textContent = DESCRICAO_TEMPO[atual.weather_code] || "Clima variável";

    if (elSensacao) elSensacao.textContent = `${Math.round(atual.apparent_temperature)}°C`;
    if (elMinMax) elMinMax.textContent = `${Math.round(diario.temperature_2m_min[0])}° / ${Math.round(diario.temperature_2m_max[0])}°`;

    const chanceMax = diario.precipitation_probability_max[0] ?? 0;
    const horarioChuvaTexto = chanceMax > 0 ? obterHorarioChuva(dados.hourly, atual.time) : "Sem chuva";
    if (elChanceChuva) {
        elChanceChuva.innerHTML = `${chanceMax}% <br><span style="font-size: 12px; font-weight: normal; color: #555;">${horarioChuvaTexto}</span>`;
    }

    if (elVento) elVento.textContent = `${Math.round(atual.wind_speed_10m)} km/h`;

    if (listaDias && diario?.time) {
        const diasHtml = diario.time.slice(1, 6).map((_, idx) => {
            const i = idx + 1;
            if (i >= diario.time.length) return "";

            const diaTexto = formatarDiaSemana(diario.time[i]);
            const condicao = DESCRICAO_TEMPO[diario.weather_code[i]] || "Variável";
            const min = Math.round(diario.temperature_2m_min[i]);
            const max = Math.round(diario.temperature_2m_max[i]);

            return `
                <div class="cartao-dia">
                    <div class="dia-nome">${diaTexto}</div>
                    <div class="dia-clima">${condicao}</div>
                    <div class="dia-temps">${min}° / ${max}°</div>
                </div>`;
        }).join("");

        listaDias.innerHTML = diasHtml;
    }

    if (resultadoClima) resultadoClima.hidden = false;
}

if (btnBuscar) {
    btnBuscar.addEventListener("click", function () {
        consultarClima();
    });
}

if (cidadeInput) {
    cidadeInput.addEventListener("keydown", function (evento) {
        if (evento.key === "Enter") {
            consultarClima();
        }
    });
}

document.querySelectorAll(".btn-atalho").forEach(function (botao) {
    botao.addEventListener("click", function () {
        consultarClima(botao.dataset.cidade);
    });
});

abas.forEach(function (botao) {
    botao.addEventListener("click", function () {
        exibirAba(botao.dataset.aba);
    });
});

if (!cidadeInput || !cidadeInput.value.trim()) {
    consultarClima("São Paulo");
} else {
    consultarClima(cidadeInput.value);
}
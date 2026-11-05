/**
* @file script.js
* @description Lógica do site "Clima por CEP" em JavaScript puro (Vanilla JS).
* Consulta 3 APIs públicas e gratuitas sem necessidade de chaves de API:
*  1. ViaCEP (converte CEP em Cidade e Estado)
*  2. Open-Meteo Geocoding (converte Cidade e Estado em Latitude e Longitude)
*  3. Open-Meteo Forecast (obtém clima atual e previsão de 5 dias)
* 
* Organizado em funções modulares:
*  - buscarCep(cep)
*  - buscarCoordenadas(cidade, uf)
*  - buscarPrevisao(latitude, longitude)
*  - mostrarResultado(dados)
*/
"use strict";
/* ==========================================================================
1. Dicionário de Códigos de Tempo (WMO Weather Codes)
Mapeia o código numérico retornado pela Open-Meteo para emoji e texto em PT-BR
========================================================================== */
const DICIONARIO_TEMPO = {
	0: {
		emoji: "☀️",
		texto: "Céu limpo"
	},
	1: {
		emoji: "🌤️",
		texto: "Predominantemente limpo"
	},
	2: {
		emoji: "⛅",
		texto: "Parcialmente nublado"
	},
	3: {
		emoji: "☁️",
		texto: "Encoberto / Nublado"
	},
	45: {
		emoji: "🌫️",
		texto: "Nevoeiro"
	},
	48: {
		emoji: "🌫️❄️",
		texto: "Nevoeiro com geada"
	},
	51: {
		emoji: "🌦️",
		texto: "Garoa leve"
	},
	53: {
		emoji: "🌧️",
		texto: "Garoa moderada"
	},
	55: {
		emoji: "🌧️",
		texto: "Garoa densa"
	},
	56: {
		emoji: "🌨️",
		texto: "Garoa congelante leve"
	},
	57: {
		emoji: "🌨️",
		texto: "Garoa congelante densa"
	},
	61: {
		emoji: "🌦️",
		texto: "Chuva fraca"
	},
	63: {
		emoji: "🌧️",
		texto: "Chuva moderada"
	},
	65: {
		emoji: "🌧️🌧️",
		texto: "Chuva forte"
	},
	66: {
		emoji: "🌨️",
		texto: "Chuva congelante leve"
	},
	67: {
		emoji: "🌨️",
		texto: "Chuva congelante forte"
	},
	71: {
		emoji: "🌨️",
		texto: "Queda de neve leve"
	},
	73: {
		emoji: "🌨️",
		texto: "Queda de neve moderada"
	},
	75: {
		emoji: "❄️",
		texto: "Neve intensa"
	},
	77: {
		emoji: "❄️",
		texto: "Grãos de neve"
	},
	80: {
		emoji: "🌦️",
		texto: "Pancadas de chuva leve"
	},
	81: {
		emoji: "🌧️",
		texto: "Pancadas de chuva moderada"
	},
	82: {
		emoji: "⛈️",
		texto: "Pancadas de chuva violenta"
	},
	85: {
		emoji: "🌨️",
		texto: "Pancadas de neve leve"
	},
	86: {
		emoji: "❄️",
		texto: "Pancadas de neve forte"
	},
	95: {
		emoji: "⛈️",
		texto: "Tempestade com trovoadas"
	},
	96: {
		emoji: "⛈️🧊",
		texto: "Tempestade com granizo leve"
	},
	99: {
		emoji: "⛈️🧊",
		texto: "Tempestade com granizo forte"
	}
};
/**
* Retorna as informações visuais (emoji e texto em português) para um código de tempo
* @param {number} codigo - Código WMO da Open-Meteo
* @returns {{ emoji: string, texto: string }}
*/
function interpretarCodigoTempo(codigo) {
	if (codigo !== undefined && DICIONARIO_TEMPO[codigo]) {
		return DICIONARIO_TEMPO[codigo];
	}
	return {
		emoji: "🌡️",
		texto: "Tempo variável"
	};
}
/* ==========================================================================
2. Elementos do DOM (Cache de referências)
========================================================================== */
const formCep = document.getElementById("form-cep");
const inputCep = document.getElementById("cep-input");
const btnBuscar = document.getElementById("btn-buscar");
const btnLimpar = document.getElementById("btn-limpar");
const btnTema = document.getElementById("btn-tema");
const statusContainer = document.getElementById("status-container");
const statusTexto = document.getElementById("status-texto");
const erroContainer = document.getElementById("erro-container");
const erroMensagem = document.getElementById("erro-mensagem");
const resultadoContainer = document.getElementById("resultado-container");
// Elementos de exibição da Localização
const elCidadeUf = document.getElementById("res-cidade-uf");
const elEndereco = document.getElementById("res-endereco");
const elBadgeCep = document.getElementById("badge-cep");
const elBadgeRegiao = document.getElementById("badge-regiao");
const elBadgeDdd = document.getElementById("badge-ddd");
const elBadgeCoords = document.getElementById("badge-coords");
// Elementos do Tempo Atual
const elEmojiAtual = document.getElementById("res-emoji-atual");
const elTempAtual = document.getElementById("res-temp-atual");
const elDescAtual = document.getElementById("res-desc-atual");
const elSensacao = document.getElementById("res-sensacao");
const elUmidade = document.getElementById("res-umidade");
const elVento = document.getElementById("res-vento");
const elHoraMedicao = document.getElementById("res-hora-medicao");
// Grid dos 5 Dias de Previsão
const elForecastGrid = document.getElementById("forecast-grid");
// Painel interativo da seção "Como Funciona"
const elInspectContent = document.getElementById("inspect-live-content");
// Variável para armazenar o último resultado obtido (para downloads ou inspeção)
let ultimoResultadoGlobal = null;
/* ==========================================================================
3. Passo 1: Consulta à API ViaCEP
========================================================================== */
/**
* Consulta a API ViaCEP para obter o endereço, cidade e UF a partir do CEP.
* Possui fallback automático para a BrasilAPI caso o ViaCEP esteja instável ou retorne erro.
* @param {string} cep - CEP digitado pelo usuário (com ou sem máscara)
* @returns {Promise<Object>} Dados do endereço retornados pelo ViaCEP ou BrasilAPI
*/
async function buscarCep(cep) {
	// Limpa caracteres não numéricos
	const cepLimpo = (cep || "").replace(/\D/g, "");
	// Validação preliminar: o CEP brasileiro precisa ter exatamente 8 dígitos
	if (cepLimpo.length !== 8) {
		throw new Error("CEP inválido. O CEP brasileiro deve conter exatamente 8 números (ex: 01001-000 ou 01001000).");
	}
	// Se o usuário digitou CEP composto apenas pelo mesmo dígito repetido (ex: 00000000)
	if (/^(\d)\1{7}$/.test(cepLimpo)) {
		throw new Error("CEP não encontrado. Por favor, digite um CEP válido (ex: 01001-000).");
	}
	const urlViaCep = `https://viacep.com.br/ws/${cepLimpo}/json/`;
	try {
		const resposta = await fetch(urlViaCep);
		if (resposta.ok) {
			const dados = await resposta.json();
			// Se o ViaCEP encontrou com sucesso
			if (!dados.erro && dados.localidade) {
				return {
					cepOriginal: cepLimpo,
					cepFormatado: dados.cep || `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}`,
					cidade: dados.localidade,
					uf: dados.uf,
					estadoNome: dados.estado || dados.uf,
					bairro: dados.bairro || "",
					logradouro: dados.logradouro || "",
					regiao: dados.regiao || "",
					ddd: dados.ddd || "",
					urlChamada: urlViaCep,
					servico: "ViaCEP"
				};
			}
		}
	} catch (errViaCep) {}
	// Fallback para a BrasilAPI caso o ViaCEP não encontre o CEP ou esteja oscilando
	try {
		const urlBrasilApi = `https://brasilapi.com.br/api/cep/v1/${cepLimpo}`;
		const respBrasil = await fetch(urlBrasilApi);
		if (respBrasil.ok) {
			const dadosBrasil = await respBrasil.json();
			if (dadosBrasil.city && dadosBrasil.state) {
				return {
					cepOriginal: cepLimpo,
					cepFormatado: `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}`,
					cidade: dadosBrasil.city,
					uf: dadosBrasil.state,
					estadoNome: dadosBrasil.state,
					bairro: dadosBrasil.neighborhood || "",
					logradouro: dadosBrasil.street || "",
					regiao: "",
					ddd: "",
					urlChamada: urlBrasilApi,
					servico: "BrasilAPI"
				};
			}
		}
	} catch (errBrasil) {}
	throw new Error("CEP não encontrado. Verifique se o número digitado está correto e tente novamente.");
}
/* ==========================================================================
4. Passo 2: Consulta à API de Geocodificação Open-Meteo
========================================================================== */
/**
* Converte o nome da cidade e estado em Latitude e Longitude usando a Open-Meteo Geocoding API.
* @param {string} cidade - Nome da cidade (ex: "São Paulo")
* @param {string} uf - Sigla do estado (ex: "SP")
* @returns {Promise<Object>} Coordenadas e fuso horário
*/
async function buscarCoordenadas(cidade, uf) {
	const nomeCodificado = encodeURIComponent(cidade);
	const url = `https://geocoding-api.open-meteo.com/v1/search?name=${nomeCodificado}&count=10&language=pt&countryCode=BR`;
	try {
		let resposta = await fetch(url);
		let dados = resposta.ok ? await resposta.json() : null;
		// Fallback: se não encontrar com o nome original, tenta sem acentos
		if (!dados || !dados.results || dados.results.length === 0) {
			const nomeSemAcentos = cidade.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
			if (nomeSemAcentos !== cidade) {
				const urlSemAcentos = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nomeSemAcentos)}&count=10&language=pt&countryCode=BR`;
				resposta = await fetch(urlSemAcentos);
				if (resposta.ok) {
					dados = await resposta.json();
				}
			}
		}
		if (!dados || !dados.results || dados.results.length === 0) {
			throw new Error(`Não foram encontradas coordenadas geográficas para a cidade "${cidade}".`);
		}
		// Busca o resultado que melhor corresponda ao estado (UF) se houver múltiplas cidades com o mesmo nome
		let resultadoEscolhido = dados.results[0];
		// Se houver mais de um resultado no Brasil, tenta casar com o estado/admin1
		if (dados.results.length > 1 && uf) {
			const matchEstado = dados.results.find((item) => {
				const admin = (item.admin1 || "").toLowerCase();
				return admin.includes(uf.toLowerCase()) || item.postcodes?.some((pc) => pc.startsWith(uf));
			});
			if (matchEstado) {
				resultadoEscolhido = matchEstado;
			}
		}
		return {
			latitude: resultadoEscolhido.latitude,
			longitude: resultadoEscolhido.longitude,
			nomeEncontrado: resultadoEscolhido.name,
			estadoEncontrado: resultadoEscolhido.admin1 || uf,
			timezone: resultadoEscolhido.timezone || "America/Sao_Paulo",
			urlChamada: url
		};
	} catch (erro) {
		if (erro.message && erro.message.includes("Failed to fetch")) {
			throw new Error("Falha ao conectar com o serviço de coordenadas geográficas. Verifique sua conexão.");
		}
		throw erro;
	}
}
/* ==========================================================================
5. Passo 3: Consulta à API de Previsão do Tempo Open-Meteo
========================================================================== */
/**
* Consulta a previsão do tempo detalhada com latitude e longitude na Open-Meteo.
* @param {number} latitude
* @param {number} longitude
* @returns {Promise<Object>} Dados do clima atual e próximos 5 dias
*/
async function buscarPrevisao(latitude, longitude) {
	const params = new URLSearchParams({
		latitude: latitude.toString(),
		longitude: longitude.toString(),
		current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code",
		daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
		timezone: "auto"
	});
	const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
	try {
		const resposta = await fetch(url);
		if (!resposta.ok) {
			throw new Error(`Erro ao obter a previsão do tempo na Open-Meteo (Status ${resposta.status}).`);
		}
		const dados = await resposta.json();
		if (!dados.current || !dados.daily) {
			throw new Error("Os dados meteorológicos recebidos estão incompletos. Tente novamente.");
		}
		return {
			dados,
			urlChamada: url
		};
	} catch (erro) {
		if (erro.message && erro.message.includes("Failed to fetch")) {
			throw new Error("Falha ao conectar com o serviço meteorológico. Verifique sua conexão de internet.");
		}
		throw erro;
	}
}
/* ==========================================================================
6. Função de Renderização: mostrarResultado(dados)
========================================================================== */
/**
* Atualiza todos os elementos visuais na tela com as informações coletadas.
* @param {Object} pacoteCompleto - Objeto com { endereco, coordenadas, previsao }
*/
function mostrarResultado(pacoteCompleto) {
	const { endereco, coordenadas, previsao } = pacoteCompleto;
	const { current, daily } = previsao.dados;
	// 1. Preenche o Cartão de Localização
	elCidadeUf.textContent = `${endereco.cidade} - ${endereco.uf}`;
	const partesEndereco = [];
	if (endereco.logradouro) partesEndereco.push(endereco.logradouro);
	if (endereco.bairro) partesEndereco.push(`Bairro ${endereco.bairro}`);
	elEndereco.textContent = partesEndereco.length > 0 ? partesEndereco.join(", ") : "Localidade identificada pelos Correios";
	elBadgeCep.textContent = `CEP: ${endereco.cepFormatado}`;
	elBadgeRegiao.textContent = endereco.regiao ? `Região: ${endereco.regiao}` : `UF: ${endereco.uf}`;
	elBadgeDdd.textContent = endereco.ddd ? `DDD: (${endereco.ddd})` : "Brasil";
	elBadgeCoords.textContent = `Lat: ${coordenadas.latitude.toFixed(2)} | Lon: ${coordenadas.longitude.toFixed(2)}`;
	// 2. Preenche o Cartão de Tempo Atual (Tempo Agora)
	const infoTempoAtual = interpretarCodigoTempo(current.weather_code);
	elEmojiAtual.textContent = infoTempoAtual.emoji;
	elDescAtual.textContent = infoTempoAtual.texto;
	elTempAtual.textContent = `${Math.round(current.temperature_2m)}°C`;
	elSensacao.textContent = `${Math.round(current.apparent_temperature)}°C`;
	elUmidade.textContent = `${current.relative_humidity_2m}%`;
	elVento.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
	// Horário local da medição
	const agora = new Date();
	const horaFormatada = agora.toLocaleTimeString("pt-BR", {
		hour: "2-digit",
		minute: "2-digit"
	});
	elHoraMedicao.textContent = `Medição atual (${horaFormatada})`;
	// 3. Preenche a Previsão dos Próximos 5 Dias
	elForecastGrid.innerHTML = "";
	// Obtemos até 5 dias a partir de hoje
	const totalDias = Math.min(5, daily.time.length);
	for (let i = 0; i < totalDias; i++) {
		const dataStr = daily.time[i];
		// Adiciona hora para evitar problemas de fuso horário ao criar o objeto Date
		const dataObj = new Date(`${dataStr}T12:00:00`);
		// Nomes dos dias da semana em português
		let nomeDiaSemana = dataObj.toLocaleDateString("pt-BR", { weekday: "short" });
		nomeDiaSemana = nomeDiaSemana.replace(".", "").toUpperCase();
		// Se for o primeiro dia (hoje)
		if (i === 0) {
			nomeDiaSemana = "HOJE";
		} else if (i === 1) {
			nomeDiaSemana = "AMANHÃ";
		}
		const dataFormatada = dataObj.toLocaleDateString("pt-BR", {
			day: "2-digit",
			month: "2-digit"
		});
		const codigoClimaDia = daily.weather_code[i];
		const infoDia = interpretarCodigoTempo(codigoClimaDia);
		const tempMax = Math.round(daily.temperature_2m_max[i]);
		const tempMin = Math.round(daily.temperature_2m_min[i]);
		const chanceChuva = daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : 0;
		// Cria o card do dia
		const cardDia = document.createElement("article");
		cardDia.className = "forecast-day-card";
		cardDia.setAttribute("aria-label", `Previsão para ${nomeDiaSemana}, ${dataFormatada}: ${infoDia.texto}, máxima de ${tempMax} graus, mínima de ${tempMin} graus, ${chanceChuva}% de chance de chuva.`);
		cardDia.innerHTML = `
      <div class="forecast-weekday">${nomeDiaSemana}</div>
      <div class="forecast-date">${dataFormatada}</div>
      <div class="forecast-emoji" aria-hidden="true">${infoDia.emoji}</div>
      <div class="forecast-desc">${infoDia.texto}</div>
      <div class="forecast-temps">
        <span class="temp-max" title="Temperatura máxima">${tempMax}°</span>
        <span style="color: var(--text-soft);" aria-hidden="true">/</span>
        <span class="temp-min" title="Temperatura mínima">${tempMin}°</span>
      </div>
      <div class="forecast-rain" title="Probabilidade de chuva">
        <span aria-hidden="true">💧</span>
        <span>${chanceChuva}%</span>
      </div>
    `;
		elForecastGrid.appendChild(cardDia);
	}
	// 4. Atualiza a caixa de inspeção interativa da seção "Como Funciona"
	atualizarInspecaoAoVivo(pacoteCompleto);
	// Garante que a caixa de erro esteja escondida e limpa no sucesso
	esconderErro();
	// Exibe a área de resultados com efeito suave
	if (resultadoContainer) {
		resultadoContainer.hidden = false;
		resultadoContainer.classList.remove("oculto");
		resultadoContainer.scrollIntoView({
			behavior: "smooth",
			block: "nearest"
		});
	}
}
/**
* Atualiza o painel de inspeção na seção "Como Funciona", mostrando os dados reais
* da última consulta realizada.
*/
function atualizarInspecaoAoVivo(dados) {
	if (!elInspectContent) return;
	const resumo = {
		passo1_viaCep: {
			requisicao: dados.endereco.urlChamada,
			retorno: {
				cep: dados.endereco.cepFormatado,
				cidade: dados.endereco.cidade,
				uf: dados.endereco.uf,
				bairro: dados.endereco.bairro || "(não informado)"
			}
		},
		passo2_geocodificacao: {
			requisicao: dados.coordenadas.urlChamada,
			retorno: {
				latitude: dados.coordenadas.latitude,
				longitude: dados.coordenadas.longitude,
				fuso_horario: dados.coordenadas.timezone
			}
		},
		passo3_previsaoMeteo: {
			requisicao: dados.previsao.urlChamada,
			retornoResumido: {
				temperatura_atual: `${dados.previsao.dados.current.temperature_2m}°C`,
				sensacao: `${dados.previsao.dados.current.apparent_temperature}°C`,
				umidade: `${dados.previsao.dados.current.relative_humidity_2m}%`,
				vento: `${dados.previsao.dados.current.wind_speed_10m} km/h`,
				codigo_tempo: dados.previsao.dados.current.weather_code,
				dias_previsao: dados.previsao.dados.daily.time.length
			}
		}
	};
	elInspectContent.textContent = JSON.stringify(resumo, null, 2);
}
/* ==========================================================================
7. Fluxo Principal de Busca
========================================================================== */
/**
* Orquestra as 3 consultas de forma sequencial com async/await e try/catch
* @param {string} cep
*/
async function executarBusca(cep) {
	// 1. Limpa e esconde erros anteriores e esconde resultados anteriores
	esconderErro();
	if (resultadoContainer) {
		resultadoContainer.hidden = true;
		resultadoContainer.classList.add("oculto");
	}
	definirCarregando(true);
	try {
		// 1. Etapa 1: ViaCEP
		atualizarMensagemCarregando("1/3 - Consultando CEP no ViaCEP...", 1);
		const endereco = await buscarCep(cep);
		// 2. Etapa 2: Open-Meteo Geocoding
		atualizarMensagemCarregando(`2/3 - Buscando coordenadas de ${endereco.cidade} (${endereco.uf})...`, 2);
		const coordenadas = await buscarCoordenadas(endereco.cidade, endereco.uf);
		// 3. Etapa 3: Open-Meteo Forecast
		atualizarMensagemCarregando(`3/3 - Baixando previsão do tempo e próximos 5 dias...`, 3);
		const previsao = await buscarPrevisao(coordenadas.latitude, coordenadas.longitude);
		// Salva o pacote completo e mostra o resultado
		ultimoResultadoGlobal = {
			endereco,
			coordenadas,
			previsao,
			timestamp: new Date().toISOString()
		};
		mostrarResultado(ultimoResultadoGlobal);
	} catch (erro) {
		console.warn("Consulta de clima não concluída:", erro.message || erro);
		mostrarErro(erro.message || "Ocorreu um erro ao consultar o clima.");
	} finally {
		definirCarregando(false);
	}
}
/* ==========================================================================
8. Funções de Auxílio de Interface (Feedback, Loading, Erro)
========================================================================== */
function definirCarregando(ativo) {
	if (!statusContainer || !btnBuscar) return;
	if (ativo) {
		statusContainer.hidden = false;
		statusContainer.classList.remove("oculto");
		btnBuscar.disabled = true;
		btnBuscar.innerHTML = "<span class=\"spinner\" style=\"width:18px;height:18px;border-width:2px;margin:0;\" aria-hidden=\"true\"></span> Buscando...";
	} else {
		statusContainer.hidden = true;
		statusContainer.classList.add("oculto");
		btnBuscar.disabled = false;
		btnBuscar.innerHTML = "<span aria-hidden=\"true\">🔍</span> Buscar Clima";
	}
}
function atualizarMensagemCarregando(texto, etapa) {
	if (statusTexto) {
		statusTexto.textContent = texto;
	}
	// Atualiza indicadores de etapas se existirem
	for (let i = 1; i <= 3; i++) {
		const elStep = document.getElementById(`step-${i}`);
		if (elStep) {
			if (i < etapa) {
				elStep.className = "step-item done";
			} else if (i === etapa) {
				elStep.className = "step-item active";
			} else {
				elStep.className = "step-item";
			}
		}
	}
}
function mostrarErro(mensagem) {
	// Esconde e remove a área de resultados imediatamente
	if (resultadoContainer) {
		resultadoContainer.hidden = true;
		resultadoContainer.classList.add("oculto");
	}
	// Garante que o indicador de carregando seja escondido
	if (statusContainer) {
		statusContainer.hidden = true;
		statusContainer.classList.add("oculto");
	}
	// Exibe a caixa de erro com o texto específico da falha
	if (erroContainer && erroMensagem) {
		erroMensagem.textContent = mensagem;
		erroContainer.hidden = false;
		erroContainer.classList.remove("oculto");
		erroContainer.scrollIntoView({
			behavior: "smooth",
			block: "nearest"
		});
	}
}
function esconderErro() {
	if (erroContainer) {
		erroContainer.hidden = true;
		erroContainer.classList.add("oculto");
	}
	if (erroMensagem) {
		erroMensagem.textContent = "";
	}
}
/* ==========================================================================
9. Máscara e Formatação do Campo de CEP
========================================================================== */
/**
* Formata o valor digitado automaticamente como 00000-000 enquanto o usuário digita
*/
inputCep.addEventListener("input", (evento) => {
	let valor = evento.target.value.replace(/\D/g, "");
	if (valor.length > 8) {
		valor = valor.slice(0, 8);
	}
	// Aplica hífen após o 5º dígito
	if (valor.length > 5) {
		evento.target.value = `${valor.slice(0, 5)}-${valor.slice(5)}`;
	} else {
		evento.target.value = valor;
	}
	// Atualiza visibilidade do botão limpar
	btnLimpar.style.display = valor.length > 0 ? "flex" : "none";
	// Limpa erro na digitação se houver
	esconderErro();
});
btnLimpar.addEventListener("click", () => {
	inputCep.value = "";
	btnLimpar.style.display = "none";
	inputCep.focus();
	esconderErro();
});
/* ==========================================================================
10. Eventos de Submissão e Chips Rápidos
========================================================================== */
formCep.addEventListener("submit", (evento) => {
	evento.preventDefault();
	const cep = inputCep.value.trim();
	if (!cep) {
		mostrarErro("Por favor, digite um CEP para consultar o clima.");
		inputCep.focus();
		return;
	}
	executarBusca(cep);
});
// Chips de teste rápido de CEPs de várias regiões do Brasil
document.querySelectorAll(".chip-cep").forEach((botaoChip) => {
	botaoChip.addEventListener("click", () => {
		const cep = botaoChip.getAttribute("data-cep");
		if (cep) {
			inputCep.value = cep;
			btnLimpar.style.display = "flex";
			executarBusca(cep);
		}
	});
});
/* ==========================================================================
11. Alternância de Modo Escuro / Modo Claro (Dark/Light Mode)
O Modo Escuro é o padrão conforme solicitado
========================================================================== */
const TEMA_STORAGE_KEY = "clima_cep_tema";
function aplicarTema(tema) {
	if (tema === "light") {
		document.documentElement.setAttribute("data-theme", "light");
		if (btnTema) {
			btnTema.innerHTML = "<span class=\"btn-theme-icon\" aria-hidden=\"true\">☀️</span> <span>Modo Claro</span>";
			btnTema.setAttribute("aria-label", "Alternar para Modo Escuro");
		}
	} else {
		document.documentElement.setAttribute("data-theme", "dark");
		if (btnTema) {
			btnTema.innerHTML = "<span class=\"btn-theme-icon\" aria-hidden=\"true\">🌙</span> <span>Modo Escuro</span>";
			btnTema.setAttribute("aria-label", "Alternar para Modo Claro");
		}
	}
}
// Inicializa o tema (Modo Escuro como padrão)
function inicializarTema() {
	const temaSalvo = localStorage.getItem(TEMA_STORAGE_KEY);
	if (temaSalvo === "light") {
		aplicarTema("light");
	} else {
		// Padrão obrigatório: Escuro
		aplicarTema("dark");
	}
}
btnTema.addEventListener("click", () => {
	const temaAtual = document.documentElement.getAttribute("data-theme") || "dark";
	const novoTema = temaAtual === "dark" ? "light" : "dark";
	localStorage.setItem(TEMA_STORAGE_KEY, novoTema);
	aplicarTema(novoTema);
});
/* ==========================================================================
12. Exportação e Download dos Arquivos do Projeto (Pronto para GitHub Pages)
Gera os arquivos index.html, style.css, script.js e README.md para download
========================================================================== */
/**
* Faz download de um texto como arquivo no navegador
* @param {string} nomeArquivo
* @param {string} conteudo
* @param {string} tipoMime
*/
function baixarArquivo(nomeArquivo, conteudo, tipoMime = "text/plain;charset=utf-8") {
	const blob = new Blob([conteudo], { type: tipoMime });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = nomeArquivo;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
/**
* Utilitário para obter o conteúdo limpo e original de um arquivo do projeto
* @param {string} nomeArquivo
* @returns {Promise<string>}
*/
async function obterConteudoLimpo(nomeArquivo) {
	// 1. Tenta buscar direto
	const resp = await fetch(nomeArquivo);
	if (!resp.ok) {
		throw new Error(`Não foi possível carregar ${nomeArquivo} (Status: ${resp.status})`);
	}
	let texto = await resp.text();
	// 2. Se o ambiente de desenvolvimento (ex: Vite) tiver envelopado o CSS em JS:
	if (nomeArquivo.endsWith(".css") && texto.includes("__vite__css =")) {
		const match = texto.match(/__vite__css\s*=\s*(".*?")\n/s);
		if (match) {
			try {
				return JSON.parse(match[1]);
			} catch (e) {
				console.warn("Fallback na decodificação do CSS:", e);
			}
		}
	}
	// 3. Se o HTML contiver o script do Vite injetado no cabeçalho (<script type="module" src="/@vite/client"><\/script>),
	// limpamos essa tag para que o arquivo fique 100% puro para GitHub Pages:
	if (nomeArquivo === "index.html") {
		texto = texto.replace(/<script type="module" src="\/@vite\/client"><\/script>\s*/g, "");
	}
	return texto;
}
/**
* Utilitário para baixar os arquivos individuais do projeto
*/
async function baixarArquivoProjeto(nomeArquivo) {
	try {
		const texto = await obterConteudoLimpo(nomeArquivo);
		const mime = nomeArquivo.endsWith(".html") ? "text/html;charset=utf-8" : nomeArquivo.endsWith(".css") ? "text/css;charset=utf-8" : nomeArquivo.endsWith(".js") ? "application/javascript;charset=utf-8" : "text/markdown;charset=utf-8";
		baixarArquivo(nomeArquivo, texto, mime);
	} catch (err) {
		console.warn("Falha no download direto:", err);
		alert(`Erro ao baixar ${nomeArquivo}: ${err.message}`);
	}
}
/**
* Cria um arquivo .ZIP diretamente no navegador (sem bibliotecas externas)
* usando a especificação padrão ZIP (formato PKZIP puro)
*/
async function baixarProjetoCompletoZip() {
	const arquivosParaZip = [
		"index.html",
		"style.css",
		"script.js",
		"README.md"
	];
	const arquivosConteudo = [];
	try {
		btnBaixarTudo.textContent = "Preparando ZIP...";
		btnBaixarTudo.disabled = true;
		for (const nome of arquivosParaZip) {
			try {
				const texto = await obterConteudoLimpo(nome);
				arquivosConteudo.push({
					nome,
					texto
				});
			} catch (err) {
				console.warn(`Aviso ao ler ${nome}:`, err);
			}
		}
		if (arquivosConteudo.length === 0) {
			throw new Error("Nenhum arquivo encontrado para empacotar.");
		}
		// Gerador de ZIP puro minimalista em JS puro
		const zipBlob = gerarZipPuro(arquivosConteudo);
		const url = URL.createObjectURL(zipBlob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "clima-por-cep-github-pages.zip";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	} catch (erro) {
		console.warn("Fallback no gerador de ZIP:", erro);
		// Fallback: se houver falha no ZIP, baixa os arquivos individualmente
		for (const arq of arquivosParaZip) {
			await baixarArquivoProjeto(arq);
		}
	} finally {
		btnBaixarTudo.textContent = "📦 Baixar Tudo (.ZIP)";
		btnBaixarTudo.disabled = false;
	}
}
/**
* Gerador compacto de arquivo ZIP padrão (PKWARE) em JavaScript puro.
* Funciona offline sem nenhuma dependência!
* @param {Array<{nome: string, texto: string}>} listaArquivos
* @returns {Blob}
*/
function gerarZipPuro(listaArquivos) {
	const encoder = new TextEncoder();
	const partesLocais = [];
	const partesDiretorioCentral = [];
	let deslocamentoOffset = 0;
	for (const arq of listaArquivos) {
		const nomeBytes = encoder.encode(arq.nome);
		const dadosBytes = encoder.encode(arq.texto);
		const tamanho = dadosBytes.length;
		const crc = calcularCRC32(dadosBytes);
		// Cabeçalho de Arquivo Local (30 bytes + nome + dados)
		const cabecalhoLocal = new Uint8Array(30 + nomeBytes.length);
		const dvLocal = new DataView(cabecalhoLocal.buffer);
		dvLocal.setUint32(0, 67324752, true);
		dvLocal.setUint16(4, 20, true);
		dvLocal.setUint16(6, 0, true);
		dvLocal.setUint16(8, 0, true);
		dvLocal.setUint16(10, 0, true);
		dvLocal.setUint16(12, 0, true);
		dvLocal.setUint32(14, crc, true);
		dvLocal.setUint32(18, tamanho, true);
		dvLocal.setUint32(22, tamanho, true);
		dvLocal.setUint16(26, nomeBytes.length, true);
		dvLocal.setUint16(28, 0, true);
		cabecalhoLocal.set(nomeBytes, 30);
		partesLocais.push(cabecalhoLocal);
		partesLocais.push(dadosBytes);
		// Entrada do Diretório Central (46 bytes + nome)
		const entradaCentral = new Uint8Array(46 + nomeBytes.length);
		const dvCentral = new DataView(entradaCentral.buffer);
		dvCentral.setUint32(0, 33639248, true);
		dvCentral.setUint16(4, 20, true);
		dvCentral.setUint16(6, 20, true);
		dvCentral.setUint16(8, 0, true);
		dvCentral.setUint16(10, 0, true);
		dvCentral.setUint16(12, 0, true);
		dvCentral.setUint16(14, 0, true);
		dvCentral.setUint32(16, crc, true);
		dvCentral.setUint32(20, tamanho, true);
		dvCentral.setUint32(24, tamanho, true);
		dvCentral.setUint16(28, nomeBytes.length, true);
		dvCentral.setUint16(30, 0, true);
		dvCentral.setUint16(32, 0, true);
		dvCentral.setUint16(34, 0, true);
		dvCentral.setUint16(36, 0, true);
		dvCentral.setUint32(38, 0, true);
		dvCentral.setUint32(42, deslocamentoOffset, true);
		entradaCentral.set(nomeBytes, 46);
		partesDiretorioCentral.push(entradaCentral);
		deslocamentoOffset += cabecalhoLocal.length + dadosBytes.length;
	}
	// Fim do Registro do Diretório Central (EOCD - 22 bytes)
	const tamanhoDiretorioCentral = partesDiretorioCentral.reduce((acc, p) => acc + p.length, 0);
	const eocd = new Uint8Array(22);
	const dvEocd = new DataView(eocd.buffer);
	dvEocd.setUint32(0, 101010256, true);
	dvEocd.setUint16(4, 0, true);
	dvEocd.setUint16(6, 0, true);
	dvEocd.setUint16(8, listaArquivos.length, true);
	dvEocd.setUint16(10, listaArquivos.length, true);
	dvEocd.setUint32(12, tamanhoDiretorioCentral, true);
	dvEocd.setUint32(16, deslocamentoOffset, true);
	dvEocd.setUint16(20, 0, true);
	return new Blob([
		...partesLocais,
		...partesDiretorioCentral,
		eocd
	], { type: "application/zip" });
}
/**
* Tabela de lookup para cálculo rápido de CRC-32
*/
const tabelaCRC32 = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
	let c = i;
	for (let j = 0; j < 8; j++) {
		c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
	}
	tabelaCRC32[i] = c;
}
function calcularCRC32(uint8Array) {
	let crc = 4294967295;
	for (let i = 0; i < uint8Array.length; i++) {
		crc = tabelaCRC32[(crc ^ uint8Array[i]) & 255] ^ crc >>> 8;
	}
	return (crc ^ 4294967295) >>> 0;
}
// Binds dos botões de download
const btnBaixarTudo = document.getElementById("btn-download-all");
if (btnBaixarTudo) {
	btnBaixarTudo.addEventListener("click", baixarProjetoCompletoZip);
}
document.querySelectorAll("[data-download-file]").forEach((btn) => {
	btn.addEventListener("click", (e) => {
		e.preventDefault();
		const arquivo = btn.getAttribute("data-download-file");
		if (arquivo) {
			baixarArquivoProjeto(arquivo);
		}
	});
});
/* ==========================================================================
13. Inicialização ao Carregar a Página
========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
	inicializarTema();
	esconderErro();
	// Se o usuário já tiver digitado algo antes do refresh
	if (inputCep.value.trim().length > 0) {
		btnLimpar.style.display = "flex";
	}
	// Foco no input para conveniência
	inputCep.focus();
	// Executa uma consulta inicial ilustrativa (ex: Praça da Sé, SP: 01001-000)
	// para que a página já abra bonita e funcional
	try {
		inputCep.value = "01001-000";
		btnLimpar.style.display = "flex";
		executarBusca("01001-000");
	} catch (errInit) {
		console.warn("Inicialização adiada:", errInit);
	}
});

//# sourceMappingURL=data:application/json;base64,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RUFDakIsTUFBTSxVQUFVLElBQUksYUFBYSxvQkFBb0I7RUFDckQsSUFBSSxTQUFTO0dBQ1gscUJBQXFCLE9BQU87RUFDOUI7Q0FDRixDQUFDO0FBQ0gsQ0FBQzs7OztBQUtELFNBQVMsaUJBQWlCLDBCQUEwQjtDQUNsRCxnQkFBZ0I7Q0FDaEIsYUFBYTs7Q0FHYixJQUFJLFNBQVMsTUFBTSxLQUFLLENBQUMsQ0FBQyxTQUFTLEdBQUc7RUFDcEMsVUFBVSxNQUFNLFVBQVU7Q0FDNUI7O0NBR0EsU0FBUyxNQUFNOzs7Q0FJZixJQUFJO0VBQ0YsU0FBUyxRQUFRO0VBQ2pCLFVBQVUsTUFBTSxVQUFVO0VBQzFCLGNBQWMsV0FBVztDQUMzQixTQUFTLFNBQVM7RUFDaEIsUUFBUSxLQUFLLHlCQUF5QixPQUFPO0NBQy9DO0FBQ0YsQ0FBQyIsIm5hbWVzIjpbXSwic291cmNlcyI6WyJzY3JpcHQuanMiXSwidmVyc2lvbiI6Mywic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZSBzY3JpcHQuanNcbiAqIEBkZXNjcmlwdGlvbiBMw7NnaWNhIGRvIHNpdGUgXCJDbGltYSBwb3IgQ0VQXCIgZW0gSmF2YVNjcmlwdCBwdXJvIChWYW5pbGxhIEpTKS5cbiAqIENvbnN1bHRhIDMgQVBJcyBww7pibGljYXMgZSBncmF0dWl0YXMgc2VtIG5lY2Vzc2lkYWRlIGRlIGNoYXZlcyBkZSBBUEk6XG4gKiAgMS4gVmlhQ0VQIChjb252ZXJ0ZSBDRVAgZW0gQ2lkYWRlIGUgRXN0YWRvKVxuICogIDIuIE9wZW4tTWV0ZW8gR2VvY29kaW5nIChjb252ZXJ0ZSBDaWRhZGUgZSBFc3RhZG8gZW0gTGF0aXR1ZGUgZSBMb25naXR1ZGUpXG4gKiAgMy4gT3Blbi1NZXRlbyBGb3JlY2FzdCAob2J0w6ltIGNsaW1hIGF0dWFsIGUgcHJldmlzw6NvIGRlIDUgZGlhcylcbiAqIFxuICogT3JnYW5pemFkbyBlbSBmdW7Dp8O1ZXMgbW9kdWxhcmVzOlxuICogIC0gYnVzY2FyQ2VwKGNlcClcbiAqICAtIGJ1c2NhckNvb3JkZW5hZGFzKGNpZGFkZSwgdWYpXG4gKiAgLSBidXNjYXJQcmV2aXNhbyhsYXRpdHVkZSwgbG9uZ2l0dWRlKVxuICogIC0gbW9zdHJhclJlc3VsdGFkbyhkYWRvcylcbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAxLiBEaWNpb27DoXJpbyBkZSBDw7NkaWdvcyBkZSBUZW1wbyAoV01PIFdlYXRoZXIgQ29kZXMpXG4gICBNYXBlaWEgbyBjw7NkaWdvIG51bcOpcmljbyByZXRvcm5hZG8gcGVsYSBPcGVuLU1ldGVvIHBhcmEgZW1vamkgZSB0ZXh0byBlbSBQVC1CUlxuICAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbmNvbnN0IERJQ0lPTkFSSU9fVEVNUE8gPSB7XG4gIDA6IHsgZW1vamk6ICfimIDvuI8nLCB0ZXh0bzogJ0PDqXUgbGltcG8nIH0sXG4gIDE6IHsgZW1vamk6ICfwn4yk77iPJywgdGV4dG86ICdQcmVkb21pbmFudGVtZW50ZSBsaW1wbycgfSxcbiAgMjogeyBlbW9qaTogJ+KbhScsIHRleHRvOiAnUGFyY2lhbG1lbnRlIG51YmxhZG8nIH0sXG4gIDM6IHsgZW1vamk6ICfimIHvuI8nLCB0ZXh0bzogJ0VuY29iZXJ0byAvIE51YmxhZG8nIH0sXG4gIDQ1OiB7IGVtb2ppOiAn8J+Mq++4jycsIHRleHRvOiAnTmV2b2Vpcm8nIH0sXG4gIDQ4OiB7IGVtb2ppOiAn8J+Mq++4j+KdhO+4jycsIHRleHRvOiAnTmV2b2Vpcm8gY29tIGdlYWRhJyB9LFxuICA1MTogeyBlbW9qaTogJ/CfjKbvuI8nLCB0ZXh0bzogJ0dhcm9hIGxldmUnIH0sXG4gIDUzOiB7IGVtb2ppOiAn8J+Mp++4jycsIHRleHRvOiAnR2Fyb2EgbW9kZXJhZGEnIH0sXG4gIDU1OiB7IGVtb2ppOiAn8J+Mp++4jycsIHRleHRvOiAnR2Fyb2EgZGVuc2EnIH0sXG4gIDU2OiB7IGVtb2ppOiAn8J+MqO+4jycsIHRleHRvOiAnR2Fyb2EgY29uZ2VsYW50ZSBsZXZlJyB9LFxuICA1NzogeyBlbW9qaTogJ/CfjKjvuI8nLCB0ZXh0bzogJ0dhcm9hIGNvbmdlbGFudGUgZGVuc2EnIH0sXG4gIDYxOiB7IGVtb2ppOiAn8J+Mpu+4jycsIHRleHRvOiAnQ2h1dmEgZnJhY2EnIH0sXG4gIDYzOiB7IGVtb2ppOiAn8J+Mp++4jycsIHRleHRvOiAnQ2h1dmEgbW9kZXJhZGEnIH0sXG4gIDY1OiB7IGVtb2ppOiAn8J+Mp++4j/CfjKfvuI8nLCB0ZXh0bzogJ0NodXZhIGZvcnRlJyB9LFxuICA2NjogeyBlbW9qaTogJ/CfjKjvuI8nLCB0ZXh0bzogJ0NodXZhIGNvbmdlbGFudGUgbGV2ZScgfSxcbiAgNjc6IHsgZW1vamk6ICfwn4yo77iPJywgdGV4dG86ICdDaHV2YSBjb25nZWxhbnRlIGZvcnRlJyB9LFxuICA3MTogeyBlbW9qaTogJ/CfjKjvuI8nLCB0ZXh0bzogJ1F1ZWRhIGRlIG5ldmUgbGV2ZScgfSxcbiAgNzM6IHsgZW1vamk6ICfwn4yo77iPJywgdGV4dG86ICdRdWVkYSBkZSBuZXZlIG1vZGVyYWRhJyB9LFxuICA3NTogeyBlbW9qaTogJ+KdhO+4jycsIHRleHRvOiAnTmV2ZSBpbnRlbnNhJyB9LFxuICA3NzogeyBlbW9qaTogJ+KdhO+4jycsIHRleHRvOiAnR3LDo29zIGRlIG5ldmUnIH0sXG4gIDgwOiB7IGVtb2ppOiAn8J+Mpu+4jycsIHRleHRvOiAnUGFuY2FkYXMgZGUgY2h1dmEgbGV2ZScgfSxcbiAgODE6IHsgZW1vamk6ICfwn4yn77iPJywgdGV4dG86ICdQYW5jYWRhcyBkZSBjaHV2YSBtb2RlcmFkYScgfSxcbiAgODI6IHsgZW1vamk6ICfim4jvuI8nLCB0ZXh0bzogJ1BhbmNhZGFzIGRlIGNodXZhIHZpb2xlbnRhJyB9LFxuICA4NTogeyBlbW9qaTogJ/CfjKjvuI8nLCB0ZXh0bzogJ1BhbmNhZGFzIGRlIG5ldmUgbGV2ZScgfSxcbiAgODY6IHsgZW1vamk6ICfinYTvuI8nLCB0ZXh0bzogJ1BhbmNhZGFzIGRlIG5ldmUgZm9ydGUnIH0sXG4gIDk1OiB7IGVtb2ppOiAn4puI77iPJywgdGV4dG86ICdUZW1wZXN0YWRlIGNvbSB0cm92b2FkYXMnIH0sXG4gIDk2OiB7IGVtb2ppOiAn4puI77iP8J+niicsIHRleHRvOiAnVGVtcGVzdGFkZSBjb20gZ3Jhbml6byBsZXZlJyB9LFxuICA5OTogeyBlbW9qaTogJ+KbiO+4j/Cfp4onLCB0ZXh0bzogJ1RlbXBlc3RhZGUgY29tIGdyYW5pem8gZm9ydGUnIH0sXG59O1xuXG4vKipcbiAqIFJldG9ybmEgYXMgaW5mb3JtYcOnw7VlcyB2aXN1YWlzIChlbW9qaSBlIHRleHRvIGVtIHBvcnR1Z3XDqnMpIHBhcmEgdW0gY8OzZGlnbyBkZSB0ZW1wb1xuICogQHBhcmFtIHtudW1iZXJ9IGNvZGlnbyAtIEPDs2RpZ28gV01PIGRhIE9wZW4tTWV0ZW9cbiAqIEByZXR1cm5zIHt7IGVtb2ppOiBzdHJpbmcsIHRleHRvOiBzdHJpbmcgfX1cbiAqL1xuZnVuY3Rpb24gaW50ZXJwcmV0YXJDb2RpZ29UZW1wbyhjb2RpZ28pIHtcbiAgaWYgKGNvZGlnbyAhPT0gdW5kZWZpbmVkICYmIERJQ0lPTkFSSU9fVEVNUE9bY29kaWdvXSkge1xuICAgIHJldHVybiBESUNJT05BUklPX1RFTVBPW2NvZGlnb107XG4gIH1cbiAgcmV0dXJuIHsgZW1vamk6ICfwn4yh77iPJywgdGV4dG86ICdUZW1wbyB2YXJpw6F2ZWwnIH07XG59XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAyLiBFbGVtZW50b3MgZG8gRE9NIChDYWNoZSBkZSByZWZlcsOqbmNpYXMpXG4gICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuY29uc3QgZm9ybUNlcCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmb3JtLWNlcCcpO1xuY29uc3QgaW5wdXRDZXAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2VwLWlucHV0Jyk7XG5jb25zdCBidG5CdXNjYXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnRuLWJ1c2NhcicpO1xuY29uc3QgYnRuTGltcGFyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2J0bi1saW1wYXInKTtcbmNvbnN0IGJ0blRlbWEgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnRuLXRlbWEnKTtcblxuY29uc3Qgc3RhdHVzQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N0YXR1cy1jb250YWluZXInKTtcbmNvbnN0IHN0YXR1c1RleHRvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N0YXR1cy10ZXh0bycpO1xuY29uc3QgZXJyb0NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdlcnJvLWNvbnRhaW5lcicpO1xuY29uc3QgZXJyb01lbnNhZ2VtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Vycm8tbWVuc2FnZW0nKTtcbmNvbnN0IHJlc3VsdGFkb0NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN1bHRhZG8tY29udGFpbmVyJyk7XG5cbi8vIEVsZW1lbnRvcyBkZSBleGliacOnw6NvIGRhIExvY2FsaXphw6fDo29cbmNvbnN0IGVsQ2lkYWRlVWYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzLWNpZGFkZS11ZicpO1xuY29uc3QgZWxFbmRlcmVjbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXMtZW5kZXJlY28nKTtcbmNvbnN0IGVsQmFkZ2VDZXAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFkZ2UtY2VwJyk7XG5jb25zdCBlbEJhZGdlUmVnaWFvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JhZGdlLXJlZ2lhbycpO1xuY29uc3QgZWxCYWRnZURkZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiYWRnZS1kZGQnKTtcbmNvbnN0IGVsQmFkZ2VDb29yZHMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmFkZ2UtY29vcmRzJyk7XG5cbi8vIEVsZW1lbnRvcyBkbyBUZW1wbyBBdHVhbFxuY29uc3QgZWxFbW9qaUF0dWFsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlcy1lbW9qaS1hdHVhbCcpO1xuY29uc3QgZWxUZW1wQXR1YWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzLXRlbXAtYXR1YWwnKTtcbmNvbnN0IGVsRGVzY0F0dWFsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlcy1kZXNjLWF0dWFsJyk7XG5jb25zdCBlbFNlbnNhY2FvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlcy1zZW5zYWNhbycpO1xuY29uc3QgZWxVbWlkYWRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlcy11bWlkYWRlJyk7XG5jb25zdCBlbFZlbnRvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlcy12ZW50bycpO1xuY29uc3QgZWxIb3JhTWVkaWNhbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXMtaG9yYS1tZWRpY2FvJyk7XG5cbi8vIEdyaWQgZG9zIDUgRGlhcyBkZSBQcmV2aXPDo29cbmNvbnN0IGVsRm9yZWNhc3RHcmlkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZvcmVjYXN0LWdyaWQnKTtcblxuLy8gUGFpbmVsIGludGVyYXRpdm8gZGEgc2XDp8OjbyBcIkNvbW8gRnVuY2lvbmFcIlxuY29uc3QgZWxJbnNwZWN0Q29udGVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdpbnNwZWN0LWxpdmUtY29udGVudCcpO1xuXG4vLyBWYXJpw6F2ZWwgcGFyYSBhcm1hemVuYXIgbyDDumx0aW1vIHJlc3VsdGFkbyBvYnRpZG8gKHBhcmEgZG93bmxvYWRzIG91IGluc3Blw6fDo28pXG5sZXQgdWx0aW1vUmVzdWx0YWRvR2xvYmFsID0gbnVsbDtcblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgIDMuIFBhc3NvIDE6IENvbnN1bHRhIMOgIEFQSSBWaWFDRVBcbiAgID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG4vKipcbiAqIENvbnN1bHRhIGEgQVBJIFZpYUNFUCBwYXJhIG9idGVyIG8gZW5kZXJlw6dvLCBjaWRhZGUgZSBVRiBhIHBhcnRpciBkbyBDRVAuXG4gKiBQb3NzdWkgZmFsbGJhY2sgYXV0b23DoXRpY28gcGFyYSBhIEJyYXNpbEFQSSBjYXNvIG8gVmlhQ0VQIGVzdGVqYSBpbnN0w6F2ZWwgb3UgcmV0b3JuZSBlcnJvLlxuICogQHBhcmFtIHtzdHJpbmd9IGNlcCAtIENFUCBkaWdpdGFkbyBwZWxvIHVzdcOhcmlvIChjb20gb3Ugc2VtIG3DoXNjYXJhKVxuICogQHJldHVybnMge1Byb21pc2U8T2JqZWN0Pn0gRGFkb3MgZG8gZW5kZXJlw6dvIHJldG9ybmFkb3MgcGVsbyBWaWFDRVAgb3UgQnJhc2lsQVBJXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGJ1c2NhckNlcChjZXApIHtcbiAgLy8gTGltcGEgY2FyYWN0ZXJlcyBuw6NvIG51bcOpcmljb3NcbiAgY29uc3QgY2VwTGltcG8gPSAoY2VwIHx8ICcnKS5yZXBsYWNlKC9cXEQvZywgJycpO1xuXG4gIC8vIFZhbGlkYcOnw6NvIHByZWxpbWluYXI6IG8gQ0VQIGJyYXNpbGVpcm8gcHJlY2lzYSB0ZXIgZXhhdGFtZW50ZSA4IGTDrWdpdG9zXG4gIGlmIChjZXBMaW1wby5sZW5ndGggIT09IDgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NFUCBpbnbDoWxpZG8uIE8gQ0VQIGJyYXNpbGVpcm8gZGV2ZSBjb250ZXIgZXhhdGFtZW50ZSA4IG7Dum1lcm9zIChleDogMDEwMDEtMDAwIG91IDAxMDAxMDAwKS4nKTtcbiAgfVxuXG4gIC8vIFNlIG8gdXN1w6FyaW8gZGlnaXRvdSBDRVAgY29tcG9zdG8gYXBlbmFzIHBlbG8gbWVzbW8gZMOtZ2l0byByZXBldGlkbyAoZXg6IDAwMDAwMDAwKVxuICBpZiAoL14oXFxkKVxcMXs3fSQvLnRlc3QoY2VwTGltcG8pKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDRVAgbsOjbyBlbmNvbnRyYWRvLiBQb3IgZmF2b3IsIGRpZ2l0ZSB1bSBDRVAgdsOhbGlkbyAoZXg6IDAxMDAxLTAwMCkuJyk7XG4gIH1cblxuICBjb25zdCB1cmxWaWFDZXAgPSBgaHR0cHM6Ly92aWFjZXAuY29tLmJyL3dzLyR7Y2VwTGltcG99L2pzb24vYDtcblxuICB0cnkge1xuICAgIGNvbnN0IHJlc3Bvc3RhID0gYXdhaXQgZmV0Y2godXJsVmlhQ2VwKTtcblxuICAgIGlmIChyZXNwb3N0YS5vaykge1xuICAgICAgY29uc3QgZGFkb3MgPSBhd2FpdCByZXNwb3N0YS5qc29uKCk7XG5cbiAgICAgIC8vIFNlIG8gVmlhQ0VQIGVuY29udHJvdSBjb20gc3VjZXNzb1xuICAgICAgaWYgKCFkYWRvcy5lcnJvICYmIGRhZG9zLmxvY2FsaWRhZGUpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBjZXBPcmlnaW5hbDogY2VwTGltcG8sXG4gICAgICAgICAgY2VwRm9ybWF0YWRvOiBkYWRvcy5jZXAgfHwgYCR7Y2VwTGltcG8uc2xpY2UoMCwgNSl9LSR7Y2VwTGltcG8uc2xpY2UoNSl9YCxcbiAgICAgICAgICBjaWRhZGU6IGRhZG9zLmxvY2FsaWRhZGUsXG4gICAgICAgICAgdWY6IGRhZG9zLnVmLFxuICAgICAgICAgIGVzdGFkb05vbWU6IGRhZG9zLmVzdGFkbyB8fCBkYWRvcy51ZixcbiAgICAgICAgICBiYWlycm86IGRhZG9zLmJhaXJybyB8fCAnJyxcbiAgICAgICAgICBsb2dyYWRvdXJvOiBkYWRvcy5sb2dyYWRvdXJvIHx8ICcnLFxuICAgICAgICAgIHJlZ2lhbzogZGFkb3MucmVnaWFvIHx8ICcnLFxuICAgICAgICAgIGRkZDogZGFkb3MuZGRkIHx8ICcnLFxuICAgICAgICAgIHVybENoYW1hZGE6IHVybFZpYUNlcCxcbiAgICAgICAgICBzZXJ2aWNvOiAnVmlhQ0VQJ1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCAoZXJyVmlhQ2VwKSB7XG4gICAgLy8gVmlhQ0VQIGluZGlzcG9uw612ZWwgb3UgYmxvcXVlYWRvOyBzZWd1ZSBwYXJhIG8gZmFsbGJhY2sgYWJhaXhvXG4gIH1cblxuICAvLyBGYWxsYmFjayBwYXJhIGEgQnJhc2lsQVBJIGNhc28gbyBWaWFDRVAgbsOjbyBlbmNvbnRyZSBvIENFUCBvdSBlc3RlamEgb3NjaWxhbmRvXG4gIHRyeSB7XG4gICAgY29uc3QgdXJsQnJhc2lsQXBpID0gYGh0dHBzOi8vYnJhc2lsYXBpLmNvbS5ici9hcGkvY2VwL3YxLyR7Y2VwTGltcG99YDtcbiAgICBjb25zdCByZXNwQnJhc2lsID0gYXdhaXQgZmV0Y2godXJsQnJhc2lsQXBpKTtcbiAgICBpZiAocmVzcEJyYXNpbC5vaykge1xuICAgICAgY29uc3QgZGFkb3NCcmFzaWwgPSBhd2FpdCByZXNwQnJhc2lsLmpzb24oKTtcbiAgICAgIGlmIChkYWRvc0JyYXNpbC5jaXR5ICYmIGRhZG9zQnJhc2lsLnN0YXRlKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgY2VwT3JpZ2luYWw6IGNlcExpbXBvLFxuICAgICAgICAgIGNlcEZvcm1hdGFkbzogYCR7Y2VwTGltcG8uc2xpY2UoMCwgNSl9LSR7Y2VwTGltcG8uc2xpY2UoNSl9YCxcbiAgICAgICAgICBjaWRhZGU6IGRhZG9zQnJhc2lsLmNpdHksXG4gICAgICAgICAgdWY6IGRhZG9zQnJhc2lsLnN0YXRlLFxuICAgICAgICAgIGVzdGFkb05vbWU6IGRhZG9zQnJhc2lsLnN0YXRlLFxuICAgICAgICAgIGJhaXJybzogZGFkb3NCcmFzaWwubmVpZ2hib3Job29kIHx8ICcnLFxuICAgICAgICAgIGxvZ3JhZG91cm86IGRhZG9zQnJhc2lsLnN0cmVldCB8fCAnJyxcbiAgICAgICAgICByZWdpYW86ICcnLFxuICAgICAgICAgIGRkZDogJycsXG4gICAgICAgICAgdXJsQ2hhbWFkYTogdXJsQnJhc2lsQXBpLFxuICAgICAgICAgIHNlcnZpY286ICdCcmFzaWxBUEknXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICB9IGNhdGNoIChlcnJCcmFzaWwpIHtcbiAgICAvLyBGYWxoYSBlbSBhbWJhcyBhcyBmb250ZXNcbiAgfVxuXG4gIHRocm93IG5ldyBFcnJvcignQ0VQIG7Do28gZW5jb250cmFkby4gVmVyaWZpcXVlIHNlIG8gbsO6bWVybyBkaWdpdGFkbyBlc3TDoSBjb3JyZXRvIGUgdGVudGUgbm92YW1lbnRlLicpO1xufVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgNC4gUGFzc28gMjogQ29uc3VsdGEgw6AgQVBJIGRlIEdlb2NvZGlmaWNhw6fDo28gT3Blbi1NZXRlb1xuICAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbi8qKlxuICogQ29udmVydGUgbyBub21lIGRhIGNpZGFkZSBlIGVzdGFkbyBlbSBMYXRpdHVkZSBlIExvbmdpdHVkZSB1c2FuZG8gYSBPcGVuLU1ldGVvIEdlb2NvZGluZyBBUEkuXG4gKiBAcGFyYW0ge3N0cmluZ30gY2lkYWRlIC0gTm9tZSBkYSBjaWRhZGUgKGV4OiBcIlPDo28gUGF1bG9cIilcbiAqIEBwYXJhbSB7c3RyaW5nfSB1ZiAtIFNpZ2xhIGRvIGVzdGFkbyAoZXg6IFwiU1BcIilcbiAqIEByZXR1cm5zIHtQcm9taXNlPE9iamVjdD59IENvb3JkZW5hZGFzIGUgZnVzbyBob3LDoXJpb1xuICovXG5hc3luYyBmdW5jdGlvbiBidXNjYXJDb29yZGVuYWRhcyhjaWRhZGUsIHVmKSB7XG4gIGNvbnN0IG5vbWVDb2RpZmljYWRvID0gZW5jb2RlVVJJQ29tcG9uZW50KGNpZGFkZSk7XG4gIGNvbnN0IHVybCA9IGBodHRwczovL2dlb2NvZGluZy1hcGkub3Blbi1tZXRlby5jb20vdjEvc2VhcmNoP25hbWU9JHtub21lQ29kaWZpY2Fkb30mY291bnQ9MTAmbGFuZ3VhZ2U9cHQmY291bnRyeUNvZGU9QlJgO1xuXG4gIHRyeSB7XG4gICAgbGV0IHJlc3Bvc3RhID0gYXdhaXQgZmV0Y2godXJsKTtcbiAgICBsZXQgZGFkb3MgPSByZXNwb3N0YS5vayA/IGF3YWl0IHJlc3Bvc3RhLmpzb24oKSA6IG51bGw7XG5cbiAgICAvLyBGYWxsYmFjazogc2UgbsOjbyBlbmNvbnRyYXIgY29tIG8gbm9tZSBvcmlnaW5hbCwgdGVudGEgc2VtIGFjZW50b3NcbiAgICBpZiAoIWRhZG9zIHx8ICFkYWRvcy5yZXN1bHRzIHx8IGRhZG9zLnJlc3VsdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICBjb25zdCBub21lU2VtQWNlbnRvcyA9IGNpZGFkZS5ub3JtYWxpemUoJ05GRCcpLnJlcGxhY2UoL1tcXHUwMzAwLVxcdTAzNmZdL2csICcnKTtcbiAgICAgIGlmIChub21lU2VtQWNlbnRvcyAhPT0gY2lkYWRlKSB7XG4gICAgICAgIGNvbnN0IHVybFNlbUFjZW50b3MgPSBgaHR0cHM6Ly9nZW9jb2RpbmctYXBpLm9wZW4tbWV0ZW8uY29tL3YxL3NlYXJjaD9uYW1lPSR7ZW5jb2RlVVJJQ29tcG9uZW50KG5vbWVTZW1BY2VudG9zKX0mY291bnQ9MTAmbGFuZ3VhZ2U9cHQmY291bnRyeUNvZGU9QlJgO1xuICAgICAgICByZXNwb3N0YSA9IGF3YWl0IGZldGNoKHVybFNlbUFjZW50b3MpO1xuICAgICAgICBpZiAocmVzcG9zdGEub2spIHtcbiAgICAgICAgICBkYWRvcyA9IGF3YWl0IHJlc3Bvc3RhLmpzb24oKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghZGFkb3MgfHwgIWRhZG9zLnJlc3VsdHMgfHwgZGFkb3MucmVzdWx0cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTsOjbyBmb3JhbSBlbmNvbnRyYWRhcyBjb29yZGVuYWRhcyBnZW9ncsOhZmljYXMgcGFyYSBhIGNpZGFkZSBcIiR7Y2lkYWRlfVwiLmApO1xuICAgIH1cblxuICAgIC8vIEJ1c2NhIG8gcmVzdWx0YWRvIHF1ZSBtZWxob3IgY29ycmVzcG9uZGEgYW8gZXN0YWRvIChVRikgc2UgaG91dmVyIG3Dumx0aXBsYXMgY2lkYWRlcyBjb20gbyBtZXNtbyBub21lXG4gICAgbGV0IHJlc3VsdGFkb0VzY29saGlkbyA9IGRhZG9zLnJlc3VsdHNbMF07XG5cbiAgICAvLyBTZSBob3V2ZXIgbWFpcyBkZSB1bSByZXN1bHRhZG8gbm8gQnJhc2lsLCB0ZW50YSBjYXNhciBjb20gbyBlc3RhZG8vYWRtaW4xXG4gICAgaWYgKGRhZG9zLnJlc3VsdHMubGVuZ3RoID4gMSAmJiB1Zikge1xuICAgICAgY29uc3QgbWF0Y2hFc3RhZG8gPSBkYWRvcy5yZXN1bHRzLmZpbmQoaXRlbSA9PiB7XG4gICAgICAgIGNvbnN0IGFkbWluID0gKGl0ZW0uYWRtaW4xIHx8ICcnKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICByZXR1cm4gYWRtaW4uaW5jbHVkZXModWYudG9Mb3dlckNhc2UoKSkgfHwgXG4gICAgICAgICAgICAgICBpdGVtLnBvc3Rjb2Rlcz8uc29tZShwYyA9PiBwYy5zdGFydHNXaXRoKHVmKSk7XG4gICAgICB9KTtcbiAgICAgIGlmIChtYXRjaEVzdGFkbykge1xuICAgICAgICByZXN1bHRhZG9Fc2NvbGhpZG8gPSBtYXRjaEVzdGFkbztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgbGF0aXR1ZGU6IHJlc3VsdGFkb0VzY29saGlkby5sYXRpdHVkZSxcbiAgICAgIGxvbmdpdHVkZTogcmVzdWx0YWRvRXNjb2xoaWRvLmxvbmdpdHVkZSxcbiAgICAgIG5vbWVFbmNvbnRyYWRvOiByZXN1bHRhZG9Fc2NvbGhpZG8ubmFtZSxcbiAgICAgIGVzdGFkb0VuY29udHJhZG86IHJlc3VsdGFkb0VzY29saGlkby5hZG1pbjEgfHwgdWYsXG4gICAgICB0aW1lem9uZTogcmVzdWx0YWRvRXNjb2xoaWRvLnRpbWV6b25lIHx8ICdBbWVyaWNhL1Nhb19QYXVsbycsXG4gICAgICB1cmxDaGFtYWRhOiB1cmwsXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJybykge1xuICAgIGlmIChlcnJvLm1lc3NhZ2UgJiYgZXJyby5tZXNzYWdlLmluY2x1ZGVzKCdGYWlsZWQgdG8gZmV0Y2gnKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWxoYSBhbyBjb25lY3RhciBjb20gbyBzZXJ2acOnbyBkZSBjb29yZGVuYWRhcyBnZW9ncsOhZmljYXMuIFZlcmlmaXF1ZSBzdWEgY29uZXjDo28uJyk7XG4gICAgfVxuICAgIHRocm93IGVycm87XG4gIH1cbn1cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgIDUuIFBhc3NvIDM6IENvbnN1bHRhIMOgIEFQSSBkZSBQcmV2aXPDo28gZG8gVGVtcG8gT3Blbi1NZXRlb1xuICAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbi8qKlxuICogQ29uc3VsdGEgYSBwcmV2aXPDo28gZG8gdGVtcG8gZGV0YWxoYWRhIGNvbSBsYXRpdHVkZSBlIGxvbmdpdHVkZSBuYSBPcGVuLU1ldGVvLlxuICogQHBhcmFtIHtudW1iZXJ9IGxhdGl0dWRlXG4gKiBAcGFyYW0ge251bWJlcn0gbG9uZ2l0dWRlXG4gKiBAcmV0dXJucyB7UHJvbWlzZTxPYmplY3Q+fSBEYWRvcyBkbyBjbGltYSBhdHVhbCBlIHByw7N4aW1vcyA1IGRpYXNcbiAqL1xuYXN5bmMgZnVuY3Rpb24gYnVzY2FyUHJldmlzYW8obGF0aXR1ZGUsIGxvbmdpdHVkZSkge1xuICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHtcbiAgICBsYXRpdHVkZTogbGF0aXR1ZGUudG9TdHJpbmcoKSxcbiAgICBsb25naXR1ZGU6IGxvbmdpdHVkZS50b1N0cmluZygpLFxuICAgIGN1cnJlbnQ6ICd0ZW1wZXJhdHVyZV8ybSxhcHBhcmVudF90ZW1wZXJhdHVyZSxyZWxhdGl2ZV9odW1pZGl0eV8ybSx3aW5kX3NwZWVkXzEwbSx3ZWF0aGVyX2NvZGUnLFxuICAgIGRhaWx5OiAnd2VhdGhlcl9jb2RlLHRlbXBlcmF0dXJlXzJtX21heCx0ZW1wZXJhdHVyZV8ybV9taW4scHJlY2lwaXRhdGlvbl9wcm9iYWJpbGl0eV9tYXgnLFxuICAgIHRpbWV6b25lOiAnYXV0bycsXG4gIH0pO1xuXG4gIGNvbnN0IHVybCA9IGBodHRwczovL2FwaS5vcGVuLW1ldGVvLmNvbS92MS9mb3JlY2FzdD8ke3BhcmFtcy50b1N0cmluZygpfWA7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCByZXNwb3N0YSA9IGF3YWl0IGZldGNoKHVybCk7XG5cbiAgICBpZiAoIXJlc3Bvc3RhLm9rKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEVycm8gYW8gb2J0ZXIgYSBwcmV2aXPDo28gZG8gdGVtcG8gbmEgT3Blbi1NZXRlbyAoU3RhdHVzICR7cmVzcG9zdGEuc3RhdHVzfSkuYCk7XG4gICAgfVxuXG4gICAgY29uc3QgZGFkb3MgPSBhd2FpdCByZXNwb3N0YS5qc29uKCk7XG5cbiAgICBpZiAoIWRhZG9zLmN1cnJlbnQgfHwgIWRhZG9zLmRhaWx5KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ09zIGRhZG9zIG1ldGVvcm9sw7NnaWNvcyByZWNlYmlkb3MgZXN0w6NvIGluY29tcGxldG9zLiBUZW50ZSBub3ZhbWVudGUuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGRhZG9zLFxuICAgICAgdXJsQ2hhbWFkYTogdXJsLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm8pIHtcbiAgICBpZiAoZXJyby5tZXNzYWdlICYmIGVycm8ubWVzc2FnZS5pbmNsdWRlcygnRmFpbGVkIHRvIGZldGNoJykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFsaGEgYW8gY29uZWN0YXIgY29tIG8gc2VydmnDp28gbWV0ZW9yb2zDs2dpY28uIFZlcmlmaXF1ZSBzdWEgY29uZXjDo28gZGUgaW50ZXJuZXQuJyk7XG4gICAgfVxuICAgIHRocm93IGVycm87XG4gIH1cbn1cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgIDYuIEZ1bsOnw6NvIGRlIFJlbmRlcml6YcOnw6NvOiBtb3N0cmFyUmVzdWx0YWRvKGRhZG9zKVxuICAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbi8qKlxuICogQXR1YWxpemEgdG9kb3Mgb3MgZWxlbWVudG9zIHZpc3VhaXMgbmEgdGVsYSBjb20gYXMgaW5mb3JtYcOnw7VlcyBjb2xldGFkYXMuXG4gKiBAcGFyYW0ge09iamVjdH0gcGFjb3RlQ29tcGxldG8gLSBPYmpldG8gY29tIHsgZW5kZXJlY28sIGNvb3JkZW5hZGFzLCBwcmV2aXNhbyB9XG4gKi9cbmZ1bmN0aW9uIG1vc3RyYXJSZXN1bHRhZG8ocGFjb3RlQ29tcGxldG8pIHtcbiAgY29uc3QgeyBlbmRlcmVjbywgY29vcmRlbmFkYXMsIHByZXZpc2FvIH0gPSBwYWNvdGVDb21wbGV0bztcbiAgY29uc3QgeyBjdXJyZW50LCBkYWlseSB9ID0gcHJldmlzYW8uZGFkb3M7XG5cbiAgLy8gMS4gUHJlZW5jaGUgbyBDYXJ0w6NvIGRlIExvY2FsaXphw6fDo29cbiAgZWxDaWRhZGVVZi50ZXh0Q29udGVudCA9IGAke2VuZGVyZWNvLmNpZGFkZX0gLSAke2VuZGVyZWNvLnVmfWA7XG4gIFxuICBjb25zdCBwYXJ0ZXNFbmRlcmVjbyA9IFtdO1xuICBpZiAoZW5kZXJlY28ubG9ncmFkb3VybykgcGFydGVzRW5kZXJlY28ucHVzaChlbmRlcmVjby5sb2dyYWRvdXJvKTtcbiAgaWYgKGVuZGVyZWNvLmJhaXJybykgcGFydGVzRW5kZXJlY28ucHVzaChgQmFpcnJvICR7ZW5kZXJlY28uYmFpcnJvfWApO1xuICBlbEVuZGVyZWNvLnRleHRDb250ZW50ID0gcGFydGVzRW5kZXJlY28ubGVuZ3RoID4gMCBcbiAgICA/IHBhcnRlc0VuZGVyZWNvLmpvaW4oJywgJykgXG4gICAgOiAnTG9jYWxpZGFkZSBpZGVudGlmaWNhZGEgcGVsb3MgQ29ycmVpb3MnO1xuXG4gIGVsQmFkZ2VDZXAudGV4dENvbnRlbnQgPSBgQ0VQOiAke2VuZGVyZWNvLmNlcEZvcm1hdGFkb31gO1xuICBlbEJhZGdlUmVnaWFvLnRleHRDb250ZW50ID0gZW5kZXJlY28ucmVnaWFvID8gYFJlZ2nDo286ICR7ZW5kZXJlY28ucmVnaWFvfWAgOiBgVUY6ICR7ZW5kZXJlY28udWZ9YDtcbiAgZWxCYWRnZURkZC50ZXh0Q29udGVudCA9IGVuZGVyZWNvLmRkZCA/IGBEREQ6ICgke2VuZGVyZWNvLmRkZH0pYCA6ICdCcmFzaWwnO1xuICBlbEJhZGdlQ29vcmRzLnRleHRDb250ZW50ID0gYExhdDogJHtjb29yZGVuYWRhcy5sYXRpdHVkZS50b0ZpeGVkKDIpfSB8IExvbjogJHtjb29yZGVuYWRhcy5sb25naXR1ZGUudG9GaXhlZCgyKX1gO1xuXG4gIC8vIDIuIFByZWVuY2hlIG8gQ2FydMOjbyBkZSBUZW1wbyBBdHVhbCAoVGVtcG8gQWdvcmEpXG4gIGNvbnN0IGluZm9UZW1wb0F0dWFsID0gaW50ZXJwcmV0YXJDb2RpZ29UZW1wbyhjdXJyZW50LndlYXRoZXJfY29kZSk7XG4gIGVsRW1vamlBdHVhbC50ZXh0Q29udGVudCA9IGluZm9UZW1wb0F0dWFsLmVtb2ppO1xuICBlbERlc2NBdHVhbC50ZXh0Q29udGVudCA9IGluZm9UZW1wb0F0dWFsLnRleHRvO1xuICBlbFRlbXBBdHVhbC50ZXh0Q29udGVudCA9IGAke01hdGgucm91bmQoY3VycmVudC50ZW1wZXJhdHVyZV8ybSl9wrBDYDtcbiAgZWxTZW5zYWNhby50ZXh0Q29udGVudCA9IGAke01hdGgucm91bmQoY3VycmVudC5hcHBhcmVudF90ZW1wZXJhdHVyZSl9wrBDYDtcbiAgZWxVbWlkYWRlLnRleHRDb250ZW50ID0gYCR7Y3VycmVudC5yZWxhdGl2ZV9odW1pZGl0eV8ybX0lYDtcbiAgZWxWZW50by50ZXh0Q29udGVudCA9IGAke01hdGgucm91bmQoY3VycmVudC53aW5kX3NwZWVkXzEwbSl9IGttL2hgO1xuXG4gIC8vIEhvcsOhcmlvIGxvY2FsIGRhIG1lZGnDp8Ojb1xuICBjb25zdCBhZ29yYSA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IGhvcmFGb3JtYXRhZGEgPSBhZ29yYS50b0xvY2FsZVRpbWVTdHJpbmcoJ3B0LUJSJywgeyBob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnIH0pO1xuICBlbEhvcmFNZWRpY2FvLnRleHRDb250ZW50ID0gYE1lZGnDp8OjbyBhdHVhbCAoJHtob3JhRm9ybWF0YWRhfSlgO1xuXG4gIC8vIDMuIFByZWVuY2hlIGEgUHJldmlzw6NvIGRvcyBQcsOzeGltb3MgNSBEaWFzXG4gIGVsRm9yZWNhc3RHcmlkLmlubmVySFRNTCA9ICcnOyAvLyBMaW1wYSBjYXJkcyBhbnRlcmlvcmVzXG5cbiAgLy8gT2J0ZW1vcyBhdMOpIDUgZGlhcyBhIHBhcnRpciBkZSBob2plXG4gIGNvbnN0IHRvdGFsRGlhcyA9IE1hdGgubWluKDUsIGRhaWx5LnRpbWUubGVuZ3RoKTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHRvdGFsRGlhczsgaSsrKSB7XG4gICAgY29uc3QgZGF0YVN0ciA9IGRhaWx5LnRpbWVbaV07XG4gICAgLy8gQWRpY2lvbmEgaG9yYSBwYXJhIGV2aXRhciBwcm9ibGVtYXMgZGUgZnVzbyBob3LDoXJpbyBhbyBjcmlhciBvIG9iamV0byBEYXRlXG4gICAgY29uc3QgZGF0YU9iaiA9IG5ldyBEYXRlKGAke2RhdGFTdHJ9VDEyOjAwOjAwYCk7XG4gICAgXG4gICAgLy8gTm9tZXMgZG9zIGRpYXMgZGEgc2VtYW5hIGVtIHBvcnR1Z3XDqnNcbiAgICBsZXQgbm9tZURpYVNlbWFuYSA9IGRhdGFPYmoudG9Mb2NhbGVEYXRlU3RyaW5nKCdwdC1CUicsIHsgd2Vla2RheTogJ3Nob3J0JyB9KTtcbiAgICBub21lRGlhU2VtYW5hID0gbm9tZURpYVNlbWFuYS5yZXBsYWNlKCcuJywgJycpLnRvVXBwZXJDYXNlKCk7XG5cbiAgICAvLyBTZSBmb3IgbyBwcmltZWlybyBkaWEgKGhvamUpXG4gICAgaWYgKGkgPT09IDApIHtcbiAgICAgIG5vbWVEaWFTZW1hbmEgPSAnSE9KRSc7XG4gICAgfSBlbHNlIGlmIChpID09PSAxKSB7XG4gICAgICBub21lRGlhU2VtYW5hID0gJ0FNQU5Iw4MnO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGFGb3JtYXRhZGEgPSBkYXRhT2JqLnRvTG9jYWxlRGF0ZVN0cmluZygncHQtQlInLCB7IGRheTogJzItZGlnaXQnLCBtb250aDogJzItZGlnaXQnIH0pO1xuICAgIGNvbnN0IGNvZGlnb0NsaW1hRGlhID0gZGFpbHkud2VhdGhlcl9jb2RlW2ldO1xuICAgIGNvbnN0IGluZm9EaWEgPSBpbnRlcnByZXRhckNvZGlnb1RlbXBvKGNvZGlnb0NsaW1hRGlhKTtcblxuICAgIGNvbnN0IHRlbXBNYXggPSBNYXRoLnJvdW5kKGRhaWx5LnRlbXBlcmF0dXJlXzJtX21heFtpXSk7XG4gICAgY29uc3QgdGVtcE1pbiA9IE1hdGgucm91bmQoZGFpbHkudGVtcGVyYXR1cmVfMm1fbWluW2ldKTtcbiAgICBjb25zdCBjaGFuY2VDaHV2YSA9IGRhaWx5LnByZWNpcGl0YXRpb25fcHJvYmFiaWxpdHlfbWF4ID8gZGFpbHkucHJlY2lwaXRhdGlvbl9wcm9iYWJpbGl0eV9tYXhbaV0gOiAwO1xuXG4gICAgLy8gQ3JpYSBvIGNhcmQgZG8gZGlhXG4gICAgY29uc3QgY2FyZERpYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2FydGljbGUnKTtcbiAgICBjYXJkRGlhLmNsYXNzTmFtZSA9ICdmb3JlY2FzdC1kYXktY2FyZCc7XG4gICAgY2FyZERpYS5zZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnLCBgUHJldmlzw6NvIHBhcmEgJHtub21lRGlhU2VtYW5hfSwgJHtkYXRhRm9ybWF0YWRhfTogJHtpbmZvRGlhLnRleHRvfSwgbcOheGltYSBkZSAke3RlbXBNYXh9IGdyYXVzLCBtw61uaW1hIGRlICR7dGVtcE1pbn0gZ3JhdXMsICR7Y2hhbmNlQ2h1dmF9JSBkZSBjaGFuY2UgZGUgY2h1dmEuYCk7XG5cbiAgICBjYXJkRGlhLmlubmVySFRNTCA9IGBcbiAgICAgIDxkaXYgY2xhc3M9XCJmb3JlY2FzdC13ZWVrZGF5XCI+JHtub21lRGlhU2VtYW5hfTwvZGl2PlxuICAgICAgPGRpdiBjbGFzcz1cImZvcmVjYXN0LWRhdGVcIj4ke2RhdGFGb3JtYXRhZGF9PC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzPVwiZm9yZWNhc3QtZW1vamlcIiBhcmlhLWhpZGRlbj1cInRydWVcIj4ke2luZm9EaWEuZW1vaml9PC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzPVwiZm9yZWNhc3QtZGVzY1wiPiR7aW5mb0RpYS50ZXh0b308L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3M9XCJmb3JlY2FzdC10ZW1wc1wiPlxuICAgICAgICA8c3BhbiBjbGFzcz1cInRlbXAtbWF4XCIgdGl0bGU9XCJUZW1wZXJhdHVyYSBtw6F4aW1hXCI+JHt0ZW1wTWF4fcKwPC9zcGFuPlxuICAgICAgICA8c3BhbiBzdHlsZT1cImNvbG9yOiB2YXIoLS10ZXh0LXNvZnQpO1wiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPi88L3NwYW4+XG4gICAgICAgIDxzcGFuIGNsYXNzPVwidGVtcC1taW5cIiB0aXRsZT1cIlRlbXBlcmF0dXJhIG3DrW5pbWFcIj4ke3RlbXBNaW59wrA8L3NwYW4+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3M9XCJmb3JlY2FzdC1yYWluXCIgdGl0bGU9XCJQcm9iYWJpbGlkYWRlIGRlIGNodXZhXCI+XG4gICAgICAgIDxzcGFuIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPvCfkqc8L3NwYW4+XG4gICAgICAgIDxzcGFuPiR7Y2hhbmNlQ2h1dmF9JTwvc3Bhbj5cbiAgICAgIDwvZGl2PlxuICAgIGA7XG5cbiAgICBlbEZvcmVjYXN0R3JpZC5hcHBlbmRDaGlsZChjYXJkRGlhKTtcbiAgfVxuXG4gIC8vIDQuIEF0dWFsaXphIGEgY2FpeGEgZGUgaW5zcGXDp8OjbyBpbnRlcmF0aXZhIGRhIHNlw6fDo28gXCJDb21vIEZ1bmNpb25hXCJcbiAgYXR1YWxpemFySW5zcGVjYW9Bb1Zpdm8ocGFjb3RlQ29tcGxldG8pO1xuXG4gIC8vIEdhcmFudGUgcXVlIGEgY2FpeGEgZGUgZXJybyBlc3RlamEgZXNjb25kaWRhIGUgbGltcGEgbm8gc3VjZXNzb1xuICBlc2NvbmRlckVycm8oKTtcblxuICAvLyBFeGliZSBhIMOhcmVhIGRlIHJlc3VsdGFkb3MgY29tIGVmZWl0byBzdWF2ZVxuICBpZiAocmVzdWx0YWRvQ29udGFpbmVyKSB7XG4gICAgcmVzdWx0YWRvQ29udGFpbmVyLmhpZGRlbiA9IGZhbHNlO1xuICAgIHJlc3VsdGFkb0NvbnRhaW5lci5jbGFzc0xpc3QucmVtb3ZlKCdvY3VsdG8nKTtcbiAgICByZXN1bHRhZG9Db250YWluZXIuc2Nyb2xsSW50b1ZpZXcoeyBiZWhhdmlvcjogJ3Ntb290aCcsIGJsb2NrOiAnbmVhcmVzdCcgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBBdHVhbGl6YSBvIHBhaW5lbCBkZSBpbnNwZcOnw6NvIG5hIHNlw6fDo28gXCJDb21vIEZ1bmNpb25hXCIsIG1vc3RyYW5kbyBvcyBkYWRvcyByZWFpc1xuICogZGEgw7psdGltYSBjb25zdWx0YSByZWFsaXphZGEuXG4gKi9cbmZ1bmN0aW9uIGF0dWFsaXphckluc3BlY2FvQW9WaXZvKGRhZG9zKSB7XG4gIGlmICghZWxJbnNwZWN0Q29udGVudCkgcmV0dXJuO1xuXG4gIGNvbnN0IHJlc3VtbyA9IHtcbiAgICBwYXNzbzFfdmlhQ2VwOiB7XG4gICAgICByZXF1aXNpY2FvOiBkYWRvcy5lbmRlcmVjby51cmxDaGFtYWRhLFxuICAgICAgcmV0b3Jubzoge1xuICAgICAgICBjZXA6IGRhZG9zLmVuZGVyZWNvLmNlcEZvcm1hdGFkbyxcbiAgICAgICAgY2lkYWRlOiBkYWRvcy5lbmRlcmVjby5jaWRhZGUsXG4gICAgICAgIHVmOiBkYWRvcy5lbmRlcmVjby51ZixcbiAgICAgICAgYmFpcnJvOiBkYWRvcy5lbmRlcmVjby5iYWlycm8gfHwgJyhuw6NvIGluZm9ybWFkbyknLFxuICAgICAgfVxuICAgIH0sXG4gICAgcGFzc28yX2dlb2NvZGlmaWNhY2FvOiB7XG4gICAgICByZXF1aXNpY2FvOiBkYWRvcy5jb29yZGVuYWRhcy51cmxDaGFtYWRhLFxuICAgICAgcmV0b3Jubzoge1xuICAgICAgICBsYXRpdHVkZTogZGFkb3MuY29vcmRlbmFkYXMubGF0aXR1ZGUsXG4gICAgICAgIGxvbmdpdHVkZTogZGFkb3MuY29vcmRlbmFkYXMubG9uZ2l0dWRlLFxuICAgICAgICBmdXNvX2hvcmFyaW86IGRhZG9zLmNvb3JkZW5hZGFzLnRpbWV6b25lXG4gICAgICB9XG4gICAgfSxcbiAgICBwYXNzbzNfcHJldmlzYW9NZXRlbzoge1xuICAgICAgcmVxdWlzaWNhbzogZGFkb3MucHJldmlzYW8udXJsQ2hhbWFkYSxcbiAgICAgIHJldG9ybm9SZXN1bWlkbzoge1xuICAgICAgICB0ZW1wZXJhdHVyYV9hdHVhbDogYCR7ZGFkb3MucHJldmlzYW8uZGFkb3MuY3VycmVudC50ZW1wZXJhdHVyZV8ybX3CsENgLFxuICAgICAgICBzZW5zYWNhbzogYCR7ZGFkb3MucHJldmlzYW8uZGFkb3MuY3VycmVudC5hcHBhcmVudF90ZW1wZXJhdHVyZX3CsENgLFxuICAgICAgICB1bWlkYWRlOiBgJHtkYWRvcy5wcmV2aXNhby5kYWRvcy5jdXJyZW50LnJlbGF0aXZlX2h1bWlkaXR5XzJtfSVgLFxuICAgICAgICB2ZW50bzogYCR7ZGFkb3MucHJldmlzYW8uZGFkb3MuY3VycmVudC53aW5kX3NwZWVkXzEwbX0ga20vaGAsXG4gICAgICAgIGNvZGlnb190ZW1wbzogZGFkb3MucHJldmlzYW8uZGFkb3MuY3VycmVudC53ZWF0aGVyX2NvZGUsXG4gICAgICAgIGRpYXNfcHJldmlzYW86IGRhZG9zLnByZXZpc2FvLmRhZG9zLmRhaWx5LnRpbWUubGVuZ3RoXG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIGVsSW5zcGVjdENvbnRlbnQudGV4dENvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShyZXN1bW8sIG51bGwsIDIpO1xufVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgNy4gRmx1eG8gUHJpbmNpcGFsIGRlIEJ1c2NhXG4gICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLyoqXG4gKiBPcnF1ZXN0cmEgYXMgMyBjb25zdWx0YXMgZGUgZm9ybWEgc2VxdWVuY2lhbCBjb20gYXN5bmMvYXdhaXQgZSB0cnkvY2F0Y2hcbiAqIEBwYXJhbSB7c3RyaW5nfSBjZXBcbiAqL1xuYXN5bmMgZnVuY3Rpb24gZXhlY3V0YXJCdXNjYShjZXApIHtcbiAgLy8gMS4gTGltcGEgZSBlc2NvbmRlIGVycm9zIGFudGVyaW9yZXMgZSBlc2NvbmRlIHJlc3VsdGFkb3MgYW50ZXJpb3Jlc1xuICBlc2NvbmRlckVycm8oKTtcbiAgaWYgKHJlc3VsdGFkb0NvbnRhaW5lcikge1xuICAgIHJlc3VsdGFkb0NvbnRhaW5lci5oaWRkZW4gPSB0cnVlO1xuICAgIHJlc3VsdGFkb0NvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdvY3VsdG8nKTtcbiAgfVxuICBkZWZpbmlyQ2FycmVnYW5kbyh0cnVlKTtcblxuICB0cnkge1xuICAgIC8vIDEuIEV0YXBhIDE6IFZpYUNFUFxuICAgIGF0dWFsaXphck1lbnNhZ2VtQ2FycmVnYW5kbygnMS8zIC0gQ29uc3VsdGFuZG8gQ0VQIG5vIFZpYUNFUC4uLicsIDEpO1xuICAgIGNvbnN0IGVuZGVyZWNvID0gYXdhaXQgYnVzY2FyQ2VwKGNlcCk7XG5cbiAgICAvLyAyLiBFdGFwYSAyOiBPcGVuLU1ldGVvIEdlb2NvZGluZ1xuICAgIGF0dWFsaXphck1lbnNhZ2VtQ2FycmVnYW5kbyhgMi8zIC0gQnVzY2FuZG8gY29vcmRlbmFkYXMgZGUgJHtlbmRlcmVjby5jaWRhZGV9ICgke2VuZGVyZWNvLnVmfSkuLi5gLCAyKTtcbiAgICBjb25zdCBjb29yZGVuYWRhcyA9IGF3YWl0IGJ1c2NhckNvb3JkZW5hZGFzKGVuZGVyZWNvLmNpZGFkZSwgZW5kZXJlY28udWYpO1xuXG4gICAgLy8gMy4gRXRhcGEgMzogT3Blbi1NZXRlbyBGb3JlY2FzdFxuICAgIGF0dWFsaXphck1lbnNhZ2VtQ2FycmVnYW5kbyhgMy8zIC0gQmFpeGFuZG8gcHJldmlzw6NvIGRvIHRlbXBvIGUgcHLDs3hpbW9zIDUgZGlhcy4uLmAsIDMpO1xuICAgIGNvbnN0IHByZXZpc2FvID0gYXdhaXQgYnVzY2FyUHJldmlzYW8oY29vcmRlbmFkYXMubGF0aXR1ZGUsIGNvb3JkZW5hZGFzLmxvbmdpdHVkZSk7XG5cbiAgICAvLyBTYWx2YSBvIHBhY290ZSBjb21wbGV0byBlIG1vc3RyYSBvIHJlc3VsdGFkb1xuICAgIHVsdGltb1Jlc3VsdGFkb0dsb2JhbCA9IHtcbiAgICAgIGVuZGVyZWNvLFxuICAgICAgY29vcmRlbmFkYXMsXG4gICAgICBwcmV2aXNhbyxcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgfTtcblxuICAgIG1vc3RyYXJSZXN1bHRhZG8odWx0aW1vUmVzdWx0YWRvR2xvYmFsKTtcblxuICB9IGNhdGNoIChlcnJvKSB7XG4gICAgY29uc29sZS53YXJuKCdDb25zdWx0YSBkZSBjbGltYSBuw6NvIGNvbmNsdcOtZGE6JywgZXJyby5tZXNzYWdlIHx8IGVycm8pO1xuICAgIG1vc3RyYXJFcnJvKGVycm8ubWVzc2FnZSB8fCAnT2NvcnJldSB1bSBlcnJvIGFvIGNvbnN1bHRhciBvIGNsaW1hLicpO1xuICB9IGZpbmFsbHkge1xuICAgIGRlZmluaXJDYXJyZWdhbmRvKGZhbHNlKTtcbiAgfVxufVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgOC4gRnVuw6fDtWVzIGRlIEF1eMOtbGlvIGRlIEludGVyZmFjZSAoRmVlZGJhY2ssIExvYWRpbmcsIEVycm8pXG4gICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuZnVuY3Rpb24gZGVmaW5pckNhcnJlZ2FuZG8oYXRpdm8pIHtcbiAgaWYgKCFzdGF0dXNDb250YWluZXIgfHwgIWJ0bkJ1c2NhcikgcmV0dXJuO1xuXG4gIGlmIChhdGl2bykge1xuICAgIHN0YXR1c0NvbnRhaW5lci5oaWRkZW4gPSBmYWxzZTtcbiAgICBzdGF0dXNDb250YWluZXIuY2xhc3NMaXN0LnJlbW92ZSgnb2N1bHRvJyk7XG4gICAgYnRuQnVzY2FyLmRpc2FibGVkID0gdHJ1ZTtcbiAgICBidG5CdXNjYXIuaW5uZXJIVE1MID0gJzxzcGFuIGNsYXNzPVwic3Bpbm5lclwiIHN0eWxlPVwid2lkdGg6MThweDtoZWlnaHQ6MThweDtib3JkZXItd2lkdGg6MnB4O21hcmdpbjowO1wiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPjwvc3Bhbj4gQnVzY2FuZG8uLi4nO1xuICB9IGVsc2Uge1xuICAgIHN0YXR1c0NvbnRhaW5lci5oaWRkZW4gPSB0cnVlO1xuICAgIHN0YXR1c0NvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdvY3VsdG8nKTtcbiAgICBidG5CdXNjYXIuZGlzYWJsZWQgPSBmYWxzZTtcbiAgICBidG5CdXNjYXIuaW5uZXJIVE1MID0gJzxzcGFuIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPvCflI08L3NwYW4+IEJ1c2NhciBDbGltYSc7XG4gIH1cbn1cblxuZnVuY3Rpb24gYXR1YWxpemFyTWVuc2FnZW1DYXJyZWdhbmRvKHRleHRvLCBldGFwYSkge1xuICBpZiAoc3RhdHVzVGV4dG8pIHtcbiAgICBzdGF0dXNUZXh0by50ZXh0Q29udGVudCA9IHRleHRvO1xuICB9XG4gIC8vIEF0dWFsaXphIGluZGljYWRvcmVzIGRlIGV0YXBhcyBzZSBleGlzdGlyZW1cbiAgZm9yIChsZXQgaSA9IDE7IGkgPD0gMzsgaSsrKSB7XG4gICAgY29uc3QgZWxTdGVwID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYHN0ZXAtJHtpfWApO1xuICAgIGlmIChlbFN0ZXApIHtcbiAgICAgIGlmIChpIDwgZXRhcGEpIHtcbiAgICAgICAgZWxTdGVwLmNsYXNzTmFtZSA9ICdzdGVwLWl0ZW0gZG9uZSc7XG4gICAgICB9IGVsc2UgaWYgKGkgPT09IGV0YXBhKSB7XG4gICAgICAgIGVsU3RlcC5jbGFzc05hbWUgPSAnc3RlcC1pdGVtIGFjdGl2ZSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbFN0ZXAuY2xhc3NOYW1lID0gJ3N0ZXAtaXRlbSc7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG1vc3RyYXJFcnJvKG1lbnNhZ2VtKSB7XG4gIC8vIEVzY29uZGUgZSByZW1vdmUgYSDDoXJlYSBkZSByZXN1bHRhZG9zIGltZWRpYXRhbWVudGVcbiAgaWYgKHJlc3VsdGFkb0NvbnRhaW5lcikge1xuICAgIHJlc3VsdGFkb0NvbnRhaW5lci5oaWRkZW4gPSB0cnVlO1xuICAgIHJlc3VsdGFkb0NvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdvY3VsdG8nKTtcbiAgfVxuICAvLyBHYXJhbnRlIHF1ZSBvIGluZGljYWRvciBkZSBjYXJyZWdhbmRvIHNlamEgZXNjb25kaWRvXG4gIGlmIChzdGF0dXNDb250YWluZXIpIHtcbiAgICBzdGF0dXNDb250YWluZXIuaGlkZGVuID0gdHJ1ZTtcbiAgICBzdGF0dXNDb250YWluZXIuY2xhc3NMaXN0LmFkZCgnb2N1bHRvJyk7XG4gIH1cbiAgLy8gRXhpYmUgYSBjYWl4YSBkZSBlcnJvIGNvbSBvIHRleHRvIGVzcGVjw61maWNvIGRhIGZhbGhhXG4gIGlmIChlcnJvQ29udGFpbmVyICYmIGVycm9NZW5zYWdlbSkge1xuICAgIGVycm9NZW5zYWdlbS50ZXh0Q29udGVudCA9IG1lbnNhZ2VtO1xuICAgIGVycm9Db250YWluZXIuaGlkZGVuID0gZmFsc2U7XG4gICAgZXJyb0NvbnRhaW5lci5jbGFzc0xpc3QucmVtb3ZlKCdvY3VsdG8nKTtcbiAgICBlcnJvQ29udGFpbmVyLnNjcm9sbEludG9WaWV3KHsgYmVoYXZpb3I6ICdzbW9vdGgnLCBibG9jazogJ25lYXJlc3QnIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGVzY29uZGVyRXJybygpIHtcbiAgaWYgKGVycm9Db250YWluZXIpIHtcbiAgICBlcnJvQ29udGFpbmVyLmhpZGRlbiA9IHRydWU7XG4gICAgZXJyb0NvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdvY3VsdG8nKTtcbiAgfVxuICBpZiAoZXJyb01lbnNhZ2VtKSB7XG4gICAgZXJyb01lbnNhZ2VtLnRleHRDb250ZW50ID0gJyc7XG4gIH1cbn1cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgIDkuIE3DoXNjYXJhIGUgRm9ybWF0YcOnw6NvIGRvIENhbXBvIGRlIENFUFxuICAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbi8qKlxuICogRm9ybWF0YSBvIHZhbG9yIGRpZ2l0YWRvIGF1dG9tYXRpY2FtZW50ZSBjb21vIDAwMDAwLTAwMCBlbnF1YW50byBvIHVzdcOhcmlvIGRpZ2l0YVxuICovXG5pbnB1dENlcC5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsIChldmVudG8pID0+IHtcbiAgbGV0IHZhbG9yID0gZXZlbnRvLnRhcmdldC52YWx1ZS5yZXBsYWNlKC9cXEQvZywgJycpOyAvLyBhcGVuYXMgbsO6bWVyb3NcbiAgaWYgKHZhbG9yLmxlbmd0aCA+IDgpIHtcbiAgICB2YWxvciA9IHZhbG9yLnNsaWNlKDAsIDgpO1xuICB9XG5cbiAgLy8gQXBsaWNhIGjDrWZlbiBhcMOzcyBvIDXCuiBkw61naXRvXG4gIGlmICh2YWxvci5sZW5ndGggPiA1KSB7XG4gICAgZXZlbnRvLnRhcmdldC52YWx1ZSA9IGAke3ZhbG9yLnNsaWNlKDAsIDUpfS0ke3ZhbG9yLnNsaWNlKDUpfWA7XG4gIH0gZWxzZSB7XG4gICAgZXZlbnRvLnRhcmdldC52YWx1ZSA9IHZhbG9yO1xuICB9XG5cbiAgLy8gQXR1YWxpemEgdmlzaWJpbGlkYWRlIGRvIGJvdMOjbyBsaW1wYXJcbiAgYnRuTGltcGFyLnN0eWxlLmRpc3BsYXkgPSB2YWxvci5sZW5ndGggPiAwID8gJ2ZsZXgnIDogJ25vbmUnO1xuICBcbiAgLy8gTGltcGEgZXJybyBuYSBkaWdpdGHDp8OjbyBzZSBob3V2ZXJcbiAgZXNjb25kZXJFcnJvKCk7XG59KTtcblxuYnRuTGltcGFyLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICBpbnB1dENlcC52YWx1ZSA9ICcnO1xuICBidG5MaW1wYXIuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgaW5wdXRDZXAuZm9jdXMoKTtcbiAgZXNjb25kZXJFcnJvKCk7XG59KTtcblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgIDEwLiBFdmVudG9zIGRlIFN1Ym1pc3PDo28gZSBDaGlwcyBSw6FwaWRvc1xuICAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbmZvcm1DZXAuYWRkRXZlbnRMaXN0ZW5lcignc3VibWl0JywgKGV2ZW50bykgPT4ge1xuICBldmVudG8ucHJldmVudERlZmF1bHQoKTtcbiAgY29uc3QgY2VwID0gaW5wdXRDZXAudmFsdWUudHJpbSgpO1xuICBpZiAoIWNlcCkge1xuICAgIG1vc3RyYXJFcnJvKCdQb3IgZmF2b3IsIGRpZ2l0ZSB1bSBDRVAgcGFyYSBjb25zdWx0YXIgbyBjbGltYS4nKTtcbiAgICBpbnB1dENlcC5mb2N1cygpO1xuICAgIHJldHVybjtcbiAgfVxuICBleGVjdXRhckJ1c2NhKGNlcCk7XG59KTtcblxuLy8gQ2hpcHMgZGUgdGVzdGUgcsOhcGlkbyBkZSBDRVBzIGRlIHbDoXJpYXMgcmVnacO1ZXMgZG8gQnJhc2lsXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuY2hpcC1jZXAnKS5mb3JFYWNoKGJvdGFvQ2hpcCA9PiB7XG4gIGJvdGFvQ2hpcC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICBjb25zdCBjZXAgPSBib3Rhb0NoaXAuZ2V0QXR0cmlidXRlKCdkYXRhLWNlcCcpO1xuICAgIGlmIChjZXApIHtcbiAgICAgIGlucHV0Q2VwLnZhbHVlID0gY2VwO1xuICAgICAgYnRuTGltcGFyLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XG4gICAgICBleGVjdXRhckJ1c2NhKGNlcCk7XG4gICAgfVxuICB9KTtcbn0pO1xuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgMTEuIEFsdGVybsOibmNpYSBkZSBNb2RvIEVzY3VybyAvIE1vZG8gQ2xhcm8gKERhcmsvTGlnaHQgTW9kZSlcbiAgIE8gTW9kbyBFc2N1cm8gw6kgbyBwYWRyw6NvIGNvbmZvcm1lIHNvbGljaXRhZG9cbiAgID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5jb25zdCBURU1BX1NUT1JBR0VfS0VZID0gJ2NsaW1hX2NlcF90ZW1hJztcblxuZnVuY3Rpb24gYXBsaWNhclRlbWEodGVtYSkge1xuICBpZiAodGVtYSA9PT0gJ2xpZ2h0Jykge1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2RhdGEtdGhlbWUnLCAnbGlnaHQnKTtcbiAgICBpZiAoYnRuVGVtYSkge1xuICAgICAgYnRuVGVtYS5pbm5lckhUTUwgPSAnPHNwYW4gY2xhc3M9XCJidG4tdGhlbWUtaWNvblwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPuKYgO+4jzwvc3Bhbj4gPHNwYW4+TW9kbyBDbGFybzwvc3Bhbj4nO1xuICAgICAgYnRuVGVtYS5zZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnLCAnQWx0ZXJuYXIgcGFyYSBNb2RvIEVzY3VybycpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2V0QXR0cmlidXRlKCdkYXRhLXRoZW1lJywgJ2RhcmsnKTtcbiAgICBpZiAoYnRuVGVtYSkge1xuICAgICAgYnRuVGVtYS5pbm5lckhUTUwgPSAnPHNwYW4gY2xhc3M9XCJidG4tdGhlbWUtaWNvblwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPvCfjJk8L3NwYW4+IDxzcGFuPk1vZG8gRXNjdXJvPC9zcGFuPic7XG4gICAgICBidG5UZW1hLnNldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcsICdBbHRlcm5hciBwYXJhIE1vZG8gQ2xhcm8nKTtcbiAgICB9XG4gIH1cbn1cblxuLy8gSW5pY2lhbGl6YSBvIHRlbWEgKE1vZG8gRXNjdXJvIGNvbW8gcGFkcsOjbylcbmZ1bmN0aW9uIGluaWNpYWxpemFyVGVtYSgpIHtcbiAgY29uc3QgdGVtYVNhbHZvID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oVEVNQV9TVE9SQUdFX0tFWSk7XG4gIGlmICh0ZW1hU2Fsdm8gPT09ICdsaWdodCcpIHtcbiAgICBhcGxpY2FyVGVtYSgnbGlnaHQnKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBQYWRyw6NvIG9icmlnYXTDs3JpbzogRXNjdXJvXG4gICAgYXBsaWNhclRlbWEoJ2RhcmsnKTtcbiAgfVxufVxuXG5idG5UZW1hLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICBjb25zdCB0ZW1hQXR1YWwgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLXRoZW1lJykgfHwgJ2RhcmsnO1xuICBjb25zdCBub3ZvVGVtYSA9IHRlbWFBdHVhbCA9PT0gJ2RhcmsnID8gJ2xpZ2h0JyA6ICdkYXJrJztcbiAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oVEVNQV9TVE9SQUdFX0tFWSwgbm92b1RlbWEpO1xuICBhcGxpY2FyVGVtYShub3ZvVGVtYSk7XG59KTtcblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgIDEyLiBFeHBvcnRhw6fDo28gZSBEb3dubG9hZCBkb3MgQXJxdWl2b3MgZG8gUHJvamV0byAoUHJvbnRvIHBhcmEgR2l0SHViIFBhZ2VzKVxuICAgR2VyYSBvcyBhcnF1aXZvcyBpbmRleC5odG1sLCBzdHlsZS5jc3MsIHNjcmlwdC5qcyBlIFJFQURNRS5tZCBwYXJhIGRvd25sb2FkXG4gICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLyoqXG4gKiBGYXogZG93bmxvYWQgZGUgdW0gdGV4dG8gY29tbyBhcnF1aXZvIG5vIG5hdmVnYWRvclxuICogQHBhcmFtIHtzdHJpbmd9IG5vbWVBcnF1aXZvXG4gKiBAcGFyYW0ge3N0cmluZ30gY29udGV1ZG9cbiAqIEBwYXJhbSB7c3RyaW5nfSB0aXBvTWltZVxuICovXG5mdW5jdGlvbiBiYWl4YXJBcnF1aXZvKG5vbWVBcnF1aXZvLCBjb250ZXVkbywgdGlwb01pbWUgPSAndGV4dC9wbGFpbjtjaGFyc2V0PXV0Zi04Jykge1xuICBjb25zdCBibG9iID0gbmV3IEJsb2IoW2NvbnRldWRvXSwgeyB0eXBlOiB0aXBvTWltZSB9KTtcbiAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgY29uc3QgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgbGluay5ocmVmID0gdXJsO1xuICBsaW5rLmRvd25sb2FkID0gbm9tZUFycXVpdm87XG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobGluayk7XG4gIGxpbmsuY2xpY2soKTtcbiAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChsaW5rKTtcbiAgVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpO1xufVxuXG4vKipcbiAqIFV0aWxpdMOhcmlvIHBhcmEgb2J0ZXIgbyBjb250ZcO6ZG8gbGltcG8gZSBvcmlnaW5hbCBkZSB1bSBhcnF1aXZvIGRvIHByb2pldG9cbiAqIEBwYXJhbSB7c3RyaW5nfSBub21lQXJxdWl2b1xuICogQHJldHVybnMge1Byb21pc2U8c3RyaW5nPn1cbiAqL1xuYXN5bmMgZnVuY3Rpb24gb2J0ZXJDb250ZXVkb0xpbXBvKG5vbWVBcnF1aXZvKSB7XG4gIC8vIDEuIFRlbnRhIGJ1c2NhciBkaXJldG9cbiAgY29uc3QgcmVzcCA9IGF3YWl0IGZldGNoKG5vbWVBcnF1aXZvKTtcbiAgaWYgKCFyZXNwLm9rKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBOw6NvIGZvaSBwb3Nzw612ZWwgY2FycmVnYXIgJHtub21lQXJxdWl2b30gKFN0YXR1czogJHtyZXNwLnN0YXR1c30pYCk7XG4gIH1cbiAgbGV0IHRleHRvID0gYXdhaXQgcmVzcC50ZXh0KCk7XG5cbiAgLy8gMi4gU2UgbyBhbWJpZW50ZSBkZSBkZXNlbnZvbHZpbWVudG8gKGV4OiBWaXRlKSB0aXZlciBlbnZlbG9wYWRvIG8gQ1NTIGVtIEpTOlxuICBpZiAobm9tZUFycXVpdm8uZW5kc1dpdGgoJy5jc3MnKSAmJiB0ZXh0by5pbmNsdWRlcygnX192aXRlX19jc3MgPScpKSB7XG4gICAgY29uc3QgbWF0Y2ggPSB0ZXh0by5tYXRjaCgvX192aXRlX19jc3NcXHMqPVxccyooXCIuKj9cIilcXG4vcyk7XG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShtYXRjaFsxXSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignRmFsbGJhY2sgbmEgZGVjb2RpZmljYcOnw6NvIGRvIENTUzonLCBlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyAzLiBTZSBvIEhUTUwgY29udGl2ZXIgbyBzY3JpcHQgZG8gVml0ZSBpbmpldGFkbyBubyBjYWJlw6dhbGhvICg8c2NyaXB0IHR5cGU9XCJtb2R1bGVcIiBzcmM9XCIvQHZpdGUvY2xpZW50XCI+PC9zY3JpcHQ+KSxcbiAgLy8gbGltcGFtb3MgZXNzYSB0YWcgcGFyYSBxdWUgbyBhcnF1aXZvIGZpcXVlIDEwMCUgcHVybyBwYXJhIEdpdEh1YiBQYWdlczpcbiAgaWYgKG5vbWVBcnF1aXZvID09PSAnaW5kZXguaHRtbCcpIHtcbiAgICB0ZXh0byA9IHRleHRvLnJlcGxhY2UoLzxzY3JpcHQgdHlwZT1cIm1vZHVsZVwiIHNyYz1cIlxcL0B2aXRlXFwvY2xpZW50XCI+PFxcL3NjcmlwdD5cXHMqL2csICcnKTtcbiAgfVxuXG4gIHJldHVybiB0ZXh0bztcbn1cblxuLyoqXG4gKiBVdGlsaXTDoXJpbyBwYXJhIGJhaXhhciBvcyBhcnF1aXZvcyBpbmRpdmlkdWFpcyBkbyBwcm9qZXRvXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGJhaXhhckFycXVpdm9Qcm9qZXRvKG5vbWVBcnF1aXZvKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgdGV4dG8gPSBhd2FpdCBvYnRlckNvbnRldWRvTGltcG8obm9tZUFycXVpdm8pO1xuICAgIGNvbnN0IG1pbWUgPSBub21lQXJxdWl2by5lbmRzV2l0aCgnLmh0bWwnKSA/ICd0ZXh0L2h0bWw7Y2hhcnNldD11dGYtOCcgOlxuICAgICAgICAgICAgICAgICBub21lQXJxdWl2by5lbmRzV2l0aCgnLmNzcycpID8gJ3RleHQvY3NzO2NoYXJzZXQ9dXRmLTgnIDpcbiAgICAgICAgICAgICAgICAgbm9tZUFycXVpdm8uZW5kc1dpdGgoJy5qcycpID8gJ2FwcGxpY2F0aW9uL2phdmFzY3JpcHQ7Y2hhcnNldD11dGYtOCcgOlxuICAgICAgICAgICAgICAgICAndGV4dC9tYXJrZG93bjtjaGFyc2V0PXV0Zi04JztcbiAgICBiYWl4YXJBcnF1aXZvKG5vbWVBcnF1aXZvLCB0ZXh0bywgbWltZSk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUud2FybignRmFsaGEgbm8gZG93bmxvYWQgZGlyZXRvOicsIGVycik7XG4gICAgYWxlcnQoYEVycm8gYW8gYmFpeGFyICR7bm9tZUFycXVpdm99OiAke2Vyci5tZXNzYWdlfWApO1xuICB9XG59XG5cbi8qKlxuICogQ3JpYSB1bSBhcnF1aXZvIC5aSVAgZGlyZXRhbWVudGUgbm8gbmF2ZWdhZG9yIChzZW0gYmlibGlvdGVjYXMgZXh0ZXJuYXMpXG4gKiB1c2FuZG8gYSBlc3BlY2lmaWNhw6fDo28gcGFkcsOjbyBaSVAgKGZvcm1hdG8gUEtaSVAgcHVybylcbiAqL1xuYXN5bmMgZnVuY3Rpb24gYmFpeGFyUHJvamV0b0NvbXBsZXRvWmlwKCkge1xuICBjb25zdCBhcnF1aXZvc1BhcmFaaXAgPSBbJ2luZGV4Lmh0bWwnLCAnc3R5bGUuY3NzJywgJ3NjcmlwdC5qcycsICdSRUFETUUubWQnXTtcbiAgY29uc3QgYXJxdWl2b3NDb250ZXVkbyA9IFtdO1xuXG4gIHRyeSB7XG4gICAgYnRuQmFpeGFyVHVkby50ZXh0Q29udGVudCA9ICdQcmVwYXJhbmRvIFpJUC4uLic7XG4gICAgYnRuQmFpeGFyVHVkby5kaXNhYmxlZCA9IHRydWU7XG5cbiAgICBmb3IgKGNvbnN0IG5vbWUgb2YgYXJxdWl2b3NQYXJhWmlwKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCB0ZXh0byA9IGF3YWl0IG9idGVyQ29udGV1ZG9MaW1wbyhub21lKTtcbiAgICAgICAgYXJxdWl2b3NDb250ZXVkby5wdXNoKHsgbm9tZSwgdGV4dG8gfSk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBBdmlzbyBhbyBsZXIgJHtub21lfTpgLCBlcnIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChhcnF1aXZvc0NvbnRldWRvLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdOZW5odW0gYXJxdWl2byBlbmNvbnRyYWRvIHBhcmEgZW1wYWNvdGFyLicpO1xuICAgIH1cblxuICAgIC8vIEdlcmFkb3IgZGUgWklQIHB1cm8gbWluaW1hbGlzdGEgZW0gSlMgcHVyb1xuICAgIGNvbnN0IHppcEJsb2IgPSBnZXJhclppcFB1cm8oYXJxdWl2b3NDb250ZXVkbyk7XG4gICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTCh6aXBCbG9iKTtcbiAgICBjb25zdCBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgIGxpbmsuaHJlZiA9IHVybDtcbiAgICBsaW5rLmRvd25sb2FkID0gJ2NsaW1hLXBvci1jZXAtZ2l0aHViLXBhZ2VzLnppcCc7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChsaW5rKTtcbiAgICBsaW5rLmNsaWNrKCk7XG4gICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChsaW5rKTtcbiAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG5cbiAgfSBjYXRjaCAoZXJybykge1xuICAgIGNvbnNvbGUud2FybignRmFsbGJhY2sgbm8gZ2VyYWRvciBkZSBaSVA6JywgZXJybyk7XG4gICAgLy8gRmFsbGJhY2s6IHNlIGhvdXZlciBmYWxoYSBubyBaSVAsIGJhaXhhIG9zIGFycXVpdm9zIGluZGl2aWR1YWxtZW50ZVxuICAgIGZvciAoY29uc3QgYXJxIG9mIGFycXVpdm9zUGFyYVppcCkge1xuICAgICAgYXdhaXQgYmFpeGFyQXJxdWl2b1Byb2pldG8oYXJxKTtcbiAgICB9XG4gIH0gZmluYWxseSB7XG4gICAgYnRuQmFpeGFyVHVkby50ZXh0Q29udGVudCA9ICfwn5OmIEJhaXhhciBUdWRvICguWklQKSc7XG4gICAgYnRuQmFpeGFyVHVkby5kaXNhYmxlZCA9IGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogR2VyYWRvciBjb21wYWN0byBkZSBhcnF1aXZvIFpJUCBwYWRyw6NvIChQS1dBUkUpIGVtIEphdmFTY3JpcHQgcHVyby5cbiAqIEZ1bmNpb25hIG9mZmxpbmUgc2VtIG5lbmh1bWEgZGVwZW5kw6puY2lhIVxuICogQHBhcmFtIHtBcnJheTx7bm9tZTogc3RyaW5nLCB0ZXh0bzogc3RyaW5nfT59IGxpc3RhQXJxdWl2b3NcbiAqIEByZXR1cm5zIHtCbG9ifVxuICovXG5mdW5jdGlvbiBnZXJhclppcFB1cm8obGlzdGFBcnF1aXZvcykge1xuICBjb25zdCBlbmNvZGVyID0gbmV3IFRleHRFbmNvZGVyKCk7XG4gIGNvbnN0IHBhcnRlc0xvY2FpcyA9IFtdO1xuICBjb25zdCBwYXJ0ZXNEaXJldG9yaW9DZW50cmFsID0gW107XG4gIGxldCBkZXNsb2NhbWVudG9PZmZzZXQgPSAwO1xuXG4gIGZvciAoY29uc3QgYXJxIG9mIGxpc3RhQXJxdWl2b3MpIHtcbiAgICBjb25zdCBub21lQnl0ZXMgPSBlbmNvZGVyLmVuY29kZShhcnEubm9tZSk7XG4gICAgY29uc3QgZGFkb3NCeXRlcyA9IGVuY29kZXIuZW5jb2RlKGFycS50ZXh0byk7XG4gICAgY29uc3QgdGFtYW5obyA9IGRhZG9zQnl0ZXMubGVuZ3RoO1xuICAgIGNvbnN0IGNyYyA9IGNhbGN1bGFyQ1JDMzIoZGFkb3NCeXRlcyk7XG5cbiAgICAvLyBDYWJlw6dhbGhvIGRlIEFycXVpdm8gTG9jYWwgKDMwIGJ5dGVzICsgbm9tZSArIGRhZG9zKVxuICAgIGNvbnN0IGNhYmVjYWxob0xvY2FsID0gbmV3IFVpbnQ4QXJyYXkoMzAgKyBub21lQnl0ZXMubGVuZ3RoKTtcbiAgICBjb25zdCBkdkxvY2FsID0gbmV3IERhdGFWaWV3KGNhYmVjYWxob0xvY2FsLmJ1ZmZlcik7XG5cbiAgICBkdkxvY2FsLnNldFVpbnQzMigwLCAweDA0MDM0YjUwLCB0cnVlKTsgLy8gQXNzaW5hdHVyYSAnUEtcXHgwM1xceDA0J1xuICAgIGR2TG9jYWwuc2V0VWludDE2KDQsIDIwLCB0cnVlKTsgICAgICAgICAvLyBWZXJzw6NvIG5lY2Vzc8OhcmlhXG4gICAgZHZMb2NhbC5zZXRVaW50MTYoNiwgMCwgdHJ1ZSk7ICAgICAgICAgIC8vIEZsYWdzIGdlcmFpc1xuICAgIGR2TG9jYWwuc2V0VWludDE2KDgsIDAsIHRydWUpOyAgICAgICAgICAvLyBNw6l0b2RvIGRlIGNvbXByZXNzw6NvICgwID0gU3RvcmUpXG4gICAgZHZMb2NhbC5zZXRVaW50MTYoMTAsIDAsIHRydWUpOyAgICAgICAgIC8vIEhvcmFcbiAgICBkdkxvY2FsLnNldFVpbnQxNigxMiwgMCwgdHJ1ZSk7ICAgICAgICAgLy8gRGF0YVxuICAgIGR2TG9jYWwuc2V0VWludDMyKDE0LCBjcmMsIHRydWUpOyAgICAgICAvLyBDUkMtMzJcbiAgICBkdkxvY2FsLnNldFVpbnQzMigxOCwgdGFtYW5obywgdHJ1ZSk7ICAgLy8gVGFtYW5obyBjb21wcmltaWRvXG4gICAgZHZMb2NhbC5zZXRVaW50MzIoMjIsIHRhbWFuaG8sIHRydWUpOyAgIC8vIFRhbWFuaG8gb3JpZ2luYWxcbiAgICBkdkxvY2FsLnNldFVpbnQxNigyNiwgbm9tZUJ5dGVzLmxlbmd0aCwgdHJ1ZSk7IC8vIENvbXByaW1lbnRvIGRvIG5vbWVcbiAgICBkdkxvY2FsLnNldFVpbnQxNigyOCwgMCwgdHJ1ZSk7ICAgICAgICAgLy8gQ2FtcG8gZXh0cmEgbGVuZ3RoXG5cbiAgICBjYWJlY2FsaG9Mb2NhbC5zZXQobm9tZUJ5dGVzLCAzMCk7XG5cbiAgICBwYXJ0ZXNMb2NhaXMucHVzaChjYWJlY2FsaG9Mb2NhbCk7XG4gICAgcGFydGVzTG9jYWlzLnB1c2goZGFkb3NCeXRlcyk7XG5cbiAgICAvLyBFbnRyYWRhIGRvIERpcmV0w7NyaW8gQ2VudHJhbCAoNDYgYnl0ZXMgKyBub21lKVxuICAgIGNvbnN0IGVudHJhZGFDZW50cmFsID0gbmV3IFVpbnQ4QXJyYXkoNDYgKyBub21lQnl0ZXMubGVuZ3RoKTtcbiAgICBjb25zdCBkdkNlbnRyYWwgPSBuZXcgRGF0YVZpZXcoZW50cmFkYUNlbnRyYWwuYnVmZmVyKTtcblxuICAgIGR2Q2VudHJhbC5zZXRVaW50MzIoMCwgMHgwMjAxNGI1MCwgdHJ1ZSk7IC8vIEFzc2luYXR1cmEgJ1BLXFx4MDFcXHgwMidcbiAgICBkdkNlbnRyYWwuc2V0VWludDE2KDQsIDIwLCB0cnVlKTsgICAgICAgICAgLy8gVmVyc8OjbyBmZWl0YSBwb3JcbiAgICBkdkNlbnRyYWwuc2V0VWludDE2KDYsIDIwLCB0cnVlKTsgICAgICAgICAgLy8gVmVyc8OjbyBuZWNlc3PDoXJpYVxuICAgIGR2Q2VudHJhbC5zZXRVaW50MTYoOCwgMCwgdHJ1ZSk7ICAgICAgICAgICAvLyBGbGFnc1xuICAgIGR2Q2VudHJhbC5zZXRVaW50MTYoMTAsIDAsIHRydWUpOyAgICAgICAgICAvLyBNw6l0b2RvICgwID0gU3RvcmUpXG4gICAgZHZDZW50cmFsLnNldFVpbnQxNigxMiwgMCwgdHJ1ZSk7ICAgICAgICAgIC8vIEhvcmFcbiAgICBkdkNlbnRyYWwuc2V0VWludDE2KDE0LCAwLCB0cnVlKTsgICAgICAgICAgLy8gRGF0YVxuICAgIGR2Q2VudHJhbC5zZXRVaW50MzIoMTYsIGNyYywgdHJ1ZSk7ICAgICAgICAvLyBDUkMtMzJcbiAgICBkdkNlbnRyYWwuc2V0VWludDMyKDIwLCB0YW1hbmhvLCB0cnVlKTsgICAgLy8gVGFtYW5obyBjb21wcmltaWRvXG4gICAgZHZDZW50cmFsLnNldFVpbnQzMigyNCwgdGFtYW5obywgdHJ1ZSk7ICAgIC8vIFRhbWFuaG8gb3JpZ2luYWxcbiAgICBkdkNlbnRyYWwuc2V0VWludDE2KDI4LCBub21lQnl0ZXMubGVuZ3RoLCB0cnVlKTsgLy8gTm9tZSBsZW5ndGhcbiAgICBkdkNlbnRyYWwuc2V0VWludDE2KDMwLCAwLCB0cnVlKTsgICAgICAgICAgLy8gRXh0cmEgZmllbGQgbGVuZ3RoXG4gICAgZHZDZW50cmFsLnNldFVpbnQxNigzMiwgMCwgdHJ1ZSk7ICAgICAgICAgIC8vIENvbWVudMOhcmlvIGxlbmd0aFxuICAgIGR2Q2VudHJhbC5zZXRVaW50MTYoMzQsIDAsIHRydWUpOyAgICAgICAgICAvLyBEaXNjbyBzdGFydFxuICAgIGR2Q2VudHJhbC5zZXRVaW50MTYoMzYsIDAsIHRydWUpOyAgICAgICAgICAvLyBBdHJpYnV0b3MgaW50ZXJub3NcbiAgICBkdkNlbnRyYWwuc2V0VWludDMyKDM4LCAwLCB0cnVlKTsgICAgICAgICAgLy8gQXRyaWJ1dG9zIGV4dGVybm9zXG4gICAgZHZDZW50cmFsLnNldFVpbnQzMig0MiwgZGVzbG9jYW1lbnRvT2Zmc2V0LCB0cnVlKTsgLy8gT2Zmc2V0IGxvY2FsXG5cbiAgICBlbnRyYWRhQ2VudHJhbC5zZXQobm9tZUJ5dGVzLCA0Nik7XG4gICAgcGFydGVzRGlyZXRvcmlvQ2VudHJhbC5wdXNoKGVudHJhZGFDZW50cmFsKTtcblxuICAgIGRlc2xvY2FtZW50b09mZnNldCArPSBjYWJlY2FsaG9Mb2NhbC5sZW5ndGggKyBkYWRvc0J5dGVzLmxlbmd0aDtcbiAgfVxuXG4gIC8vIEZpbSBkbyBSZWdpc3RybyBkbyBEaXJldMOzcmlvIENlbnRyYWwgKEVPQ0QgLSAyMiBieXRlcylcbiAgY29uc3QgdGFtYW5ob0RpcmV0b3Jpb0NlbnRyYWwgPSBwYXJ0ZXNEaXJldG9yaW9DZW50cmFsLnJlZHVjZSgoYWNjLCBwKSA9PiBhY2MgKyBwLmxlbmd0aCwgMCk7XG4gIGNvbnN0IGVvY2QgPSBuZXcgVWludDhBcnJheSgyMik7XG4gIGNvbnN0IGR2RW9jZCA9IG5ldyBEYXRhVmlldyhlb2NkLmJ1ZmZlcik7XG5cbiAgZHZFb2NkLnNldFVpbnQzMigwLCAweDA2MDU0YjUwLCB0cnVlKTsgLy8gQXNzaW5hdHVyYSAnUEtcXHgwNVxceDA2J1xuICBkdkVvY2Quc2V0VWludDE2KDQsIDAsIHRydWUpOyAgICAgICAgICAvLyBOw7ptZXJvIGRvIGRpc2NvXG4gIGR2RW9jZC5zZXRVaW50MTYoNiwgMCwgdHJ1ZSk7ICAgICAgICAgIC8vIERpc2NvIG9uZGUgY29tZcOnYSBvIENEXG4gIGR2RW9jZC5zZXRVaW50MTYoOCwgbGlzdGFBcnF1aXZvcy5sZW5ndGgsIHRydWUpOyAgLy8gRW50cmFkYXMgbm8gZGlzY29cbiAgZHZFb2NkLnNldFVpbnQxNigxMCwgbGlzdGFBcnF1aXZvcy5sZW5ndGgsIHRydWUpOyAvLyBUb3RhbCBkZSBlbnRyYWRhc1xuICBkdkVvY2Quc2V0VWludDMyKDEyLCB0YW1hbmhvRGlyZXRvcmlvQ2VudHJhbCwgdHJ1ZSk7IC8vIFRhbWFuaG8gZG8gQ0RcbiAgZHZFb2NkLnNldFVpbnQzMigxNiwgZGVzbG9jYW1lbnRvT2Zmc2V0LCB0cnVlKTsgICAgICAvLyBPZmZzZXQgZG8gQ0RcbiAgZHZFb2NkLnNldFVpbnQxNigyMCwgMCwgdHJ1ZSk7ICAgICAgICAgIC8vIENvbWVudMOhcmlvIGxlbmd0aFxuXG4gIHJldHVybiBuZXcgQmxvYihbLi4ucGFydGVzTG9jYWlzLCAuLi5wYXJ0ZXNEaXJldG9yaW9DZW50cmFsLCBlb2NkXSwgeyB0eXBlOiAnYXBwbGljYXRpb24vemlwJyB9KTtcbn1cblxuLyoqXG4gKiBUYWJlbGEgZGUgbG9va3VwIHBhcmEgY8OhbGN1bG8gcsOhcGlkbyBkZSBDUkMtMzJcbiAqL1xuY29uc3QgdGFiZWxhQ1JDMzIgPSBuZXcgVWludDMyQXJyYXkoMjU2KTtcbmZvciAobGV0IGkgPSAwOyBpIDwgMjU2OyBpKyspIHtcbiAgbGV0IGMgPSBpO1xuICBmb3IgKGxldCBqID0gMDsgaiA8IDg7IGorKykge1xuICAgIGMgPSAoYyAmIDEpID8gKDB4RURCODgzMjAgXiAoYyA+Pj4gMSkpIDogKGMgPj4+IDEpO1xuICB9XG4gIHRhYmVsYUNSQzMyW2ldID0gYztcbn1cblxuZnVuY3Rpb24gY2FsY3VsYXJDUkMzMih1aW50OEFycmF5KSB7XG4gIGxldCBjcmMgPSAweEZGRkZGRkZGO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHVpbnQ4QXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICBjcmMgPSB0YWJlbGFDUkMzMlsoY3JjIF4gdWludDhBcnJheVtpXSkgJiAweEZGXSBeIChjcmMgPj4+IDgpO1xuICB9XG4gIHJldHVybiAoY3JjIF4gMHhGRkZGRkZGRikgPj4+IDA7XG59XG5cbi8vIEJpbmRzIGRvcyBib3TDtWVzIGRlIGRvd25sb2FkXG5jb25zdCBidG5CYWl4YXJUdWRvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2J0bi1kb3dubG9hZC1hbGwnKTtcbmlmIChidG5CYWl4YXJUdWRvKSB7XG4gIGJ0bkJhaXhhclR1ZG8uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBiYWl4YXJQcm9qZXRvQ29tcGxldG9aaXApO1xufVxuXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1kb3dubG9hZC1maWxlXScpLmZvckVhY2goYnRuID0+IHtcbiAgYnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgY29uc3QgYXJxdWl2byA9IGJ0bi5nZXRBdHRyaWJ1dGUoJ2RhdGEtZG93bmxvYWQtZmlsZScpO1xuICAgIGlmIChhcnF1aXZvKSB7XG4gICAgICBiYWl4YXJBcnF1aXZvUHJvamV0byhhcnF1aXZvKTtcbiAgICB9XG4gIH0pO1xufSk7XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAxMy4gSW5pY2lhbGl6YcOnw6NvIGFvIENhcnJlZ2FyIGEgUMOhZ2luYVxuICAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiB7XG4gIGluaWNpYWxpemFyVGVtYSgpO1xuICBlc2NvbmRlckVycm8oKTtcblxuICAvLyBTZSBvIHVzdcOhcmlvIGrDoSB0aXZlciBkaWdpdGFkbyBhbGdvIGFudGVzIGRvIHJlZnJlc2hcbiAgaWYgKGlucHV0Q2VwLnZhbHVlLnRyaW0oKS5sZW5ndGggPiAwKSB7XG4gICAgYnRuTGltcGFyLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XG4gIH1cblxuICAvLyBGb2NvIG5vIGlucHV0IHBhcmEgY29udmVuacOqbmNpYVxuICBpbnB1dENlcC5mb2N1cygpO1xuXG4gIC8vIEV4ZWN1dGEgdW1hIGNvbnN1bHRhIGluaWNpYWwgaWx1c3RyYXRpdmEgKGV4OiBQcmHDp2EgZGEgU8OpLCBTUDogMDEwMDEtMDAwKVxuICAvLyBwYXJhIHF1ZSBhIHDDoWdpbmEgasOhIGFicmEgYm9uaXRhIGUgZnVuY2lvbmFsXG4gIHRyeSB7XG4gICAgaW5wdXRDZXAudmFsdWUgPSAnMDEwMDEtMDAwJztcbiAgICBidG5MaW1wYXIuc3R5bGUuZGlzcGxheSA9ICdmbGV4JztcbiAgICBleGVjdXRhckJ1c2NhKCcwMTAwMS0wMDAnKTtcbiAgfSBjYXRjaCAoZXJySW5pdCkge1xuICAgIGNvbnNvbGUud2FybignSW5pY2lhbGl6YcOnw6NvIGFkaWFkYTonLCBlcnJJbml0KTtcbiAgfVxufSk7XG4iXX0=
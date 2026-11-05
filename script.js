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

'use strict';

/* ==========================================================================
   1. Dicionário de Códigos de Tempo (WMO Weather Codes)
   Mapeia o código numérico retornado pela Open-Meteo para emoji e texto em PT-BR
   ========================================================================== */
const DICIONARIO_TEMPO = {
  0: { emoji: '☀️', texto: 'Céu limpo' },
  1: { emoji: '🌤️', texto: 'Predominantemente limpo' },
  2: { emoji: '⛅', texto: 'Parcialmente nublado' },
  3: { emoji: '☁️', texto: 'Encoberto / Nublado' },
  45: { emoji: '🌫️', texto: 'Nevoeiro' },
  48: { emoji: '🌫️❄️', texto: 'Nevoeiro com geada' },
  51: { emoji: '🌦️', texto: 'Garoa leve' },
  53: { emoji: '🌧️', texto: 'Garoa moderada' },
  55: { emoji: '🌧️', texto: 'Garoa densa' },
  56: { emoji: '🌨️', texto: 'Garoa congelante leve' },
  57: { emoji: '🌨️', texto: 'Garoa congelante densa' },
  61: { emoji: '🌦️', texto: 'Chuva fraca' },
  63: { emoji: '🌧️', texto: 'Chuva moderada' },
  65: { emoji: '🌧️🌧️', texto: 'Chuva forte' },
  66: { emoji: '🌨️', texto: 'Chuva congelante leve' },
  67: { emoji: '🌨️', texto: 'Chuva congelante forte' },
  71: { emoji: '🌨️', texto: 'Queda de neve leve' },
  73: { emoji: '🌨️', texto: 'Queda de neve moderada' },
  75: { emoji: '❄️', texto: 'Neve intensa' },
  77: { emoji: '❄️', texto: 'Grãos de neve' },
  80: { emoji: '🌦️', texto: 'Pancadas de chuva leve' },
  81: { emoji: '🌧️', texto: 'Pancadas de chuva moderada' },
  82: { emoji: '⛈️', texto: 'Pancadas de chuva violenta' },
  85: { emoji: '🌨️', texto: 'Pancadas de neve leve' },
  86: { emoji: '❄️', texto: 'Pancadas de neve forte' },
  95: { emoji: '⛈️', texto: 'Tempestade com trovoadas' },
  96: { emoji: '⛈️🧊', texto: 'Tempestade com granizo leve' },
  99: { emoji: '⛈️🧊', texto: 'Tempestade com granizo forte' },
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
  return { emoji: '🌡️', texto: 'Tempo variável' };
}

/* ==========================================================================
   2. Elementos do DOM (Cache de referências)
   ========================================================================== */
const formCep = document.getElementById('form-cep');
const inputCep = document.getElementById('cep-input');
const btnBuscar = document.getElementById('btn-buscar');
const btnLimpar = document.getElementById('btn-limpar');
const btnTema = document.getElementById('btn-tema');

const statusContainer = document.getElementById('status-container');
const statusTexto = document.getElementById('status-texto');
const erroContainer = document.getElementById('erro-container');
const erroMensagem = document.getElementById('erro-mensagem');
const resultadoContainer = document.getElementById('resultado-container');

// Elementos de exibição da Localização
const elCidadeUf = document.getElementById('res-cidade-uf');
const elEndereco = document.getElementById('res-endereco');
const elBadgeCep = document.getElementById('badge-cep');
const elBadgeRegiao = document.getElementById('badge-regiao');
const elBadgeDdd = document.getElementById('badge-ddd');
const elBadgeCoords = document.getElementById('badge-coords');

// Elementos do Tempo Atual
const elEmojiAtual = document.getElementById('res-emoji-atual');
const elTempAtual = document.getElementById('res-temp-atual');
const elDescAtual = document.getElementById('res-desc-atual');
const elSensacao = document.getElementById('res-sensacao');
const elUmidade = document.getElementById('res-umidade');
const elVento = document.getElementById('res-vento');
const elHoraMedicao = document.getElementById('res-hora-medicao');

// Grid dos 5 Dias de Previsão
const elForecastGrid = document.getElementById('forecast-grid');

// Painel interativo da seção "Como Funciona"
const elInspectContent = document.getElementById('inspect-live-content');

// Variável para armazenar o último resultado obtido (para inspeção)
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
  const cepLimpo = (cep || '').replace(/\D/g, '');

  // Validação preliminar: o CEP brasileiro precisa ter exatamente 8 dígitos
  if (cepLimpo.length !== 8) {
    throw new Error('CEP inválido. O CEP brasileiro deve conter exatamente 8 números (ex: 01001-000 ou 01001000).');
  }

  // Se o usuário digitou CEP composto apenas pelo mesmo dígito repetido (ex: 00000000)
  if (/^(\d)\1{7}$/.test(cepLimpo)) {
    throw new Error('CEP não encontrado. Por favor, digite um CEP válido (ex: 01001-000).');
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
          bairro: dados.bairro || '',
          logradouro: dados.logradouro || '',
          regiao: dados.regiao || '',
          ddd: dados.ddd || '',
          urlChamada: urlViaCep,
          servico: 'ViaCEP'
        };
      }
    }
  } catch (errViaCep) {
    // ViaCEP indisponível ou bloqueado; segue para o fallback abaixo
  }

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
          bairro: dadosBrasil.neighborhood || '',
          logradouro: dadosBrasil.street || '',
          regiao: '',
          ddd: '',
          urlChamada: urlBrasilApi,
          servico: 'BrasilAPI'
        };
      }
    }
  } catch (errBrasil) {
    // Falha em ambas as fontes
  }

  throw new Error('CEP não encontrado. Verifique se o número digitado está correto e tente novamente.');
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
      const nomeSemAcentos = cidade.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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
      const matchEstado = dados.results.find(item => {
        const admin = (item.admin1 || '').toLowerCase();
        return admin.includes(uf.toLowerCase()) || 
               item.postcodes?.some(pc => pc.startsWith(uf));
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
      timezone: resultadoEscolhido.timezone || 'America/Sao_Paulo',
      urlChamada: url,
    };
  } catch (erro) {
    if (erro.message && erro.message.includes('Failed to fetch')) {
      throw new Error('Falha ao conectar com o serviço de coordenadas geográficas. Verifique sua conexão.');
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
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

  try {
    const resposta = await fetch(url);

    if (!resposta.ok) {
      throw new Error(`Erro ao obter a previsão do tempo na Open-Meteo (Status ${resposta.status}).`);
    }

    const dados = await resposta.json();

    if (!dados.current || !dados.daily) {
      throw new Error('Os dados meteorológicos recebidos estão incompletos. Tente novamente.');
    }

    return {
      dados,
      urlChamada: url,
    };
  } catch (erro) {
    if (erro.message && erro.message.includes('Failed to fetch')) {
      throw new Error('Falha ao conectar com o serviço meteorológico. Verifique sua conexão de internet.');
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
  elEndereco.textContent = partesEndereco.length > 0 
    ? partesEndereco.join(', ') 
    : 'Localidade identificada pelos Correios';

  elBadgeCep.textContent = `CEP: ${endereco.cepFormatado}`;
  elBadgeRegiao.textContent = endereco.regiao ? `Região: ${endereco.regiao}` : `UF: ${endereco.uf}`;
  elBadgeDdd.textContent = endereco.ddd ? `DDD: (${endereco.ddd})` : 'Brasil';
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
  const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  elHoraMedicao.textContent = `Medição atual (${horaFormatada})`;

  // 3. Preenche a Previsão dos Próximos 5 Dias
  elForecastGrid.innerHTML = ''; // Limpa cards anteriores

  // Obtemos até 5 dias a partir de hoje
  const totalDias = Math.min(5, daily.time.length);

  for (let i = 0; i < totalDias; i++) {
    const dataStr = daily.time[i];
    // Adiciona hora para evitar problemas de fuso horário ao criar o objeto Date
    const dataObj = new Date(`${dataStr}T12:00:00`);
    
    // Nomes dos dias da semana em português
    let nomeDiaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'short' });
    nomeDiaSemana = nomeDiaSemana.replace('.', '').toUpperCase();

    // Se for o primeiro dia (hoje)
    if (i === 0) {
      nomeDiaSemana = 'HOJE';
    } else if (i === 1) {
      nomeDiaSemana = 'AMANHÃ';
    }

    const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const codigoClimaDia = daily.weather_code[i];
    const infoDia = interpretarCodigoTempo(codigoClimaDia);

    const tempMax = Math.round(daily.temperature_2m_max[i]);
    const tempMin = Math.round(daily.temperature_2m_min[i]);
    const chanceChuva = daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : 0;

    // Cria o card do dia
    const cardDia = document.createElement('article');
    cardDia.className = 'forecast-day-card';
    cardDia.setAttribute('aria-label', `Previsão para ${nomeDiaSemana}, ${dataFormatada}: ${infoDia.texto}, máxima de ${tempMax} graus, mínima de ${tempMin} graus, ${chanceChuva}% de chance de chuva.`);

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
    resultadoContainer.classList.remove('oculto');
    resultadoContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
        bairro: dados.endereco.bairro || '(não informado)',
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
    resultadoContainer.classList.add('oculto');
  }
  definirCarregando(true);

  try {
    // 1. Etapa 1: ViaCEP
    atualizarMensagemCarregando('1/3 - Consultando CEP no ViaCEP...', 1);
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
    console.warn('Consulta de clima não concluída:', erro.message || erro);
    mostrarErro(erro.message || 'Ocorreu um erro ao consultar o clima.');
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
    statusContainer.classList.remove('oculto');
    btnBuscar.disabled = true;
    btnBuscar.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px;margin:0;" aria-hidden="true"></span> Buscando...';
  } else {
    statusContainer.hidden = true;
    statusContainer.classList.add('oculto');
    btnBuscar.disabled = false;
    btnBuscar.innerHTML = '<span aria-hidden="true">🔍</span> Buscar Clima';
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
        elStep.className = 'step-item done';
      } else if (i === etapa) {
        elStep.className = 'step-item active';
      } else {
        elStep.className = 'step-item';
      }
    }
  }
}

function mostrarErro(mensagem) {
  // Esconde e remove a área de resultados imediatamente
  if (resultadoContainer) {
    resultadoContainer.hidden = true;
    resultadoContainer.classList.add('oculto');
  }
  // Garante que o indicador de carregando seja escondido
  if (statusContainer) {
    statusContainer.hidden = true;
    statusContainer.classList.add('oculto');
  }
  // Exibe a caixa de erro com o texto específico da falha
  if (erroContainer && erroMensagem) {
    erroMensagem.textContent = mensagem;
    erroContainer.hidden = false;
    erroContainer.classList.remove('oculto');
    erroContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function esconderErro() {
  if (erroContainer) {
    erroContainer.hidden = true;
    erroContainer.classList.add('oculto');
  }
  if (erroMensagem) {
    erroMensagem.textContent = '';
  }
}

/* ==========================================================================
   9. Máscara e Formatação do Campo de CEP
   ========================================================================== */
/**
 * Formata o valor digitado automaticamente como 00000-000 enquanto o usuário digita
 */
inputCep.addEventListener('input', (evento) => {
  let valor = evento.target.value.replace(/\D/g, ''); // apenas números
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
  btnLimpar.style.display = valor.length > 0 ? 'flex' : 'none';
  
  // Limpa erro na digitação se houver
  esconderErro();
});

btnLimpar.addEventListener('click', () => {
  inputCep.value = '';
  btnLimpar.style.display = 'none';
  inputCep.focus();
  esconderErro();
});

/* ==========================================================================
   10. Eventos de Submissão e Chips Rápidos
   ========================================================================== */
formCep.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const cep = inputCep.value.trim();
  if (!cep) {
    mostrarErro('Por favor, digite um CEP para consultar o clima.');
    inputCep.focus();
    return;
  }
  executarBusca(cep);
});

// Chips de teste rápido de CEPs de várias regiões do Brasil
document.querySelectorAll('.chip-cep').forEach(botaoChip => {
  botaoChip.addEventListener('click', () => {
    const cep = botaoChip.getAttribute('data-cep');
    if (cep) {
      inputCep.value = cep;
      btnLimpar.style.display = 'flex';
      executarBusca(cep);
    }
  });
});

/* ==========================================================================
   11. Alternância de Modo Escuro / Modo Claro (Dark/Light Mode)
   O Modo Escuro é o padrão conforme solicitado
   ========================================================================== */
const TEMA_STORAGE_KEY = 'clima_cep_tema';

function aplicarTema(tema) {
  if (tema === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    if (btnTema) {
      btnTema.innerHTML = '<span class="btn-theme-icon" aria-hidden="true">☀️</span> <span>Modo Claro</span>';
      btnTema.setAttribute('aria-label', 'Alternar para Modo Escuro');
    }
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (btnTema) {
      btnTema.innerHTML = '<span class="btn-theme-icon" aria-hidden="true">🌙</span> <span>Modo Escuro</span>';
      btnTema.setAttribute('aria-label', 'Alternar para Modo Claro');
    }
  }
}

// Inicializa o tema (Modo Escuro como padrão)
function inicializarTema() {
  const temaSalvo = localStorage.getItem(TEMA_STORAGE_KEY);
  if (temaSalvo === 'light') {
    aplicarTema('light');
  } else {
    // Padrão obrigatório: Escuro
    aplicarTema('dark');
  }
}

btnTema.addEventListener('click', () => {
  const temaAtual = document.documentElement.getAttribute('data-theme') || 'dark';
  const novoTema = temaAtual === 'dark' ? 'light' : 'dark';
  localStorage.setItem(TEMA_STORAGE_KEY, novoTema);
  aplicarTema(novoTema);
});

/* ==========================================================================
   12. Inicialização ao Carregar a Página
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  inicializarTema();
  esconderErro();

  // Se o usuário já tiver digitado algo antes do refresh
  if (inputCep.value.trim().length > 0) {
    btnLimpar.style.display = 'flex';
  }

  // Foco no input para conveniência
  inputCep.focus();

  // Executa uma consulta inicial ilustrativa (ex: Praça da Sé, SP: 01001-000)
  // para que a página já abra bonita e funcional
  try {
    inputCep.value = '01001-000';
    btnLimpar.style.display = 'flex';
    executarBusca('01001-000');
  } catch (errInit) {
    console.warn('Inicialização adiada:', errInit);
  }
});

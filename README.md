## 🌦️ Clima por CEP

🇧🇷 **Português** | 🇺🇸 [English](#-english)

Se trata de um site que mostra o clima atual e a previsão dos próximos 5 dias a partir de um CEP brasileiro. Sem cadastro e sem chave de API.

🔗 **[Testar online - CLIQUE AQUI](https://thays-reis2026.github.io/clima-por-cep/)**
### O problema que resolve
Mostrar o tempo de um lugar sem a pessoa precisar saber o nome da cidade: basta digitar o CEP.

### Como funciona (3 etapas com APIs)
1. **ViaCEP:** recebe o CEP e devolve rua, bairro, cidade e estado.
2. **Open-Meteo (geocodificação):** recebe o nome da cidade e devolve latitude e longitude.
3. **Open-Meteo (previsão):** recebe a latitude e a longitude e devolve temperatura, sensação térmica, umidade, vento e previsão de 5 dias.

O site também tem uma seção "Como funciona?" explicando isso em linguagem simples, modo escuro e claro, mensagens de erro claras e layout responsivo (celular e computador).

### 🛠 Tecnologias usadas
HTML, CSS e JavaScript puro (`fetch`, `async/await`, `try/catch`). Sem frameworks e sem etapa de build. Publicado no GitHub Pages.

### Como foi feito
Criado com o **Google AI Studio** a partir de um prompt que escrevi. Depois, corrigi bugs por meio de novos prompts (caixa de erro sempre visível) e removi partes desnecessárias do site. 

### Como rodar
Baixe os arquivos e abra o `index.html` no navegador.

### 🎲Dados
Fornecidos gratuitamente por [ViaCEP](https://viacep.com.br) e [Open-Meteo](https://open-meteo.com).

---

## 🇺🇸 English

A website that shows the current weather and a 5-day forecast from a Brazilian ZIP code (CEP). No sign-up and no API key required.

🔗 **[Try it online - CLICK HERE](https://thays-reis2026.github.io/clima-por-cep/)**

### The problem it solves
Showing the weather of a place without the user needing to know the city name: just type the ZIP code.

### How it works (3 API steps)
1. **ViaCEP:** receives the ZIP code and returns street, neighborhood, city and state.
2. **Open-Meteo (geocoding):** receives the city name and returns latitude and longitude.
3. **Open-Meteo (forecast):** receives latitude and longitude and returns temperature, feels-like temperature, humidity, wind and a 5-day forecast.

The site also has a "How it works" section explaining this in plain language, dark and light modes, clear error messages and a responsive layout (mobile and desktop).

### 🛠 Technologies used
Plain HTML, CSS and JavaScript (`fetch`, `async/await`, `try/catch`). No frameworks and no build step. Hosted on GitHub Pages.

### How it was built
Created with **Google AI Studio** from a prompt I wrote. I then fixed bugs through follow-up prompts (an error box that was always visible) and removed unnecessary parts of the site.

### How to run
Download the files and open `index.html` in your browser.

### 🎲Data
Provided free of charge by [ViaCEP](https://viacep.com.br) and [Open-Meteo](https://open-meteo.com).

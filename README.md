# Sfregows

**Music Player & Webradio Receiver** — Interface classica inspirada em Winamp 2.x, construida com HTML5/CSS/JS puro e Tauri 2 para desktop.

![Winamp 2.x Style](https://img.shields.io/badge/Style-Winamp%202.x-orange) ![Tauri 2](https://img.shields.io/badge/Desktop-Tauri%202-blue) ![HTML5](https://img.shields.io/badge/Frontend-HTML5%2FCSS%2FJS-green)

## Sobre

Sfregows e um player de musica multi-plataforma com suporte a webradio mundial, inspirado na interface classica do Winamp 2.x. O projeto combina o visual nostalgico do Winamp com tecnologias modernas, oferecendo uma experiencia desktop nativa via Tauri 2 com performance minima.

### Stack

- **Frontend**: HTML5 / CSS / JavaScript (vanilla, zero dependencias)
- **Desktop**: Tauri 2 (Rust + WebView)
- **Audio**: Web Audio API + MediaSession API
- **Sprites**: Winamp 2.x classicos (MAIN.png, TITLEBAR.png, etc)

## Features

### Player Core

- Interface classica Winamp 2.x com sprites authenticos
- Skins `.wsz` (2 inclusos: MacOSXAqua1-5, XMMS-Turquoise)
- Controles de volume e balance (sliders com sprites)
- Transport: prev/play/pause/stop/next
- Eject (abrir arquivo local via file picker)
- Marquee scroll com nome da musica/radio
- Time display (min:seg com digitos sprite)
- Shuffle/Repeat buttons (UI pronta)
- Scaling responsivo (proporcional ao viewport)

### Webradio

- 9 estacoes brasileiras já pré-configuradas: 80FM, 89FM, Jovem Pan Ourinhos, KISS FM, Antena 1, Transamerica, Cidade, Band News FM, Alpha FM
- Radio sub-window com logos clicaveis
- Toggle play/stop com timeout 10s

### Window Management (Tauri)

- Sem decoracoes de janela (decorations=false)
- Janela transparente
- Tamanho inicial: 275x116 (tamanho exato do player)
- Drag via titlebar (startDragging Tauri API)
- Botao minimize (chama appWindow.minimize)
- Botao close (chama appWindow.close)
- Shade mode (double-click titlebar ou botao) - 275x14px
- Resize handle (canto inferior direito, drag via Tauri API)
- Always On Top (botao no clutterbar, toggle via Tauri API)

### Visualizer (vu.js)

- **Spectrum Analyzer**: barras com falloff + peak dots
- **Fire**: barras com gradiente vermelho/amarelo
- **Dots**: pontos nas posicoes das barras
- **Oscilloscope**: forma de onda em tempo real
- **Off**: tela preta
- Click no visualizer para ciclar entre modos

### Janelas Independentes

- **Radio**: 9 estacoes com logos clicaveis
- **Equalizer**: 15 presets, sliders, spline
- **Playlist**: add files/dir/url, sort, transport
- **Video**: player de video integrado

## Estrutura

```
sfregows/
├── interface/                  # Frontend web
│   ├── index.html              # Entry point (player principal)
│   ├── favicon.ico
│   ├── css/
│   │   ├── main.css            # CSS principal (~1000 linhas)
│   │   ├── eq.css              # Equalizer
│   │   ├── pl.css              # Playlist
│   │   ├── radio.css           # Radio
│   │   └── video.css           # Video
│   ├── js/
│   │   ├── main.js             # Tauri APIs, scaling, shade, resize, AOT
│   │   ├── radio.js            # Radio window, 9 estacoes
│   │   ├── vu.js               # Spectrum, fire, dots, oscilloscope
│   │   ├── eq.js               # Equalizer logic
│   │   ├── pl.js               # Playlist logic
│   │   └── video.js            # Video player logic
│   ├── pages/
│   │   ├── radio.html          # Janela Radio
│   │   ├── eq.html             # Janela Equalizer
│   │   ├── pl.html             # Janela Playlist
│   │   └── video.html          # Janela Video
│   ├── images/
│   │   ├── main/               # 19 sprites Winamp (MAIN.png, TITLEBAR.png, etc)
│   │   ├── radios/             # 13 logos de estacoes
│   │   └── logos/              # Icones do app (32x32, 128x128, favicon)
│   └── skins/                  # 2 skins .wsz
├── src-tauri/                  # Wrapper desktop (Tauri 2)
│   ├── Cargo.toml              # tauri 2, serde, serde_json
│   ├── tauri.conf.json         # 5 janelas, CSP com ipc://
│   ├── src/main.rs             # Tauri boilerplate
│   ├── icons/                  # 32x32, 128x128, 128x128@2x
│   └── capabilities/           # default.json (window management perms)
├── package.json                # Metadados npm (sem bundler)
├── ROADMAP.md                  # Proximos passos
└── AGENTS.md                   # Documentacao tecnica
```

## Instalacao

### Linux (.deb)

```bash
# Instalar dependencias
sudo apt install libwebkit2gtk-4.1-0 libgtk-3-0

# Instalar o pacote
sudo dpkg -i sfregows_1.0.0_amd64.deb

# Iniciar
sfregows
```

### Desinstalar

```bash
sudo dpkg -r sfregows
```

## Desenvolvimento

### Dev (navegador)

```bash
cd interface
python3 -m http.server 8080
# Acessar http://localhost:8080
```

### Build Desktop (Linux .deb)

```bash
cd src-tauri
cargo tauri build
```

### Atalhos

- **Ctrl+Shift+I**: Abrir DevTools (Tauri)
- **Double-click titlebar**: Toggle shade mode
- **Click visualizer**: Ciclar modos (spectrum/fire/dots/scope/off)

## Compatibilidade

| Feature       | Tauri (Desktop) | Browser          |
| ------------- | --------------- | ---------------- |
| Player basico | ✅              | ✅               |
| Radio streams | ✅              | ✅               |
| VU Analyzer   | ✅              | ✅               |
| Skins .wsz    | ✅              | ✅               |
| Window drag   | ✅              | ❌               |
| Shade mode    | ✅              | ❌               |
| Resize handle | ✅              | ❌               |
| Always On Top | ✅              | ❌               |
| Sub-windows   | ✅              | ⚠️ window.open() |

## Notas Tecnicas

- **Canvas**: 76x16 pixels (tamanho identico ao Webamp/Winamp original)
- **Spectrum**: barras com escala logaritmica, falloff, peak dots, 18 cores
- **Fire**: 18 cores de gradiente vermelho/amarelo, shift automatico
- **Oscilloscope**: 5 tons de branco/cinza, formula corrigida
- **Sprites**: extraidos do Winamp 2.x classic
- **Scaling**: `Math.min(scaleX, scaleY, 4)` para manter proporcao
- **Shade mode**: 14px altura (so titlebar + tempo + play indicator)
- **CSP**: `ipc: ipc://*` necessario para `window.__TAURI__` funcionar

## Limitacoes Conhecidas

- Botoes EQ/PL: UI visual pronta, sem painel funcional
- Resize no browser: limitado (sem APIs Tauri)
- Sub-windows no browser: `window.open()` sem integracao

## Roadmap

Ver [ROADMAP.md](ROADMAP.md) para proximos passos e decisoes pendentes.

## Licenca

WCL (Weird Creative License) — veja `package.json`

## Autor

**sena** — Desenvolvedor

---

> Inspirado no Winamp 2.x — "It really whips the llama's ass!"

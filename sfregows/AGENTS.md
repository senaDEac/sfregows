# Sfregows - Music Player & Webradio Receiver

## Sobre

Player de musica multi-plataforma com suporte a webradio. Interface classica inspirada em Winamp 2.x, construida com HTML5/CSS/JS puro (sem bundler) e Tauri 2 para desktop.

## Stack

- **Frontend**: HTML5 / CSS / JavaScript (vanilla, zero dependencias)
- **Desktop**: Tauri 2 (Rust + WebView)
- **Audio**: Web Audio API + MediaSession API
- **Sprites**: Winamp 2.x clasicos (MAIN.png, TITLEBAR.png, etc)

## Estrutura

```
sfregows/
├── interface/              # Frontend web
│   ├── index.html          # Entry point
│   ├── favicon.ico
│   ├── css/
│   │   └── main.css        # CSS principal (~900 linhas)
│   ├── js/
│   │   ├── main.js         # Tauri APIs, scaling, shade, resize, AOT, eject, time
│   │   ├── radio.js        # Radio window, stations, play/stop
│   │   └── vu.js           # Spectrum, fire, dots, oscilloscope, off (5 modos)
│   ├── images/
│   │   ├── main/           # 19 sprites Winamp (MAIN.png, TITLEBAR.png, etc)
│   │   └── radios/         # 13 logos de estacoes
│   ├── mp3/                # Audio de teste
│   └── skins/              # 2 skins .wsz (MacOSXAqua1-5, XMMS-Turquoise)
├── src-tauri/              # Wrapper desktop (Tauri 2)
│   ├── Cargo.toml          # tauri 2, serde, serde_json
│   ├── tauri.conf.json     # decorations=false, transparent, 275x116
│   ├── src/main.rs         # Tauri boilerplate
│   ├── icons/              # 32x32, 128x128, 128x128@2x
│   └── capabilities/       # default.json (window management perms)
├── package.json            # Metadados npm (sem bundler)
├── sfregows_1.0.0_amd64.deb  # Pacote buildado
├── ROADMAP.md              # Proximos passos
└── AGENTS.md               # Este arquivo
```

## Comandos

### Build desktop (Linux .deb)

```bash
cd src-tauri && cargo tauri build
```

### Dev (abrir no navegador)

```bash
cd interface && python3 -m http.server 8080
```

### Desinstalar

```bash
sudo dpkg -r sfregows
```

## Features Implementadas

### Player Core
- [x] Player de musica com interface classica Winamp 2.x
- [x] Skins .wsz (2 inclusos: MacOSXAqua1-5, XMMS-Turquoise)
- [x] Controles de volume e balance (sliders com sprites)
- [x] Transport: prev/play/pause/stop/next
- [x] Eject (abrir arquivo local via file picker)
- [x] Marquee scroll com nome da musica/radio
- [x] Time display (min:seg com digitos sprite)
- [x] Shuffle/Repeat buttons (UI pronta)
- [x] Scaling responsivo (proporcional ao viewport)

### Webradio
- [x] 9 estacoes brasileiras, janela toggle
- [x] Radio sub-window com logos clicaveis
- [x] Toggle play/stop com timeout 10s

### Window Management (Tauri)
- [x] Sem decoracoes de janela (decorations=false)
- [x] Janela transparente
- [x] Tamanho inicial: 275x116 (tamanho exato do player)
- [x] Drag via titlebar (startDragging Tauri API)
- [x] Botao minimize (chama appWindow.minimize)
- [x] Botao close (chama appWindow.close)
- [x] Shade mode (double-click titlebar ou botao) - 275x14px
- [x] Resize handle (canto inferior direito, drag via Tauri API)
- [x] Always On Top (botao no clutterbar, toggle via Tauri API)

### Visualizer (vu.js)
- [x] Spectrum Analyzer (barras com falloff + peak dots)
- [x] Fire (barras com gradiente vermelho/amarelo)
- [x] Dots (pontos nas posicoes das barras)
- [x] Oscilloscope (corrigido: centro em y=7.5)
- [x] Off (tela preta)
- [x] Click no visualizer para ciclar entre modos
- [x] Spectrum como default (sem texto "CLICK")

### Compatibilidade
- [x] Deteccao de Tauri via `window.__TAURI__`
- [x] Fallback browser: features Tauri desabilitadas
- [x] Resize handle escondido no browser

## Limitacoes Conhecidas

- Botoes EQ/PL: UI visual pronta, sem painel funcional
- Resize no browser: limitado (sem APIs Tauri)

## Nota Importante: VU com Radio Cross-Origin

- O `<audio id="radio-audio">` **precisa** ter `crossorigin="anonymous"` para que `createMediaElementSource` funcione com streams cross-origin (rádios)
- Sem esse atributo, o browser silencia o áudio quando conectado ao Web Audio API
- Descoberto analisando o projeto VintageRadio que usa o mesmo atributo
- Funciona com todas as rádios brasileiras (80FM, 89FM, Jovem Pan, KISS FM, Antena 1, Transamerica, Cidade, Band News, Alpha FM)

## Notas Tecnicas

- **Canvas**: 76x16 pixels (tamanho identico ao Webamp/Winamp original)
- **Spectrum**: barras com escala logaritmica, falloff, peak dots, 18 cores
- **Fire**: 18 cores de gradiente vermelho/amarelo, shift automatico
- **Oscilloscope**: 5 tons de branco/cinza, formula corrigida (centro=7.5)
- **Sprites**: extraidos do Winamp 2.x classic
- **Scaling**: `Math.min(scaleX, scaleY, 4)` para manter proporcao
- **Shade mode**: 14px altura (so titlebar + tempo + play indicator)

---

## Historico de Problemas e Solucoes

### Problema 1: VU Analyzer parava o audio das radios

**Sintoma**: Ao clicar no VU analyzer enquanto uma radio cross-origin tocava, o audio silenciava completamente. Precisava fechar e reabrir o app.

**Causa**: `createMediaElementSource(radioAudio)` redireciona todo o audio do elemento `<audio>` pelo Web Audio API. Por seguranca, browsers silenciam audio cross-origin quando conectado assim.

**Solucao**: Adicionar `crossorigin="anonymous"` no elemento `<audio id="radio-audio">` no `index.html`. Isso faz o browser enviar requisicao CORS pro servidor de radio. Se o servidor responder com `Access-Control-Allow-Origin`, o `createMediaElementSource` funciona normalmente.

```html
<!-- ANTES ( nao funcionava com radios ) -->
<audio id="radio-audio" preload="none"></audio>

<!-- DEPOIS ( funciona com todas as radios ) -->
<audio id="radio-audio" preload="none" crossorigin="anonymous"></audio>
```

**Referencia**: Projeto VintageRadio (`/mnt/UnoServer/WinAmp/VintageRadio/`) usa o mesmo atributo em todos os elementos de audio.

**Licao**: `createMediaElementSource` SEMPRE precisa de `crossorigin="anonymous"` no elemento de audio pra funcionar com fonts externas.

---

### Problema 2: Disco corrompido quebrou arquivos do projeto

**Sintoma**: Arquivos do projeto foram corrompidos por defeito fisico no disco. VU e outras features pararam de funcionar.

**Causa**: Defeito no disco rigido corrompeu arquivos.

**Solucao**: Backup em `/mnt/UnoServer/WinAmp/sfregows-20260716_1125/` tinha a versao funcional. Restaurar `vu.js` desse backup + adicionar `crossorigin="anonymous"` resolveu.

**Licao**: Ter backups timestamped de versoes que funcionam. Git resolveria isso automaticamente com commits.

---

### Problema 3: Spectrum simulado parecia "esquizito"

**Sintoma**: Apos remover `createMediaElementSource` pra nao quebrar o audio, o spectrum era simulado com dados pseudo-aleatorios. O visual parecia estranho, "correndo pro lado esquerdo" e "flutuando em compassos estranhos".

**Causa**: Dados simulados com sinusoides nao tem relacao com o audio real. O padrao de movimento era artificial e desagradavel.

**Solucao**: Restaurar o analyzer REAL com `createMediaElementSource` + `crossorigin="anonymous"` em vez de simulacao.

**Licao**: Spectrum simulado nunca substitui o real. Usar apenas como fallback temporario.

---

### Problema 4: Janelas EQ/PL/Video nao abriam no Tauri

**Sintoma**: Botoes EQ, PL e Video na interface principal nao faziam nada.

**Causa**: Janelas nao estavam definidas em `tauri.conf.json` e nao havia codigo pra gerenciar abertura/fechamento.

**Solucao**:
1. Criar arquivos HTML/JS/CSS separados (`eq.html`, `pl.html`, `video.html`)
2. Adicionar 5 janelas em `tauri.conf.json` com `visible: false`
3. Atualizar `capabilities/default.json` pra incluir todas as janelas
4. Adicionar handlers em `main.js` pra toggle com `WebviewWindow.getByLabel()`
5. Fallback browser com `window.open()` quando nao esta no Tauri

---

### Problema 5: `window.__TAURI__` undefined no Tauri

**Sintoma**: Deteccao de Tauri falhava, features desktop nao funcionavam.

**Causa**: CSP (Content Security Policy) em `tauri.conf.json` nao incluia `ipc://*` no `connect-src`.

**Solucao**: Adicionar `ipc: ipc://*` ao CSP no `tauri.conf.json`.

---

### Problema 6: Titulo da janela principal nao aparecia

**Sintoma**: Janela principal sem titulo visivel.

**Causa**: CSS ocultava o titulo por padrao.

**Solucao**: Ajustar CSS pra mostrar titulo quando necessario.

---

## Backups Existentes

| Caminho | Data | Descricao |
|---------|------|-----------|
| `sfregows.antigo/` | Antigo | Versao original simples (3 modos VU) |
| `sfregows-20260714_1508/` | 14/07 15:08 | Sem vu.js ainda |
| `sfregows-20260716_1125/` | 16/07 11:25 | VU completo (5 modos) com createMediaElementSource |
| `sfregows-20260716_1204/` | 16/07 12:04 | VU com spectrum simulado (fallback) |

**Versao atual funciona com base no backup `20260716_1125` + `crossorigin="anonymous"`.**

---

## Recomendacao: Controle de Versao com Git

Para evitar perda de codigo funcional, recomenda-se inicializar um repositorio Git:

```bash
cd /mnt/UnoServer/WinAmp/sfregows
git init
git add -A
git commit -m "Versao estavel: VU funciona com todas as radios"
```

**Fluxo recomendado**:
1. Quando algo funcionar bem: `git add -A && git commit -m "DESCRICAO"`
2. Pra ver historico: `git log --oneline`
3. Pra voltar a uma versao: `git checkout <hash>`
4. Pra desfazer ultima mudanca: `git revert HEAD`

**Nomes de commits uteis**:
- `"VU funciona com todas as radios"`
- `"Janelas EQ/PL/Video funcionando"`
- `"Radio window com 9 estacoes"`
- `"Spectrum analyzer real com crossorigin"`

# Sfregows - Proximos Passos (Roadmap)

## Requisitos

### 1. Remover decoracoes da janela Tauri
- `tauri.conf.json`: `"decorations": false`
- `tauri.conf.json`: `"app.withGlobalTauri": true` (expor APIs Tauri no JS)
- Atualizar `capabilities/default.json` com permissoes de window management

### 2. Transferir botoes da janela para o player
- **Minimize**: chamar `window.__TAURI__.window appWindow.minimize()`
- **Close**: chamar `window.__TAURI__.window appWindow.close()`
- **Shade**: toggle shade mode (JS puro, sem Tauri API)
- **Drag**: titlebar precisa de `startDragging()` para mover a janela
- **AOT (Always On Top)**: novo botao no clutterbar, chama `appWindow.setAlwaysOnTop()`

### 3. Shade mode (double-click titlebar)
- Double-click no titlebar alterna entre:
  - **Full mode**: 275x116px (player completo)
  - **Shade mode**: 275x14px (so titlebar com tempo + play status)
- Mesma logica do Winamp 2.x original
- Requer resize da janela Tauri via API

### 4. Resize handle (canto inferior direito)
- Div invisivel no canto inferior direito do player
- Cursor: `nwse-resize`
- Drag handler que chama `appWindow.setSize()`
- Tamanho minimo: 275x116 (full) ou 275x14 (shade)

### 5. Always On Top (AOT)
- Botao no clutterbar (area `#cb-v` ou nova posicao)
- Toggle on/off com estado visual (cor verde quando ativo)
- Chama `appWindow.setAlwaysOnTop(true/false)`

### 6. Novos modos do Spectrum Analyzer
- Ordem de ciclagem: bars → fire → dots → scope → off
- **Bars**: spectrum atual (ja implementado)
- **Fire**: barras com gradiente vermelho/amarelo/branco (simula fogo)
- **Dots**: pontos nas posicoes das barras ao inves de barras solidas
- **Scope**: oscilloscope (corrigir bug de centragem)
- **Off**: tela preta

### 7. Spectrum como default
- Iniciar com mode=0 (bars) sem mostrar "CLICK"
- Remover `drawMessage("CLICK")` inicial
- Mostrar canvas vazio (preto) ate audio tocar

### 8. Remover textos de teste
- Remover `drawMessage("CLICK")`
- Remover `drawMessage("ERR")`
- Remover `setTimeout` de "CLICK" no erro
- Canvas fica preto quando nao ha audio

### 9. Corrigir oscilloscope
- Bug atual: formula `((amplitude / 255) * 16) / 2 - 9` mapeia para -9 a -1
- Silencio (128) cai em y=-0.94, clamped para 0 (topo)
- Correcao: `((amplitude - 128) / 128) * 7 + 8` → mapeia 1-15, centro em 8

### 10. Perguntas para decisao (ver abaixo)

### 11. Este arquivo

---

## Perguntas para Decisao

### P1: Fundo da janela
Sem decoracoes, o fundo da janela Tauri aparece. Opcoes:
- **a)** Fundo transparente (player flutuando na tela)
- **b)** Fundo `#232336` (escuro, como atual no #main)
- **c)** Fundo preto puro

### P2: Shade mode - o que mostrar?
No Winamp original, o shade mode mostra:
- **a)** Titulo + tempo + play/pause indicator (classico)
- **b)** Titulo + tempo + play/pause + volume minusculo
- **c)** So o titulo (minimalista)

### P3: Resize handle - comportamento
- **a)** Resize livre (qualquer tamanho, mantendo proporcao minima)
- **b)** Resize em steps de 25px (snapping como Winamp)
- **c)** Resize somente no eixo Y (largura fixa em 275px)

### P4: Always On Top - posicao do botao
- **a)** No clutterbar (substituindo um dos botoes existentes)
- **b)** Novo botao ao lado do radio-button
- **c)** Apenas via double-click no titlebar (sem botao visual)

### P5: Modos do spectrum - ordem
- **a)** bars → fire → dots → scope → off (5 modos)
- **b)** bars → fire → scope → off (4 modos, sem dots)
- **c)** bars → dots → scope → off (4 modos, sem fire)

### P6: Compatibilidade browser
O player tambem funciona no navegador (python http.server). As APIs Tauri
(window management) nao estarao disponiveis. Opcoes:
- **a)** Detecar `window.__TAURI__` e desabilitar features se ausente
- **b)** Focar apenas no desktop (Tauri) e ignorar browser
- **c)** Criar fallback CSS/JS para browser (resize handle CSS, etc)

### P7: Janela inicial
- **a)** Janela abre em tamanho 275x116 (tamanho exato do player)
- **b)** Janela abre em tamanho 500x800 (atual) e ajusta ao conteudo
- **c)** Janela abre em tamanho intermediario (ex: 400x300)

---

## Arquivos a modificar

| Arquivo | Mudancas |
|---------|----------|
| `src-tauri/tauri.conf.json` | decorations=false, withGlobalTauri=true |
| `src-tauri/capabilities/default.json` | permissoes window management |
| `src-tauri/src/main.rs` | (manter boilerplate) |
| `interface/index.html` | adicionar resize handle, AOT button |
| `interface/css/main.css` | resize handle, AOT styles, shade mode |
| `interface/js/main.js` | Tauri APIs (drag, minimize, close, resize, AOT, shade) |
| `interface/js/vu.js` | novos modos, corrigir oscilloscope, remover textos |

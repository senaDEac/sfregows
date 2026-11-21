# Sfregows 2 - Projeto de Teste

## Sobre

Projeto de teste para desenvolvimento e experimentacao de novas features do Sfregows. Baseado no projeto original `sfregows/`, com modificacoes para facilitar testes.

## Stack

- **Frontend**: HTML5 / CSS / JavaScript (vanilla, zero dependencias)
- **Desktop**: Tauri 2 (Rust + WebView)
- **Audio**: Web Audio API + MediaSession API

# Regras de eficiencia

- Seja extremamente conciso. Responda apenas o necessario.
- Nao apresente relatorios de progresso nem descreva cada acao.
- Antes de ler arquivos, identifique quais sao realmente relevantes.
- Nunca leia arquivos inteiros quando bastar consultar trechos especificos.
- Nao repita pesquisas, comandos ou verificacoes ja realizadas.
- Nao crie arquivos, documentacao ou testes desnecessarios.
- Altere somente o necessario para cumprir a solicitacao.
- Nao execute tarefas adicionais sem autorizacao.
- Verifique apenas o essencial para confirmar que a alteracao funciona.
- Ao terminar, informe somente os arquivos alterados e o resultado.
- Se faltar informacao essencial, faca uma unica pergunta objetiva.

## Estrutura

```
sfregows-2/
├── interface/              # Frontend web
│   ├── index.html          # Entry point
│   ├── css/
│   │   └── main.css        # CSS principal
│   ├── js/
│   │   ├── main.js         # Logica principal
│   │   └── vu.js           # Spectrum analyzer
│   ├── images/
│   │   ├── main/           # Sprites Winamp
│   │   └── radios/         # Logos de estacoes
│   └── pages/              # Sub-janelas (radio, eq, pl, video)
├── src-tauri/              # Wrapper desktop (Tauri 2)
│   ├── Cargo.toml          # tauri 2, serde, serde_json
│   ├── tauri.conf.json     # Configuracao Tauri
│   ├── src/main.rs         # Tauri boilerplate
│   ├── icons/              # Icones do app
│   └── capabilities/       # Permissoes de janela
├── package.json            # Metadados npm
└── AGENTS.md               # Este arquivo
```

## Comandos

### Build desktop (Linux .deb)

```bash
cd src-tauri
cargo tauri build # compila para .deb
```

### Build android

```bash
cd src-tauri
cargo tauri android build # compila para .apk (debug)  ou .aab (release)
```

### Dev (abrir no navegador)

```bash
cd interface && python3 -m http.server 8080
```

### Desinstalar

```bash
sudo dpkg -r sfregows
```

## Observacoes

- **Decorations**: Janela com decoracoes nativas (diferente do original que usa `decorations: false`)
- **Transparent**: Falso (fundo solido)
- **Testes**: Este projeto e para experimentacao, nao para producao

## Referencia

- Projeto original: `/mnt/Dados/projetos/sfregows/sfregows/`
- Roadmap: `ROADMAP.md`

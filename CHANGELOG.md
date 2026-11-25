
---

## `CHANGELOG.md`

Crie na mesma pasta, ao lado do README:

```markdown
# Changelog

Todas as mudanças notáveis deste projeto são documentadas aqui.

## [1.1.0] - 2026-11-24

Versão de entrega final, com correções aplicadas após revisão do código.

### Corrigido

- **Busca por sugestão abria cidade homônima errada.** Refazia a
  geocodificação pelo nome e pegava `results[0]`. Agora usa as
  coordenadas (`latitude`/`longitude`) do item clicado.
- **Horário de chuva já passado era exibido.** Caía para o índice 0
  quando a hora atual não estava no vetor `hourly`. Agora retorna
  "Sem previsão de chuva para hoje" como fallback.
- **`onErro` disparava duas vezes em falha de rede.** Adicionada flag
  `finalizado` e `xhr.timeout = 10s`.
- **Race condition em buscas rápidas.** Resolvida com contador
  `tokenBusca` + `abort()` da requisição anterior.
- **`innerHTML +=` dentro de loop.** HTML montado em string única
  com `.map().join()`.
- **Códigos WMO incompletos.** Adicionados 66, 67, 77, 85 e 86 à
  tabela `DESCRICAO_TEMPO`.
- **Input do usuário sobrescrito na inicialização.** Agora só busca
  "São Paulo" se o campo estiver vazio.

### Adicionado

- Feedback visual no botão durante o loading ("Buscando...")
- Roles ARIA nas abas (`tablist`/`tab`/`tabpanel`) + `aria-selected`
- `<noscript>` para usuários sem JavaScript
- Mensagem inicial "Carregando..." em `#statusMensagem`

### Removido

- `span#regiaoUsuario` (código morto — `#estadoPais` já mostra a
  mesma informação)

## [1.0.0] - versão inicial

- Busca de clima por cidade ou região via API Open-Meteo
- Sugestões de locais próximos
- Condições atuais e previsão dos próximos 5 dias
- Abas de navegação e atalhos para capitais
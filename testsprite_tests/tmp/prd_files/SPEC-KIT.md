# Spec-Kit Instalado ✅

O Spec-Kit foi instalado com sucesso neste projeto. O Spec-Kit é um toolkit para desenvolvimento orientado por especificações (Spec-Driven Development).

## Estrutura Criada

```
luvbee-connect-vibes/
├── .specify/
│   └── templates/          # Templates para specs, plans, tasks
│       └── commands/       # Comandos do spec-kit
├── scripts/
│   └── powershell/        # Scripts PowerShell para workflow
├── memory/
│   └── constitution.md    # Princípios e regras do projeto
├── specs/                 # Diretório para features (será criado automaticamente)
└── CLAUDE.md              # Arquivo de contexto para Claude Code
```

## Comandos Disponíveis

Os seguintes comandos estão disponíveis quando você usar um assistente de IA compatível (Claude Code, Cursor, etc.):

- `/speckit.constitution` - Criar/atualizar princípios do projeto
- `/speckit.specify` - Criar uma especificação de feature
- `/speckit.plan` - Criar plano de implementação técnica
- `/speckit.tasks` - Gerar lista de tarefas da especificação
- `/speckit.implement` - Executar implementação das tarefas

## Próximos Passos

1. **Definir Constituição**: Use `/speckit.constitution` para estabelecer os princípios do projeto
2. **Criar uma Feature**: Use `/speckit.specify` para descrever o que você quer construir
3. **Planejar Implementação**: Use `/speckit.plan` para definir a stack técnica
4. **Gerar Tarefas**: Use `/speckit.tasks` para criar a lista de tarefas
5. **Implementar**: Use `/speckit.implement` para executar a implementação

## Documentação

Para mais informações, consulte:
- [Documentação do Spec-Kit](https://github.com/github/spec-kit)
- [Guia Completo](./spec-driven.md) (se disponível)

## Scripts PowerShell

Os scripts PowerShell estão disponíveis em `scripts/powershell/`:

- `check-prerequisites.ps1` - Verificar pré-requisitos
- `create-new-feature.ps1` - Criar nova feature
- `setup-plan.ps1` - Configurar plano de implementação
- `update-agent-context.ps1` - Atualizar contexto do agente IA
- `common.ps1` - Funções comuns compartilhadas

## Notas

- O Spec-Kit funciona melhor com repositórios Git
- Certifique-se de estar em uma branch de feature (formato: `001-feature-name`) ao usar os comandos
- Os templates podem ser personalizados em `.specify/templates/`


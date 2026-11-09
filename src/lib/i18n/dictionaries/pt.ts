import type { Dictionary } from "../dictionary.ts";

/**
 * European Portuguese catalogue.
 *
 * Typed as `Dictionary`, so a missing or renamed key is a build error rather
 * than a string that silently falls back to English.
 */
export const pt: Dictionary = {
  common: {
    appName: "Health Tracker",
    save: "Guardar",
    saving: "A guardar…",
    signOut: "Terminar sessão",
    choose: "Selecione…",
    optional: "opcional",
    cancel: "Cancelar",
    edit: "Editar",
    delete: "Eliminar",
    deleting: "A eliminar…",
    back: "Voltar",
    notRecorded: "Não registado",
  },

  nav: {
    dashboard: "Painel",
    measurements: "Medições",
    profile: "Perfil",
    primary: "Principal",
    account: "Conta",
  },

  theme: {
    current: (name: string) => `Tema: ${name}`,
    switchTo: (name: string) => `Mudar para o tema ${name}`,
    names: {
      system: "do sistema",
      light: "claro",
      dark: "escuro",
    },
  },

  states: {
    loading: "A carregar…",
    errorTitle: "Ocorreu um erro.",
    errorDescription:
      "Não foi possível mostrar esta página. Os seus dados não foram alterados.",
    retry: "Tentar novamente",
    notFoundTitle: "Página não encontrada.",
    notFoundDescription: "Este endereço não corresponde a nada nesta aplicação.",
    backToDashboard: "Voltar ao painel",
  },

  dashboard: {
    title: "Painel",
    description:
      "A sua medição mais recente e a comparação com as anteriores.",
    empty: "Ainda não há medições.",
    emptyDescription: "Assim que registar uma medição, ela aparece aqui.",
    latest: "Última medição",
    latestValues: "Valores atuais",
    fromEarlier: (when: string) => `De ${when}`,
    vsFirst: "Última vs primeira",
    vsPeriod: "Ao longo de um período",
    comparedWith: (when: string) => `Comparada com ${when}`,
    notEnoughData: "Ainda não há dados suficientes.",
    viewAll: "Todas as medições",
  },

  periods: {
    "3d": "3 dias",
    "1w": "1 semana",
    "2w": "2 semanas",
    "1m": "1 mês",
    "3m": "3 meses",
    "6m": "6 meses",
    "1y": "1 ano",
    "2y": "2 anos",
    all: "Desde sempre",
  },

  charts: {
    title: "Evolução",
    description:
      "Uma métrica ao longo do tempo. Só são representados valores registados.",
    metric: "Métrica",
    period: "Período",
    noData: "Ainda não há dados suficientes.",
    noDataDescription:
      "Esta métrica não tem qualquer valor registado no período selecionado.",
    singlePoint:
      "Um valor registado neste período. É preciso um segundo para mostrar uma variação.",
    current: "Atual",
    previous: "Anterior",
    first: "Primeiro",
  },

  auth: {
    email: "Email",
    password: "Palavra-passe",
    login: {
      title: "Iniciar sessão",
      description: "As suas medições, no seu próprio servidor.",
      submit: "Iniciar sessão",
      failed: "Email ou palavra-passe incorretos.",
      alternatePrompt: "Ainda não tem conta?",
      alternateLabel: "Criar conta",
    },
    register: {
      title: "Criar conta",
      description: "Email e palavra-passe. Não é preciso mais nada.",
      submit: "Criar conta",
      duplicate: "Já existe uma conta com esse email.",
      failed: "Não foi possível criar a conta. Tente novamente.",
      alternatePrompt: "Já tem conta?",
      alternateLabel: "Iniciar sessão",
    },
    issues: {
      EMAIL_REQUIRED: "Introduza o seu email.",
      EMAIL_INVALID: "Isso não parece um endereço de email.",
      PASSWORD_TOO_SHORT: (min: number) => `Use pelo menos ${min} caracteres.`,
      PASSWORD_TOO_LONG: "Essa palavra-passe é demasiado longa.",
    },
  },

  data: {
    title: "Os seus dados",
    description:
      "Descarregue tudo o que registou. O CSV contém as suas medições e pode ser importado de novo; o JSON inclui também o seu perfil.",
    exportCsv: "Descarregar CSV",
    exportJson: "Descarregar JSON",
  },

  profile: {
    title: "Perfil",
    description:
      "Usado para calcular o IMC e apresentar os seus dados. A altura é guardada em cada medição, por isso alterá-la aqui nunca muda resultados antigos.",
    name: "Nome",
    namePlaceholder: "Como prefere ser tratado",
    birthDate: "Data de nascimento",
    birthDateHint: "Guardada como data, não como idade.",
    sex: "Sexo",
    heightCm: "Altura (cm)",
    heightHint: "Aplica-se apenas a novas medições.",
    language: "Idioma",
    directions: {
      title: "Preferências de direção",
      hint: "Só afeta a forma como as variações são mostradas. Sem metas nem objetivos.",
      legend: (metric: string) => `Direção preferida para ${metric}`,
      values: {
        decrease: "Descer",
        indifferent: "Sem preferência",
        increase: "Subir",
      },
    },
    saved: "Perfil guardado.",
    failed: "Não foi possível guardar o perfil. Tente novamente.",
    sexes: {
      FEMALE: "Feminino",
      MALE: "Masculino",
      OTHER: "Outro",
    },
    issues: {
      NAME_TOO_LONG: (max: number) => `Use no máximo ${max} caracteres.`,
      BIRTH_DATE_REQUIRED: "Introduza a sua data de nascimento.",
      BIRTH_DATE_INVALID: "Essa data não é válida.",
      BIRTH_DATE_IN_FUTURE: "A data de nascimento não pode ser futura.",
      BIRTH_DATE_TOO_OLD: "Essa data de nascimento não é plausível.",
      SEX_REQUIRED: "Selecione uma opção.",
      SEX_INVALID: "Selecione uma opção.",
      HEIGHT_REQUIRED: "Introduza a sua altura.",
      HEIGHT_INVALID: "Introduza a altura como número, em centímetros.",
      HEIGHT_OUT_OF_RANGE: (min: number, max: number) =>
        `Introduza uma altura entre ${min} e ${max} cm.`,
      LANGUAGE_INVALID: "Selecione um idioma.",
      DIRECTION_INVALID: "Selecione uma das direções disponíveis.",
    },
  },

  measurements: {
    title: "Medições",
    description: "Tudo o que registou, da mais recente para a mais antiga.",
    empty: "Ainda não há medições.",
    emptyDescription:
      "As medições registadas são listadas aqui, da mais recente para a mais antiga.",
    add: "Adicionar medição",
    addTitle: "Nova medição",
    addDescription:
      "Introduza o que a sua balança indicou. Todos os valores são opcionais, mas é necessário pelo menos um.",
    editTitle: "Editar medição",
    editDescription:
      "A altura registada com esta medição é mantida como estava, para que o seu IMC não mude.",
    detailTitle: "Medição",
    measuredAt: "Data e hora",
    measuredAtHint: "Uma data e hora passadas; por omissão, agora.",
    heightAtMeasurement: "Altura nesta medição",
    heightFromProfile: (height: string) =>
      `A sua altura atual, ${height}, será registada com esta medição.`,
    heightKept: "Mantida como foi registada. Altere a sua altura no perfil.",
    noHeightTitle: "Indique primeiro a sua altura",
    noHeight:
      "Cada medição é registada com a sua altura, para que o IMC se mantenha correto quando a altura mudar. Complete o perfil para começar a registar.",
    goToProfile: "Ir para o perfil",
    values: "Valores",
    note: "Nota",
    noteHint: (max: number) =>
      `Algo que valha a pena lembrar sobre esta leitura. Até ${max} caracteres.`,
    bmi: "IMC",
    waistToHeightRatio: "Relação cintura-altura",
    derivedHint:
      "Calculados a partir dos valores e da altura registados com esta medição.",
    howToMeasure: "Como medir",
    abdominalCircumferenceHelp:
      "Meça com uma fita métrica, de pé e relaxado, no final de uma expiração normal. Mantenha a fita horizontal, justa mas sem apertar a pele. Meça sempre no mesmo local para tornar os valores comparáveis.",
    view: "Ver",
    actions: "Ações",
    created: "Medição adicionada.",
    updated: "Medição guardada.",
    notFound: "Essa medição já não existe.",
    saveFailed: "Não foi possível guardar a medição. Tente novamente.",
    deleteFailed: "Não foi possível eliminar a medição. Tente novamente.",
    deleteTitle: "Eliminar esta medição?",
    deleteDescription: (when: string) =>
      `A medição de ${when} será eliminada definitivamente. Esta ação não pode ser anulada.`,
    fields: {
      weightKg: "Peso (kg)",
      bodyFatPercent: "Gordura corporal (%)",
      hydrationPercent: "Hidratação (%)",
      musclePercent: "Músculo (%)",
      boneMassKg: "Massa óssea (kg)",
      visceralFat: "Gordura visceral",
      abdominalCircumferenceCm: "Perímetro abdominal (cm)",
    },
    bmiCategories: {
      UNDERWEIGHT: "Baixo peso",
      NORMAL: "Intervalo normal",
      PRE_OBESE: "Pré-obesidade",
      OBESE_I: "Obesidade grau I",
      OBESE_II: "Obesidade grau II",
      OBESE_III: "Obesidade grau III",
    },
    waistToHeightCategories: {
      LOW: "Baixo",
      HEALTHY: "Intervalo geralmente saudável",
      INCREASED: "Aumentado",
      HIGH: "Elevado",
    },
    issues: {
      MEASURED_AT_REQUIRED: "Introduza a data e a hora da medição.",
      MEASURED_AT_INVALID: "Essa data e hora não são válidas.",
      MEASURED_AT_IN_FUTURE: "Uma medição não pode ter data futura.",
      MEASURED_AT_TOO_OLD: "Essa data não é plausível.",
      VALUE_INVALID: "Introduza este valor como número.",
      VALUE_OUT_OF_RANGE: (min: number, max: number) =>
        `Introduza um valor entre ${min} e ${max}.`,
      NOTE_TOO_LONG: "Essa nota é demasiado longa.",
      NO_VALUES: "Introduza pelo menos um valor de medição.",
    },
  },
};

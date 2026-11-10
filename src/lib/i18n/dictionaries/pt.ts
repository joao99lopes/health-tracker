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
    percentagePoints: "p.p.",
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
    version: (version: string) => `Versão ${version}`,
    versionUnknown: "build de desenvolvimento",
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
    perMetricHint: "Cada métrica entre os seus próprios registos.",
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
    movingAverage: "Média móvel",
    movingAverageOff: "Desligada",
    movingAverageWindow: (days: number) => `${days} dias`,
    movingAverageLegend: (days: number) => `Média de ${days} dias`,
    compareWith: "Comparar com",
    compareNone: "Nenhuma",
    compareNoData: (metric: string) =>
      `${metric} não tem valores registados neste período.`,
  },

  auth: {
    email: "Email",
    password: "Palavra-passe",
    login: {
      title: "Iniciar sessão",
      description: "As suas medições, no seu próprio servidor.",
      submit: "Iniciar sessão",
      forgot: "Esqueceu-se da palavra-passe?",
      unverified:
        "Confirme primeiro o seu email: abra a ligação no email que enviámos quando criou a conta.",
      resend: "Enviar o email de novo",
      verificationSent: "Enviado. Veja a sua caixa de entrada (e a pasta de spam).",
      alternatePrompt: "Ainda não tem conta?",
      alternateLabel: "Criar conta",
    },
    register: {
      title: "Criar conta",
      description: "Email e palavra-passe. Vai confirmar o endereço por email.",
      submit: "Criar conta",
      verificationSent: (email: string) =>
        `Quase lá. Enviámos uma ligação para ${email} - abra-a para confirmar o endereço e depois inicie sessão.`,
      alternatePrompt: "Já tem conta?",
      alternateLabel: "Iniciar sessão",
    },
    alternatives: {
      or: "ou",
      google: "Continuar com Google",
      emailLink: "Enviar-me uma ligação de entrada",
    },
    emailLink: {
      title: "Entrar com uma ligação",
      description: "Sem palavra-passe: enviamos-lhe por email uma ligação que inicia sessão uma vez.",
      submit: "Enviar a ligação",
      sent: (email: string) =>
        `Enviada para ${email}. Abra-a neste dispositivo para entrar; funciona uma vez e expira.`,
      completing: "A iniciar sessão…",
      confirmTitle: "Confirme o seu email",
      needsEmail:
        "A ligação foi aberta noutro sítio que não aquele onde foi pedida. Introduza o endereço para onde foi enviada.",
      confirmSubmit: "Entrar",
      alternatePrompt: "Prefere uma palavra-passe?",
      alternateLabel: "Iniciar sessão",
    },
    forgot: {
      title: "Repor a palavra-passe",
      description: "Enviamos-lhe por email uma ligação para escolher uma nova palavra-passe.",
      submit: "Enviar a ligação",
      sent: "Se existir uma conta com esse endereço, a ligação está a caminho. Veja a sua caixa de entrada (e a pasta de spam).",
      alternatePrompt: "Lembrou-se?",
      alternateLabel: "Iniciar sessão",
    },
    errors: {
      invalidCredentials: "Email ou palavra-passe incorretos.",
      emailInUse: "Já existe uma conta com esse email.",
      emailTaken:
        "Esse email já está associado a outra conta. Inicie sessão com essa conta.",
      weakPassword: "Essa palavra-passe não é aceite. Escolha uma mais longa.",
      tooManyRequests: "Demasiadas tentativas. Aguarde alguns minutos e tente novamente.",
      network: "Não foi possível contactar o serviço de autenticação. Verifique a ligação e tente novamente.",
      cancelled: "",
      popupBlocked: "O navegador bloqueou a janela do Google. Permita pop-ups para este site e tente novamente.",
      unauthorizedDomain:
        "Este endereço ainda não pode entrar com Google nem com ligações por email. Adicione-o aos domínios autorizados do Firebase.",
      invalidLink: "Esta ligação de entrada é inválida ou expirou. Peça uma nova.",
      otherMethod: "Esse email já entra de outra forma. Use esse método.",
      failed: "Algo correu mal. Tente novamente.",
    },
    issues: {
      EMAIL_REQUIRED: "Introduza o seu email.",
      EMAIL_INVALID: "Isso não parece um endereço de email.",
      PASSWORD_REQUIRED: "Introduza a sua palavra-passe.",
      PASSWORD_TOO_SHORT: (min: number) => `Use pelo menos ${min} caracteres.`,
      PASSWORD_TOO_LONG: "Essa palavra-passe é demasiado longa.",
    },
  },

  account: {
    title: "Conta",
    signedInAs: (email: string) => `Sessão iniciada como ${email}.`,
    changePassword: "Mudar a palavra-passe",
    changePasswordDescription:
      "Continua com a sessão iniciada aqui; todos os outros dispositivos terminam a sessão.",
    currentPassword: "Palavra-passe atual",
    newPassword: "Nova palavra-passe",
    changePasswordSubmit: "Mudar a palavra-passe",
    passwordChanged: "Palavra-passe alterada. Os outros dispositivos terminaram a sessão.",
    deleteTitle: "Apagar a conta",
    deleteDescription:
      "Apaga para sempre a sua conta, o perfil e todas as medições. Descarregue primeiro os seus dados se os quiser guardar.",
    deleteButton: "Apagar a conta…",
    deleteConfirmTitle: "Apagar a sua conta?",
    deleteConfirmDescription:
      "Tudo o que registou é apagado e não pode ser recuperado.",
    deleteNeedsRecentSignIn:
      "Por segurança, apagar exige uma sessão iniciada há poucos minutos. Inicie sessão de novo (de qualquer forma), volte aqui e apague.",
    signInAgain: "Iniciar sessão de novo",
    noPassword:
      "Esta conta entra com Google e não tem palavra-passe. Para criar uma, use \"Esqueceu-se da palavra-passe?\" na página de entrada.",
    emailLinkHint:
      "Entra com ligações por email e nunca definiu palavra-passe? Use \"Esqueceu-se da palavra-passe?\" na página de entrada para criar uma.",
    deleteConfirm: "Apagar tudo",
    deleting: "A apagar…",
  },

  data: {
    title: "Os seus dados",
    description:
      "Descarregue tudo o que registou. O CSV contém as suas medições e pode ser importado de novo; o JSON inclui também o seu perfil.",
    exportCsv: "Descarregar CSV",
    exportJson: "Descarregar JSON",
    importTitle: "Importar medições",
    importDescription:
      "Um CSV no mesmo formato do ficheiro descarregado. As medições já registadas no mesmo instante são ignoradas; se alguma linha tiver um problema, nada é importado.",
    importChoose: "Escolher um ficheiro CSV",
    importReady: (count: number) =>
      count === 1
        ? "1 medição pronta a importar."
        : `${count} medições prontas a importar.`,
    importConfirm: "Importar",
    importing: "A importar…",
    importCancel: "Escolher outro ficheiro",
    imported: (count: number, skipped: number) =>
      `${count === 1 ? "1 medição importada" : `${count} medições importadas`}` +
      (skipped > 0 ? `; ${skipped} já registada(s) e ignorada(s).` : "."),
    importFailed: "Não foi possível importar o ficheiro. Tente novamente.",
    importProblems: (shown: number, total: number) =>
      total > shown
        ? `Nada foi importado. Os primeiros ${shown} de ${total} problemas:`
        : "Nada foi importado. Corrija estes problemas e tente novamente:",
    importIssues: {
      line: (line: number) => `Linha ${line}:`,
      FILE_EMPTY: "O ficheiro não tem medições.",
      FILE_TOO_LARGE: "O ficheiro é demasiado grande.",
      TOO_MANY_ROWS: "O ficheiro tem demasiadas linhas.",
      MALFORMED: "Não foi possível ler o ficheiro como CSV (há aspas por fechar).",
      MISSING_MEASURED_AT_COLUMN: "O cabeçalho não tem a coluna measuredAt.",
      UNKNOWN_COLUMN: (name: string) => `Coluna desconhecida "${name}".`,
      DUPLICATE_COLUMN: (name: string) => `A coluna "${name}" aparece duas vezes.`,
      WRONG_CELL_COUNT: "Esta linha não tem uma célula por coluna.",
      HEIGHT_INVALID: "A altura não é um valor plausível em centímetros.",
      HEIGHT_REQUIRED:
        "Esta linha não tem altura e não há altura no perfil. Complete primeiro o seu perfil.",
      DUPLICATE_IN_FILE: "Outra linha do ficheiro tem a mesma data e hora.",
    },
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

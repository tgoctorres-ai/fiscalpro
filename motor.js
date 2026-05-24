/**
 * FiscalPro — Motor de Plano de Estudos v1.0
 * Gera o plano semanal automaticamente baseado no progresso de cada matéria.
 */

// ─── CONSTANTES ─────────────────────────────────────────────────────────────

const MOTOR_VERSION = '1.0';

// Fases do ciclo de cada matéria
const FASES = {
  TEORIA:      'teoria',
  MAPEAMENTO:  'mapeamento',
  QUESTOES:    'questoes',
  REVISAO:     'revisao',
  TESTE:       'teste',
  REFORCO:     'reforco',
  MANUTENCAO:  'manutencao',
  CONCLUIDA:   'concluida'
};

// Tipos de atividade e como finalizar cada um
const TIPOS_ATIVIDADE = {
  Teoria:      { finalizacao: 'tempo',   icone: '📘', cor: '#3b82f6' },
  Mapeamento:  { finalizacao: 'tempo',   icone: '🗺️', cor: '#f97316' },
  Questões:    { finalizacao: 'questoes', icone: '📝', cor: '#a855f7' },
  Revisão:     { finalizacao: 'tempo',   icone: '🔄', cor: '#06b6d4' },
  Teste:       { finalizacao: 'questoes', icone: '🎯', cor: '#f59e0b' },
  Reforço:     { finalizacao: 'questoes', icone: '💪', cor: '#ef4444' },
  'Lei Seca':  { finalizacao: 'tempo',   icone: '⚖️', cor: '#64748b' },
  Videoaula:   { finalizacao: 'tempo',   icone: '🎬', cor: '#22c55e' },
  Manutenção:  { finalizacao: 'questoes', icone: '🔁', cor: '#7c3aed' },
};

// Intervalos de revisão espaçada de longo prazo (em dias)
// Baseado na curva de Ebbinghaus + adaptação para concursos 2+ anos
const INTERVALOS_MANUTENCAO = [7, 15, 30, 60, 90, 120, 180];

// Threshold de desempenho
const THRESHOLD_APROVADO = 70; // >= 70% passa para próxima fase
const THRESHOLD_MANUTENCAO = 80; // >= 80% aumenta intervalo de manutenção

// Matérias padrão AFRFB com pesos baseados no edital 2022 (FGV)
// Peso 5 = mais cobrado, Peso 1 = menos cobrado
const MATERIAS_AFRFB = [
  {
    id: 1, nome: 'Direito Tributário', peso: 5, cor: '#f5a623',
    tipo: 'pdf', status: 'ativa',
    topicos: 'CTN, Fato Gerador, Obrigação Tributária, Crédito Tributário, Exclusão, Extinção, Garantias, Administração Tributária',
    questoesEdital: 8
  },
  {
    id: 2, nome: 'Legislação Tributária', peso: 5, cor: '#f59e0b',
    tipo: 'pdf', status: 'pausada', // ativar quando quiser
    topicos: 'IR, IPI, IOF, IRPF, IRPJ, Simples Nacional, CSLL, PIS, COFINS, Contribuições Sociais',
    questoesEdital: 10
  },
  {
    id: 3, nome: 'Legislação Aduaneira', peso: 5, cor: '#ef4444',
    tipo: 'pdf', status: 'pausada', // ativar quando quiser
    topicos: 'Regulamento Aduaneiro, Despacho Aduaneiro, Importação, Exportação, Drawback, Regime Aduaneiro Especial',
    questoesEdital: 14
  },
  {
    id: 4, nome: 'Contabilidade Geral e Avançada', peso: 5, cor: '#22c55e',
    tipo: 'pdf', status: 'ativa',
    topicos: 'Patrimônio, Balanço Patrimonial, DRE, Escrituração, Plano de Contas, CPC, IFRS',
    questoesEdital: 12
  },
  {
    id: 5, nome: 'Direito Constitucional', peso: 4, cor: '#3b82f6',
    tipo: 'pdf', status: 'ativa',
    topicos: 'Princípios Fundamentais, Direitos Fundamentais, Organização do Estado, Tributação na CF/88, Imunidades',
    questoesEdital: 8
  },
  {
    id: 6, nome: 'Direito Administrativo', peso: 4, cor: '#8b5cf6',
    tipo: 'pdf', status: 'ativa',
    topicos: 'Atos Administrativos, Licitações, Contratos, Agentes Públicos, Improbidade, Lei 14.133/21',
    questoesEdital: 8
  },
  {
    id: 7, nome: 'Direito Previdenciário', peso: 4, cor: '#06b6d4',
    tipo: 'pdf', status: 'pausada', // ativar quando quiser
    topicos: 'RGPS, RPPS, Benefícios, Custeio, Contribuições Previdenciárias, EC 103/2019',
    questoesEdital: 10
  },
  {
    id: 8, nome: 'Português', peso: 3, cor: '#a855f7',
    tipo: 'pdf', status: 'ativa',
    topicos: 'Interpretação de Texto, Gramática, Concordância, Regência, Crase, Redação Oficial',
    questoesEdital: 10
  },
  {
    id: 9, nome: 'Matemática e Raciocínio Lógico', peso: 3, cor: '#f97316',
    tipo: 'videoaula', status: 'ativa',
    topicos: 'Porcentagem, Juros, Proporcionalidade, Probabilidade, Lógica Proposicional, Sequências',
    questoesEdital: 10,
    plataforma: 'Escola de Exatas'
  },
];

// ─── FUNÇÕES UTILITÁRIAS ────────────────────────────────────────────────────

function motorHoje() {
  return new Date().toISOString().split('T')[0];
}

function motorAddDias(data, n) {
  const d = new Date(data + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function motorDiffDias(a, b) {
  return Math.round((new Date(a + 'T12:00:00') - new Date(b + 'T12:00:00')) / 86400000);
}

function motorFmtHoras(h) {
  const hrs = Math.floor(h);
  const min = Math.round((h - hrs) * 60);
  return `${String(hrs).padStart(2,'0')}h${String(min).padStart(2,'0')}m`;
}

function motorPctAcertos(acertos, total) {
  if (!total || total === 0) return 0;
  return Math.round((acertos / total) * 100);
}

// ─── ESTADO DO MOTOR ────────────────────────────────────────────────────────

/**
 * Retorna o estado padrão de uma matéria no motor
 */
function motorEstadoMateria(mat) {
  return {
    matId: mat.id,
    fase: FASES.TEORIA,
    pdfAtual: null,        // id do PDF atual
    pdfNome: null,         // nome do PDF atual (ex: "Tributário PDF 00")
    pgAtual: 0,            // página atual no PDF
    pgTotal: 0,            // total de páginas de teoria do PDF atual
    pgMapeamento: 0,       // total de páginas de mapeamento
    pdfConcluido: false,   // se o PDF atual foi totalmente concluído
    sessoesTeo: 0,         // sessões de teoria feitas neste PDF
    sessoesMap: 0,         // sessões de mapeamento feitas
    questoesSessoes: [],   // histórico de % por sessão de questões/teste
    ultimaAtividade: null, // data da última atividade desta matéria
    // Manutenção de longo prazo
    emManutencao: false,
    cicloManutencao: 0,    // índice em INTERVALOS_MANUTENCAO
    proximaManutencao: null,
    totalPDFs: 0,          // quantos PDFs já concluiu nesta matéria
    // Videoaula (Matemática)
    aulaAtual: 0,
    sessoesVideoaula: 0,
  };
}

/**
 * Retorna o estado padrão completo do app
 */
function motorGetDefaultState() {
  return {
    versao: MOTOR_VERSION,
    // Configurações do usuário
    nome: '',
    apiKey: '',
    horasDia: 2,
    diasSemana: 7,
    pgPorHora: 15,         // páginas de teoria por hora
    qtecMeta: 20,          // meta de questões TEC por sessão
    sessoesVideoAulaPorQuestao: 3, // a cada X videoaulas, 1 sessão de questões (Matemática)

    // Matérias
    mats: MATERIAS_AFRFB.map(m => ({
      ...m,
      status: 'ativa',      // ativa | manutencao | pausada
      ultimaRev: null,
      proxRev: null,
    })),

    // PDFs cadastrados
    pdfs: [],

    // Bizus gerados
    bizuPDFs: [],

    // Estado do motor por matéria
    estadoMat: {},          // { matId: motorEstadoMateria(mat) }

    // Metas (plano semanal)
    metaAtual: 1,
    metas: {},              // { numMeta: { ... } }

    // Sessões de estudo registradas
    sess: {},               // { 'YYYY-MM-DD': { horas, hist[] } }

    // Questões registradas
    qs: [],

    // Caderno de erros
    cadErros: [],

    // Chat IA
    chatH: [],
  };
}

// ─── MOTOR: GERAÇÃO DO PLANO ────────────────────────────────────────────────

/**
 * Gera o plano da semana (meta) automaticamente.
 * @param {Object} S - estado completo do app
 * @param {number} metaNum - número da meta a gerar
 * @returns {Object} - meta com atividades
 */
function motorGerarMeta(S, metaNum) {
  const hoje = motorHoje();
  const pgSessao = motorPgPorSessao(S);
  const mats = (S.mats || []).filter(m => m.status === 'ativa' || m.status === 'manutencao');

  // Distribuição de dias na semana (7 dias, 2 matérias/dia)
  // Ordena matérias por peso (maior peso = mais frequente)
  const slots = motorGerarSlotsSemana(mats, S.diasSemana || 7);

  const atividades = [];
  let idx = 1;

  slots.forEach((slot, diaIdx) => {
    slot.forEach(matId => {
      const mat = mats.find(m => m.id === matId);
      if (!mat) return;

      // Garantir que estado da matéria existe
      if (!S.estadoMat) S.estadoMat = {};
      if (!S.estadoMat[matId]) S.estadoMat[matId] = motorEstadoMateria(mat);

      const est = S.estadoMat[matId];
      const ativ = motorGerarAtividade(S, mat, est, pgSessao, metaNum, idx, diaIdx);
      if (ativ) {
        atividades.push(ativ);
        idx++;
      }
    });
  });

  return {
    num: metaNum,
    iniciada: hoje,
    concluidaEm: null,
    status: 'em_andamento', // em_andamento | em_dia | adiamento | atraso
    prazoExtra: 0,
    adiamentos: [],
    diasDecorridos: 0,
    atraso: 0,
    atividades,
  };
}

/**
 * Distribui matérias nos slots da semana baseado no peso
 */
function motorGerarSlotsSemana(mats, diasSemana) {
  // Matérias ativas ordenadas por peso desc
  const ativas = [...mats].sort((a, b) => b.peso - a.peso);
  const slots = Array.from({length: diasSemana}, () => []);

  // Cada dia tem 2 slots (2 matérias por dia)
  // Matérias de maior peso aparecem mais vezes
  const totalSlots = diasSemana * 2;

  // Criar pool ponderado de matérias
  const pool = [];
  ativas.forEach(m => {
    // Peso 5 = 3 aparições/semana, Peso 4 = 2, Peso 3 = 1-2, etc.
    const freq = Math.max(1, Math.round((m.peso / 5) * 3));
    for (let i = 0; i < freq; i++) pool.push(m.id);
  });

  // Embaralhar pool e distribuir nos slots
  const shuffled = pool.sort(() => 0.5 - Math.random());
  let poolIdx = 0;

  for (let dia = 0; dia < diasSemana; dia++) {
    const mat1 = shuffled[poolIdx % shuffled.length];
    poolIdx++;
    let mat2 = shuffled[poolIdx % shuffled.length];
    // Evitar a mesma matéria no mesmo dia
    let tries = 0;
    while (mat2 === mat1 && tries < 10) {
      poolIdx++;
      mat2 = shuffled[poolIdx % shuffled.length];
      tries++;
    }
    poolIdx++;
    slots[dia] = [mat1, mat2].filter(Boolean);
  }

  return slots;
}

/**
 * Gera uma atividade para a matéria baseado na fase atual
 */
function motorGerarAtividade(S, mat, est, pgSessao, metaNum, idx, diaIdx) {
  const hoje = motorHoje();
  const codigo = motorGerarCodigo(mat, metaNum, idx);

  // Matéria em manutenção de longo prazo
  if (est.emManutencao || est.fase === FASES.MANUTENCAO) {
    if (!est.proximaManutencao || est.proximaManutencao <= hoje) {
      return motorAtividade(mat, 'Manutenção', `Revisão de longo prazo — ${mat.nome}`,
        'Resolva questões TEC + revise Bizus desta matéria', idx, codigo, est.pdfNome,
        { pgIni: null, pgFim: null, diaIdx });
    }
    return null; // não é hora de revisão ainda
  }

  // Matéria tipo videoaula (Matemática)
  if (mat.tipo === 'videoaula') {
    return motorGerarAtivVideoaula(S, mat, est, metaNum, idx, codigo, diaIdx);
  }

  // Sem PDF cadastrado ainda — pedir para cadastrar
  if (!est.pdfAtual && !est.pdfNome) {
    // Verificar se há PDF cadastrado
    const pdfCad = (S.pdfs || []).find(p => p.matId === mat.id);
    if (pdfCad) {
      est.pdfAtual = pdfCad.id;
      est.pdfNome = pdfCad.nome;
      est.pgTotal = pdfCad.pgTeoria || pdfCad.pgTot || 0;
      est.pgMapeamento = (pdfCad.pgTot || 0) - (pdfCad.pgTeoria || pdfCad.pgTot || 0);
    } else {
      return {
        idx, matId: mat.id, matNome: mat.nome, pdfId: null,
        tipo: 'Teoria', titulo: mat.nome,
        sub: '⚠️ Cadastre um PDF para esta matéria em PDFs & Material',
        rel: mat.peso, tempo: null, desemp: null, status: 'pendente',
        codigo, diaIdx, semPDF: true,
        finalizacao: 'tempo',
      };
    }
  }

  // Calcular páginas desta sessão
  const pgIni = (est.pgAtual || 0) + 1;
  const pgFim = Math.min(est.pgTotal, pgIni + pgSessao - 1);

  switch (est.fase) {
    case FASES.TEORIA:
      return motorAtividade(mat, 'Teoria',
        `${est.pdfNome || mat.nome}`,
        `Pág. ${pgIni} a ${pgFim}`,
        idx, codigo, est.pdfNome,
        { pgIni, pgFim, diaIdx });

    case FASES.MAPEAMENTO:
      return motorAtividade(mat, 'Mapeamento',
        `Mapeamento — ${est.pdfNome || mat.nome}`,
        'Leia as questões comentadas do final do PDF',
        idx, codigo, est.pdfNome,
        { pgIni: null, pgFim: null, diaIdx });

    case FASES.QUESTOES:
      return motorAtividade(mat, 'Questões',
        `Questões TEC — ${mat.nome}`,
        `Resolva ${S.qtecMeta || 20} questões no TEC Concursos`,
        idx, codigo, est.pdfNome,
        { pgIni: null, pgFim: null, diaIdx });

    case FASES.REVISAO:
      return motorAtividade(mat, 'Revisão',
        `Revisão — ${est.pdfNome || mat.nome}`,
        'Releia os Bizus + revise Caderno de Erros desta matéria',
        idx, codigo, est.pdfNome,
        { pgIni: null, pgFim: null, diaIdx });

    case FASES.TESTE:
      return motorAtividade(mat, 'Teste',
        `Teste — ${mat.nome}`,
        `Resolva ${S.qtecMeta || 20} questões variadas no TEC`,
        idx, codigo, est.pdfNome,
        { pgIni: null, pgFim: null, diaIdx });

    case FASES.REFORCO: {
      const ultimoDesemp = est.questoesSessoes?.slice(-1)[0] || 0;
      const grau = ultimoDesemp < 50 ? 'Intenso' : ultimoDesemp < 60 ? 'Médio' : 'Leve';
      const instrucao = grau === 'Leve'
        ? 'Refaça apenas as questões que errou'
        : grau === 'Médio'
        ? 'Refaça questões erradas + releia os Bizus do assunto'
        : 'Revise os Bizus + assista videoaulas dos pontos fracos + refaça questões erradas';
      return motorAtividade(mat, `Reforço ${grau}`,
        `Reforço — ${mat.nome}`,
        instrucao, idx, codigo, est.pdfNome,
        { pgIni: null, pgFim: null, diaIdx, grauReforco: grau });
    }

    default:
      return null;
  }
}

/**
 * Gera atividade para matéria do tipo videoaula (Matemática)
 */
function motorGerarAtivVideoaula(S, mat, est, metaNum, idx, codigo, diaIdx) {
  // A cada N sessões de videoaula, intercala questões
  const sessoesParaQuestao = S.sessoesVideoAulaPorQuestao || 3;

  if (est.fase === FASES.QUESTOES || (est.sessoesVideoaula > 0 && est.sessoesVideoaula % sessoesParaQuestao === 0 && est.fase !== FASES.REVISAO)) {
    return motorAtividade(mat, 'Questões',
      `Questões TEC — ${mat.nome}`,
      `Resolva ${S.qtecMeta || 20} questões no TEC Concursos`,
      idx, codigo, mat.plataforma || 'Escola de Exatas',
      { pgIni: null, pgFim: null, diaIdx });
  }

  if (est.fase === FASES.REFORCO) {
    return motorAtividade(mat, 'Reforço Leve',
      `Reforço — ${mat.nome}`,
      'Refaça as questões que errou + revise os pontos fracos',
      idx, codigo, mat.plataforma,
      { pgIni: null, pgFim: null, diaIdx });
  }

  return motorAtividade(mat, 'Videoaula',
    `${mat.nome} — Aula ${(est.aulaAtual || 0) + 1}`,
    `Assista no ${mat.plataforma || 'Escola de Exatas'} e anote os pontos principais`,
    idx, codigo, mat.plataforma || 'Escola de Exatas',
    { pgIni: null, pgFim: null, diaIdx });
}

/**
 * Cria objeto de atividade padronizado
 */
function motorAtividade(mat, tipo, titulo, sub, idx, codigo, pdfNome, extras) {
  const tipoDef = TIPOS_ATIVIDADE[tipo] || TIPOS_ATIVIDADE['Teoria'];
  return {
    idx,
    matId: mat.id,
    matNome: mat.nome,
    matCor: mat.cor,
    pdfNome: pdfNome || null,
    tipo,
    titulo,
    sub,
    rel: mat.peso,
    tempo: null,
    desemp: null,
    questoesTotais: null,
    questoesAcertos: null,
    status: 'pendente', // pendente | concluida | ignorada
    codigo,
    finalizacao: tipoDef.finalizacao,
    icone: tipoDef.icone,
    cor: tipoDef.cor,
    pgIni: extras?.pgIni || null,
    pgFim: extras?.pgFim || null,
    diaIdx: extras?.diaIdx || 0,
    grauReforco: extras?.grauReforco || null,
    semPDF: extras?.semPDF || false,
  };
}

/**
 * Gera código único da atividade
 */
function motorGerarCodigo(mat, metaNum, idx) {
  const prefix = mat.nome.replace(/[^A-Za-z]/g, '').substring(0,4).toUpperCase();
  return `${prefix}.M${String(metaNum).padStart(2,'0')}.${String(idx).padStart(3,'0')}`;
}

/**
 * Páginas por sessão baseado na configuração
 */
function motorPgPorSessao(S) {
  const horasPorSessao = (S.horasDia || 2) / 2; // 2 matérias por dia
  return Math.round(horasPorSessao * (S.pgPorHora || 15));
}

// ─── MOTOR: FINALIZAÇÃO DE ATIVIDADE ───────────────────────────────────────

/**
 * Processa a finalização de uma atividade e atualiza o estado da matéria.
 * @param {Object} S - estado do app
 * @param {Object} ativ - atividade finalizada
 * @param {Object} registro - { horas, minutos, questoesTotais, questoesAcertos }
 * @returns {Object} - { S atualizado, mensagem, proximaFase }
 */
function motorFinalizarAtividade(S, ativ, registro) {
  if (!S.estadoMat) S.estadoMat = {};
  if (!S.estadoMat[ativ.matId]) {
    const mat = (S.mats || []).find(m => m.id === ativ.matId);
    if (mat) S.estadoMat[ativ.matId] = motorEstadoMateria(mat);
  }

  const est = S.estadoMat[ativ.matId];
  const hoje = motorHoje();
  const horas = (registro.horas || 0) + (registro.minutos || 0) / 60;
  const pgSessao = motorPgPorSessao(S);

  // Registrar tempo na sessão diária
  if (!S.sess) S.sess = {};
  if (!S.sess[hoje]) S.sess[hoje] = { horas: 0, hist: [] };
  S.sess[hoje].horas = Math.round((S.sess[hoje].horas + horas) * 100) / 100;
  S.sess[hoje].hist.push({
    matId: ativ.matId, tipo: ativ.tipo, horas,
    questoesTotais: registro.questoesTotais || null,
    questoesAcertos: registro.questoesAcertos || null,
  });

  est.ultimaAtividade = hoje;

  let mensagem = '✅ Atividade registrada!';
  let proximaFase = est.fase;
  let sugerirReforco = false;

  // Calcular desempenho se houver questões
  let pct = null;
  if (registro.questoesTotais > 0) {
    pct = motorPctAcertos(registro.questoesAcertos || 0, registro.questoesTotais);
  }

  switch (ativ.tipo) {
    case 'Teoria': {
      // Avançar páginas
      const novasPags = est.pgAtual + pgSessao;
      est.pgAtual = Math.min(est.pgTotal, novasPags);
      est.sessoesTeo = (est.sessoesTeo || 0) + 1;

      if (est.pgAtual >= est.pgTotal) {
        // Teoria concluída — ir para Mapeamento
        if (est.pgMapeamento > 0) {
          est.fase = FASES.MAPEAMENTO;
          mensagem = '📗 Teoria concluída! Próximo: Mapeamento';
          proximaFase = FASES.MAPEAMENTO;
        } else {
          // Sem mapeamento — ir direto para Questões
          est.fase = FASES.QUESTOES;
          mensagem = '📗 Teoria concluída! Próximo: Questões TEC';
          proximaFase = FASES.QUESTOES;
        }
      } else {
        const pgRestante = est.pgTotal - est.pgAtual;
        const sessoesRestantes = Math.ceil(pgRestante / pgSessao);
        mensagem = `📘 Pág. ${est.pgAtual}/${est.pgTotal} — faltam ~${sessoesRestantes} sessões`;
      }
      break;
    }

    case 'Mapeamento': {
      est.sessoesMap = (est.sessoesMap || 0) + 1;
      // Após mapeamento completo — ir para Questões
      est.fase = FASES.QUESTOES;
      mensagem = '🗺️ Mapeamento concluído! Próximo: Questões TEC';
      proximaFase = FASES.QUESTOES;
      break;
    }

    case 'Questões':
    case 'Teste': {
      if (pct !== null) {
        if (!est.questoesSessoes) est.questoesSessoes = [];
        est.questoesSessoes.push(pct);

        if (pct >= THRESHOLD_APROVADO) {
          if (ativ.tipo === 'Teste') {
            // Teste aprovado — verificar se há mais PDFs ou ir para manutenção
            est.fase = FASES.REVISAO;
            mensagem = `🎯 ${pct}% no teste! Ótimo! Próximo: Revisão final`;
            proximaFase = FASES.REVISAO;
          } else {
            // Questões OK — ir para Revisão
            est.fase = FASES.REVISAO;
            mensagem = `📝 ${pct}% nas questões! Próximo: Revisão (Bizus + Erros)`;
            proximaFase = FASES.REVISAO;
          }
        } else {
          // Abaixo do threshold — Reforço
          est.fase = FASES.REFORCO;
          sugerirReforco = true;
          mensagem = `⚠️ ${pct}% — abaixo de 70%. Reforço sugerido!`;
          proximaFase = FASES.REFORCO;
        }
      }
      break;
    }

    case 'Reforço Leve':
    case 'Reforço Médio':
    case 'Reforço Intenso': {
      if (pct !== null && pct >= THRESHOLD_APROVADO) {
        est.fase = FASES.QUESTOES;
        mensagem = `💪 ${pct}% após reforço! Voltando para Questões`;
        proximaFase = FASES.QUESTOES;
      } else if (pct !== null) {
        mensagem = `💪 ${pct}% — continue no reforço`;
      }
      break;
    }

    case 'Revisão': {
      // Após revisão — Teste
      est.fase = FASES.TESTE;
      mensagem = '🔄 Revisão concluída! Próximo: Teste';
      proximaFase = FASES.TESTE;
      break;
    }

    case 'Videoaula': {
      est.sessoesVideoaula = (est.sessoesVideoaula || 0) + 1;
      est.aulaAtual = (est.aulaAtual || 0) + 1;
      const sessoesParaQ = S.sessoesVideoAulaPorQuestao || 3;
      if (est.sessoesVideoaula % sessoesParaQ === 0) {
        est.fase = FASES.QUESTOES;
        mensagem = `🎬 Aula ${est.aulaAtual} concluída! Próximo: Questões TEC`;
        proximaFase = FASES.QUESTOES;
      } else {
        const faltam = sessoesParaQ - (est.sessoesVideoaula % sessoesParaQ);
        mensagem = `🎬 Aula ${est.aulaAtual} concluída! Faltam ${faltam} aula(s) para questões`;
      }
      break;
    }

    case 'Manutenção': {
      if (pct !== null) {
        if (!est.questoesSessoes) est.questoesSessoes = [];
        est.questoesSessoes.push(pct);
        // Ajustar intervalo de manutenção baseado no desempenho
        motorAjustarManutencao(est, pct);
        mensagem = `🔁 ${pct}% na manutenção. Próxima revisão em ${INTERVALOS_MANUTENCAO[est.cicloManutencao]}d`;
      }
      break;
    }
  }

  return { S, mensagem, proximaFase, sugerirReforco, pct };
}

/**
 * Chamado quando o teste é aprovado — prepara para próximo PDF ou manutenção
 */
function motorAvancarPDF(S, matId) {
  const est = S.estadoMat?.[matId];
  if (!est) return;

  est.totalPDFs = (est.totalPDFs || 0) + 1;
  est.pdfConcluido = true;

  // Verificar se há próximo PDF cadastrado
  const pdfsMateria = (S.pdfs || [])
    .filter(p => p.matId === matId)
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  const proxPDF = pdfsMateria.find(p => p.id !== est.pdfAtual && !p.concluido);

  if (proxPDF) {
    // Tem próximo PDF — resetar para Teoria
    est.pdfAtual = proxPDF.id;
    est.pdfNome = proxPDF.nome;
    est.pgAtual = 0;
    est.pgTotal = proxPDF.pgTeoria || proxPDF.pgTot || 0;
    est.pgMapeamento = (proxPDF.pgTot || 0) - (proxPDF.pgTeoria || proxPDF.pgTot || 0);
    est.fase = FASES.TEORIA;
    est.sessoesTeo = 0;
    est.sessoesMap = 0;
    est.questoesSessoes = [];
    return `📚 PDF concluído! Iniciando ${proxPDF.nome}`;
  } else {
    // Sem próximo PDF — entrar em manutenção de longo prazo
    const mat = (S.mats || []).find(m => m.id === matId);
    if (mat) mat.status = 'manutencao';
    est.fase = FASES.MANUTENCAO;
    est.emManutencao = true;
    est.cicloManutencao = 0;
    est.proximaManutencao = motorAddDias(motorHoje(), INTERVALOS_MANUTENCAO[0]);
    return `🏆 Todos os PDFs concluídos! ${est.pdfNome?.split(' ')[0] || 'Matéria'} entra em manutenção de longo prazo`;
  }
}

/**
 * Ajusta o intervalo de manutenção baseado no desempenho
 */
function motorAjustarManutencao(est, pct) {
  const hoje = motorHoje();
  if (pct >= THRESHOLD_MANUTENCAO) {
    // Ótimo desempenho — aumentar intervalo
    est.cicloManutencao = Math.min(
      (est.cicloManutencao || 0) + 1,
      INTERVALOS_MANUTENCAO.length - 1
    );
  } else if (pct < THRESHOLD_APROVADO) {
    // Fraco — voltar intervalo para metade
    est.cicloManutencao = Math.max(0, (est.cicloManutencao || 0) - 1);
  }
  // Calcular próxima data
  const intervalo = INTERVALOS_MANUTENCAO[est.cicloManutencao];
  est.proximaManutencao = motorAddDias(hoje, intervalo);
}

// ─── MOTOR: MÉTRICAS ────────────────────────────────────────────────────────

/**
 * Calcula métricas gerais do usuário
 */
function motorMetricas(S) {
  const sess = S.sess || {};
  const qs = S.qs || [];
  const hoje = motorHoje();

  // Horas totais
  const totHoras = Object.values(sess).reduce((s, v) => s + (v.horas || 0), 0);

  // Dias com estudo
  const diasEstudo = Object.keys(sess).filter(d => sess[d].horas > 0).length;

  // Média diária
  const mediaH = diasEstudo > 0 ? totHoras / diasEstudo : 0;

  // Sequência atual
  let seqAtual = 0;
  for (let i = 0; i < 365; i++) {
    const d = motorAddDias(hoje, -i);
    if (sess[d]?.horas > 0) seqAtual++;
    else break;
  }

  // Maior sequência
  let maiorSeq = 0, curSeq = 0;
  Object.keys(sess).filter(d => sess[d].horas > 0).sort().forEach((d, i, arr) => {
    if (i === 0 || motorDiffDias(d, arr[i-1]) > 1) curSeq = 1;
    else curSeq++;
    maiorSeq = Math.max(maiorSeq, curSeq);
  });

  // Questões
  const totQ = qs.length;
  const totAc = qs.filter(q => q.res === 'acerto').length;
  const pctGeral = totQ > 0 ? Math.round(totAc / totQ * 100) : 0;

  // Por matéria
  const porMat = {};
  (S.mats || []).forEach(m => {
    const qsM = qs.filter(q => q.matId === m.id);
    const acM = qsM.filter(q => q.res === 'acerto').length;
    porMat[m.id] = {
      nome: m.nome, cor: m.cor, peso: m.peso,
      questoes: qsM.length,
      acertos: acM,
      pct: qsM.length > 0 ? Math.round(acM / qsM.length * 100) : null,
      fase: S.estadoMat?.[m.id]?.fase || FASES.TEORIA,
      status: m.status,
    };
  });

  return { totHoras, diasEstudo, mediaH, seqAtual, maiorSeq, totQ, totAc, pctGeral, porMat };
}

/**
 * Verifica matérias em manutenção que precisam aparecer no plano
 */
function motorVerificarManutencoes(S) {
  const hoje = motorHoje();
  const pendentes = [];

  (S.mats || []).forEach(mat => {
    if (mat.status !== 'manutencao') return;
    const est = S.estadoMat?.[mat.id];
    if (!est) return;
    if (est.proximaManutencao && est.proximaManutencao <= hoje) {
      pendentes.push({
        mat,
        diasAtraso: motorDiffDias(hoje, est.proximaManutencao),
        ciclo: est.cicloManutencao,
        proximoIntervalo: INTERVALOS_MANUTENCAO[est.cicloManutencao],
      });
    }
  });

  return pendentes;
}

// ─── SEGURANÇA ──────────────────────────────────────────────────────────────

/**
 * Valida o estado antes de salvar — previne dados corrompidos
 */
function motorValidarEstado(S) {
  if (!S || typeof S !== 'object') return false;
  if (!Array.isArray(S.mats)) return false;
  if (typeof S.metaAtual !== 'number') S.metaAtual = 1;
  if (!S.metas || typeof S.metas !== 'object') S.metas = {};
  if (!S.estadoMat || typeof S.estadoMat !== 'object') S.estadoMat = {};
  if (!Array.isArray(S.qs)) S.qs = [];
  if (!Array.isArray(S.cadErros)) S.cadErros = [];
  if (!Array.isArray(S.pdfs)) S.pdfs = [];
  if (!Array.isArray(S.bizuPDFs)) S.bizuPDFs = [];
  if (!S.sess || typeof S.sess !== 'object') S.sess = {};
  return true;
}

/**
 * Faz backup do estado antes de operações destrutivas
 */
function motorBackup(S) {
  try {
    const backup = JSON.stringify(S);
    const chave = `fp_backup_${new Date().toISOString().split('T')[0]}`;
    localStorage.setItem(chave, backup);
    // Manter apenas os últimos 7 backups
    const keys = Object.keys(localStorage).filter(k => k.startsWith('fp_backup_')).sort();
    if (keys.length > 7) keys.slice(0, keys.length - 7).forEach(k => localStorage.removeItem(k));
    return true;
  } catch(e) {
    console.warn('Backup falhou:', e);
    return false;
  }
}

/**
 * Restaura o backup mais recente
 */
function motorRestaurarBackup() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('fp_backup_')).sort();
  if (!keys.length) return null;
  try {
    return JSON.parse(localStorage.getItem(keys[keys.length - 1]));
  } catch(e) {
    return null;
  }
}

// ─── EXPORTAR ───────────────────────────────────────────────────────────────

// Disponibiliza globalmente para uso no index.html
window.Motor = {
  // Constantes
  FASES,
  TIPOS_ATIVIDADE,
  INTERVALOS_MANUTENCAO,
  MATERIAS_AFRFB,
  THRESHOLD_APROVADO,
  THRESHOLD_MANUTENCAO,
  // Funções
  getDefaultState:       motorGetDefaultState,
  estadoMateria:         motorEstadoMateria,
  gerarMeta:             motorGerarMeta,
  finalizarAtividade:    motorFinalizarAtividade,
  avancarPDF:            motorAvancarPDF,
  ajustarManutencao:     motorAjustarManutencao,
  metricas:              motorMetricas,
  verificarManutencoes:  motorVerificarManutencoes,
  pgPorSessao:           motorPgPorSessao,
  gerarCodigo:           motorGerarCodigo,
  validarEstado:         motorValidarEstado,
  backup:                motorBackup,
  restaurarBackup:       motorRestaurarBackup,
  // Utils
  hoje:      motorHoje,
  addDias:   motorAddDias,
  diffDias:  motorDiffDias,
  fmtHoras:  motorFmtHoras,
  pctAcertos: motorPctAcertos,
};

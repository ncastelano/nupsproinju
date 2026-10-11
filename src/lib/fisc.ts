import { serializeDocx, type Para, type Run } from "@/lib/docxDoc";
import type { Ans, Rec } from "@/lib/records";

// Fiscalização Mensal de Unidade de Acolhimento: questionário (do Google Forms) e geração do relatório.
export const FISC_KEY = "fiscalizacao";

export const UNIDADES = [
  "Casa Criar", "Anna Tereza Capello", "Casa Lar Suélen Félix Souza", "Casa Juventude", "SAF - Serviço de Acolhimento Familiar",
];
export const PROFISSIONAIS_PADRAO = [
  "Gessiane Rodrigues de Sousa Santos", "Simone Machado dos Santos Andrade", "Márcia Lima Araújo Benarrosh",
];

export type FType = "text" | "textarea" | "number" | "date" | "select" | "radio" | "checkbox" | "matrix";
export type FQ = {
  key: string; label: string; help?: string; type: FType;
  options?: string[]; other?: boolean;        // "other": acrescenta "Outro" com campo de texto
  rows?: string[];                             // matrix: linhas (cada uma com as opções)
  showIf?: { key: string; is?: string[]; isNot?: string[] }; // só aparece conforme outra resposta
  required?: boolean;
};
export type FSection = { title: string; questions: FQ[] };

const SN = ["Sim", "Não"];
const SPNN = ["Sim", "Parcialmente", "Não", "Não se aplica"];
const CONF = ["Conforme", "Parcialmente conforme", "Não conforme", "Não se aplica"];
const VINC = ["CREAS", "CRAS", "Exclusivo da instituição"];
const ifSim = (key: string) => ({ key, is: ["Sim"] });

const q = (n: number) => `q${n}`;

export const FISC_SECTIONS: FSection[] = [
  {
    title: "1. Identificação da fiscalização",
    questions: [
      { key: q(1), label: "Unidade fiscalizada", type: "select", options: UNIDADES, required: true },
      { key: q(2), label: "Data da fiscalização", type: "date", required: true },
      { key: q(3), label: "Profissional(is) responsável(is)", type: "checkbox", options: PROFISSIONAIS_PADRAO, required: true },
      { key: q(4), label: "Responsável(is) da unidade que acompanhou(aram) a fiscalização", type: "text", required: true },
    ],
  },
  {
    title: "2. Recursos Humanos",
    questions: [
      { key: q(5), label: "Houve alteração no quadro de profissionais desde a última fiscalização?", type: "radio", options: [...SN, "Este é o primeiro registro da unidade"], required: true },
      { key: q(6), label: "Quantidade de coordenador(s)", type: "number", showIf: { key: q(5), isNot: ["Não"] } },
      { key: q(7), label: "O coordenador possui dedicação exclusiva à unidade?", type: "radio", options: SN, showIf: { key: q(5), isNot: ["Não"] } },
      { key: q(8), label: "Carga horária semanal do coordenador", type: "text", showIf: { key: q(5), isNot: ["Não"] } },
      { key: q(9), label: "Quantidade de cuidador(s)/educador(es)", type: "number", showIf: { key: q(5), isNot: ["Não"] } },
      { key: q(10), label: "Carga horária semanal dos cuidadores/educadores", type: "text", showIf: { key: q(5), isNot: ["Não"] } },
      { key: q(11), label: "Quantidade de auxiliar administrativo(s)", type: "number", showIf: { key: q(5), isNot: ["Não"] } },
      { key: q(12), label: "Carga horária semanal do(s) auxiliar(es) administrativo(s)", type: "text", showIf: { key: q(5), isNot: ["Não"] } },
      { key: q(13), label: "Quantidade de auxiliar de educador/cuidador", type: "number", showIf: { key: q(5), isNot: ["Não"] } },
      { key: q(14), label: "Carga horária semanal do(s) auxiliar(es) de educador/cuidador(es)", type: "text", showIf: { key: q(5), isNot: ["Não"] } },
      { key: q(15), label: "Quantidade de assistente social(s)", type: "number", showIf: { key: q(5), isNot: ["Não"] } },
      { key: q(16), label: "Vinculação do(s) assistente(s) social(is)", type: "radio", options: VINC, other: true, showIf: { key: q(5), isNot: ["Não"] } },
      { key: q(17), label: "Carga horária semanal do(s) assistente(s) social(is)", type: "text", showIf: { key: q(5), isNot: ["Não"] } },
      { key: q(18), label: "Quantidade de psicólogo(s)", type: "number", showIf: { key: q(5), isNot: ["Não"] } },
      { key: q(19), label: "Vinculação do(s) psicólogo(s)", type: "radio", options: VINC, other: true, showIf: { key: q(5), isNot: ["Não"] } },
      { key: q(20), label: "Carga horária semanal do(s) psicólogo(s)", type: "text", showIf: { key: q(5), isNot: ["Não"] } },
      { key: q(21), label: "Quantidade de pedagogo(s)", type: "number", showIf: { key: q(5), isNot: ["Não"] } },
      { key: q(22), label: "Vinculação do(s) pedagogo(s)", type: "radio", options: VINC, other: true, showIf: { key: q(5), isNot: ["Não"] } },
      { key: q(23), label: "Carga horária semanal do(s) pedagogo(s)", type: "text", showIf: { key: q(5), isNot: ["Não"] } },
      { key: q(24), label: "Quantidade de nutricionista(s)", type: "number", showIf: { key: q(5), isNot: ["Não"] } },
      { key: q(25), label: "Quantidade de motorista(s)", type: "number", showIf: { key: q(5), isNot: ["Não"] } },
      { key: q(26), label: "Quantidade de serviços gerais", type: "number", showIf: { key: q(5), isNot: ["Não"] } },
      { key: q(27), label: "Quantidade de cozinheira/auxiliar de cozinha", type: "number", showIf: { key: q(5), isNot: ["Não"] } },
      { key: q(28), label: "Outros profissionais", type: "text", showIf: { key: q(5), isNot: ["Não"] } },
      { key: q(29), label: "Há insuficiência de profissionais comprometendo o funcionamento/atendimento?", type: "radio", options: SN, required: true },
      {
        key: q(30), label: "Se sim, quais as funções com insuficiência?", type: "checkbox", other: true, showIf: ifSim(q(29)),
        options: ["Coordenador", "Auxiliar Administrativo", "Psicólogo", "Assistente Social", "Pedagogo", "Cuidador", "Educador Social", "Motorista", "Nutricionista", "Serviços Gerais", "Cozinha"],
      },
      {
        key: q(31), label: "Avaliação das condições de Recursos Humanos", type: "matrix", options: SPNN, required: true,
        rows: ["Escalas organizadas", "Ausências supridas", "Equipe sem sobrecarga evidente", "Capacitação adequada", "Capacitação continuada"],
      },
      { key: q(32), label: "Modalidade de capacitação da equipe", type: "radio", options: ["Continuada", "Eventual", "Não há capacitação", "Não foi possível verificar"], required: true },
      {
        key: q(33), label: "Detalhamento da situação de Recursos Humanos", type: "textarea",
        help: "Descreva, quando houver, a insuficiência identificada, seus efeitos no funcionamento da unidade, providências já adotadas ou solicitadas, eventual órgão acionado e situação atual. Registre neste campo apenas informações relacionadas aos recursos humanos.",
      },
    ],
  },
  {
    title: "3. Estrutura Física, Segurança e Funcionamento",
    questions: [
      {
        key: q(34), label: "Avaliação das condições de Estrutura Física, Segurança e Funcionamento", type: "matrix", options: CONF, required: true,
        rows: ["Ambiente limpo/organizado", "Dormitórios adequados", "Pertences individualizados", "Banheiros adequados", "Cozinha/refeitório adequados",
          "Espaço de convivência", "Espaço para estudo", "Espaço de lazer", "Espaço lúdico", "Sala para atendimento individualizado", "Segurança adequada", "Estrutura atende à demanda"],
      },
      {
        key: q(35), label: "Avaliação geral exigida para caracterização da estrutura", type: "matrix", required: true,
        options: ["Adequado/compatível", "Inadequado/não compatível", "Não foi possível avaliar"],
        rows: ["Localização", "Tamanho da Unidade", "Padrão arquitetônico"],
      },
      { key: q(36), label: "Condições gerais de conservação e higiene", type: "matrix", options: ["Bom", "Satisfatório", "Ruim"], required: true, rows: ["Conservação", "Higiene"] },
      {
        key: q(37), label: "Detalhamento das inadequações ou dificuldades relacionadas à estrutura física e às condições materiais", type: "textarea",
        help: "Descreva objetivamente as situações identificadas, indicando, quando possível, o ambiente afetado, o problema observado, seus efeitos no atendimento e eventual providência já adotada ou solicitada. Não repita situações já descritas nos campos anteriores, salvo quando necessário para contextualização.",
      },
      { key: q(38), label: "Foi identificada situação de risco iminente/visível relacionada à estrutura ou segurança?", type: "radio", options: SN, required: true },
      { key: q(39), label: "Descrição da situação de risco", type: "textarea", showIf: ifSim(q(38)) },
      { key: q(40), label: "Houve alteração relevante na estrutura física desde a última fiscalização?", type: "radio", options: SN, required: true },
      { key: q(41), label: "Se sim, qual alteração?", type: "textarea", showIf: ifSim(q(40)) },
      { key: q(42), label: "Houve obra, reparo ou melhoria desde a última fiscalização?", type: "radio", options: SN, required: true },
      {
        key: q(43), label: "Descreva as melhorias, reparos ou adequações realizados desde a fiscalização anterior", type: "textarea", showIf: ifSim(q(42)),
        help: "Quando possível, informe qual situação foi solucionada ou reduzida.",
      },
      { key: q(44), label: "Foi realizado registro fotográfico nesta fiscalização?", type: "radio", options: SN, required: true },
    ],
  },
  {
    title: "4. Estoque e Armazenamento",
    questions: [
      {
        key: q(45), label: "Avaliação das condições de Estoque e Armazenamento", type: "matrix", options: CONF, required: true,
        rows: ["Alimentação adequada", "Gestão da despensa de alimentos", "Itens de higiene pessoal", "Itens de limpeza geral", "Medicações",
          "Local de armazenamento adequado", "Roupas/itens pessoais suficientes", "Itens disponíveis atendem à demanda"],
      },
      { key: q(46), label: "Detalhamento de situação relevante", type: "textarea" },
    ],
  },
  {
    title: "5. Documentação",
    questions: [
      {
        key: q(47), label: "Avaliação das condições de Documentações", type: "matrix", options: CONF, required: true,
        rows: ["Plano Político-Pedagógico – PPP", "Plano Nutricional", "Protocolos", "Regimento Interno", "Licença do Corpo de Bombeiros",
          "Licença da Vigilância Sanitária", "Certificado de dedetização", "PIA elaborado no prazo", "PIA atualizado", "Relatórios de acompanhamento atualizados",
          "Livro de registros atualizado", "Ocorrências relevantes registradas nos autos", "Pastas/documentação individual atualizadas"],
      },
      {
        key: q(48), label: "Detalhamento das pendências ou irregularidades documentais identificadas", type: "textarea",
        help: "Descreva objetivamente a situação identificada, indicando o documento ou registro envolvido, a pendência existente e, quando houver, a providência adotada ou necessária. Registre apenas informações relacionadas à documentação e à organização técnico-institucional.",
      },
    ],
  },
  {
    title: "6. Organização do atendimento, PPP, prontuários e PIA",
    questions: [
      {
        key: q(49), required: true, type: "radio", options: [...SN, "Este é o primeiro registro da unidade"],
        label: "Houve alteração ou foi identificada irregularidade, desde a última fiscalização, nas informações relativas ao PPP, prontuários, Guia de Acolhimento, PIA ou Plano de Atendimento Familiar?",
      },
      { key: q(50), label: "Há grupos de irmãos desmembrados em unidades/modalidades diferentes?", type: "radio", options: [...SN, "Não se aplica"], required: true },
      { key: q(51), label: "Motivo do desmembramento", type: "checkbox", other: true, options: ["Faixa etária", "Determinação judicial", "Entendimento técnico"], showIf: ifSim(q(50)) },
      { key: q(52), label: "São desenvolvidas ações para fortalecimento/manutenção dos vínculos entre os irmãos?", type: "radio", options: [...SN, "Não se aplica"], showIf: ifSim(q(50)) },
      { key: q(53), label: "Situação do PPP", type: "radio", options: ["Elaborado", "Em elaboração/atualização", "Não possui"], required: true },
      {
        key: q(54), label: "Situação das Guias de Acolhimento", type: "radio", required: true,
        options: ["Emitidas e inseridas nos prontuários", "Emitidas, mas há ausência em prontuário", "Há acolhido sem Guia emitida", "Não foi possível verificar"],
      },
      { key: q(55), label: "Os acolhidos possuem prontuários individualizados e atualizados?", type: "radio", options: ["Sim", "Parcialmente", "Não"], required: true },
      {
        key: q(56), label: "Itens que constam nos prontuários", type: "checkbox", other: true, required: true,
        options: ["Documentos pessoais", "Informações de saúde e educação", "Fotografias", "PIA", "Relatórios de acompanhamento"],
      },
      { key: q(57), label: "O PIA é elaborado após o acolhimento no prazo previsto?", type: "radio", options: ["Sim", "Parcialmente", "Não"], required: true },
      {
        key: q(58), label: "Responsável pela elaboração do PIA", type: "radio", other: true, required: true,
        options: ["Equipe do serviço/órgão gestor municipal ou estadual", "Poder Judiciário"],
      },
      { key: q(59), label: "Existe Plano de Atendimento Familiar – PAF?", type: "radio", options: ["Sim", "Em elaboração", "Não"], required: true },
      {
        key: q(60), label: "Elementos contemplados no PIA", type: "checkbox", other: true, required: true,
        options: ["Avaliação interdisciplinar", "Compromissos assumidos pelos responsáveis", "Atividades voltadas à reintegração familiar", "Providências para colocação em família substituta, quando cabível"],
      },
      {
        key: q(61), label: "Observações complementares sobre PPP, PIA, prontuários, Guias de Acolhimento ou PAF", type: "textarea",
        help: "Registre somente informações relevantes que não tenham sido contempladas nas perguntas anteriores.",
      },
    ],
  },
  {
    title: "7. Saúde",
    questions: [
      { key: q(62), label: "A unidade está conseguindo realizar os agendamentos necessários de consultas, exames e terapias?", type: "radio", options: SPNN, required: true },
      { key: q(63), label: "A unidade está conseguindo transportar e acompanhar os acolhidos aos atendimentos de saúde?", type: "radio", options: SPNN, required: true },
      { key: q(64), label: "A unidade está conseguindo acessar os medicamentos e tratamentos prescritos?", type: "radio", options: SPNN, required: true },
      { key: q(65), label: "A unidade está enfrentando dificuldades ou barreiras para acesso dos acolhidos aos serviços de saúde?", type: "radio", options: SN, required: true },
      { key: q(66), label: "Se sim, quais dificuldades/barreiras estão sendo enfrentadas?", type: "textarea", showIf: ifSim(q(65)) },
      {
        key: q(67), label: "Quais serviços/atendimentos têm apresentado maior dificuldade de acesso?", type: "checkbox", other: true, showIf: ifSim(q(65)),
        options: ["Atenção básica", "Especialidades Médicas", "Saúde Mental", "CAPSi", "Exames", "Terapias especializadas", "Odontologia", "Medicamentos"],
      },
      { key: q(68), label: "As dificuldades identificadas têm prejudicado ou atrasado o atendimento dos acolhidos?", type: "radio", options: ["Sim", "Parcialmente", "Não", "Não foi possível avaliar"], showIf: ifSim(q(65)) },
      {
        key: q(69), label: "Detalhamento complementar sobre o acesso à saúde", type: "textarea",
        help: "Registre providências adotadas, articulações realizadas, respostas recebidas, situações ainda aguardando solução ou outras informações relevantes não contempladas anteriormente.",
      },
      { key: q(70), label: "Quantidade de acolhidos atualmente acompanhados pelo Programa Novos Caminhos", type: "number", required: true },
      { key: q(71), label: "Houve novos ingressos no Programa Novos Caminhos desde a última fiscalização?", type: "radio", options: SN, required: true },
      { key: q(72), label: "Quantidade de novos ingressos no Programa Novos Caminhos", type: "number", showIf: ifSim(q(71)) },
      { key: q(73), label: "Detalhamento de aspectos de saúde PC/NC", type: "textarea" },
    ],
  },
  {
    title: "8. Especificidades dos acolhidos",
    questions: [
      { key: q(74), label: "Foi identificada alguma especificidade relevante que ainda não consta ou não está atualizada na planilha de acolhimentos?", type: "radio", options: SN, required: true },
      {
        key: q(75), label: "Qual(is) especificidade(s)?", type: "checkbox", other: true, showIf: ifSim(q(74)),
        options: ["Deficiência/transtorno mental", "Deficiência visual ou auditiva", "Deficiência física", "Dependência química", "Doença infectocontagiosa",
          "Adolescente com filho(s)", "Adolescente grávida", "Ameaçado de morte", "Faccionado", "Situação de rua"],
      },
      { key: q(76), label: "Registro complementar", type: "textarea" },
    ],
  },
  {
    title: "9. Educação, Autonomia e Socioocupacional",
    questions: [
      { key: q(77), label: "A unidade está conseguindo garantir o acesso e a permanência dos acolhidos na escola?", type: "radio", options: SPNN, required: true },
      { key: q(78), label: "A unidade está conseguindo viabilizar o acesso dos acolhidos a atividades de esporte, cultura e lazer?", type: "radio", options: SPNN, required: true },
      { key: q(79), label: "A unidade está conseguindo inserir os adolescentes, quando cabível, em cursos profissionalizantes e/ou ações de preparação para o trabalho?", type: "radio", options: SPNN },
      { key: q(80), label: "São desenvolvidas ações voltadas à autonomia e preparação para a vida adulta dos adolescentes, quando cabível?", type: "radio", options: SPNN },
      { key: q(81), label: "A unidade enfrenta dificuldades ou barreiras para garantir o acesso à educação, profissionalização, esporte, cultura, lazer ou ações de autonomia?", type: "radio", options: SN, required: true },
      { key: q(82), label: "Se sim, quais?", type: "textarea", showIf: ifSim(q(81)) },
      {
        key: q(83), label: "As principais dificuldades decorrem de:", type: "checkbox", other: true, showIf: ifSim(q(81)),
        options: ["Falta de vagas", "Transporte", "Documentação", "Dificuldade de articulação com a rede", "Oferta insuficiente de serviços/atividades", "Horários incompatíveis", "Questões relacionadas à própria unidade"],
      },
      {
        key: q(84), label: "Providências, articulações e evolução das dificuldades identificadas", type: "textarea",
        help: "Quando houver dificuldades, informe o que já foi realizado ou solicitado para enfrentá-las, eventual serviço/órgão acionado, retorno obtido e situação atual.",
      },
    ],
  },
  {
    title: "10. Convivência Familiar e Comunitária",
    questions: [
      { key: q(85), label: "A unidade tem conseguido viabilizar os contatos e visitas entre os acolhidos e seus familiares, quando autorizados e indicados?", type: "radio", options: SPNN, required: true },
      { key: q(86), label: "A unidade dispõe de condições para realização de contatos por telefone e/ou videochamada com familiares?", type: "radio", options: SPNN, required: true },
      { key: q(87), label: "A unidade desenvolve ou viabiliza ações destinadas à preservação e ao fortalecimento dos vínculos familiares?", type: "radio", options: SPNN },
      { key: q(88), label: "A unidade tem conseguido proporcionar a participação dos acolhidos em atividades comunitárias externas?", type: "radio", options: SPNN, required: true },
      { key: q(89), label: "Existem dificuldades ou barreiras para promoção da convivência familiar e comunitária?", type: "radio", options: SN, required: true },
      { key: q(90), label: "Se sim, quais?", type: "textarea", showIf: ifSim(q(89)) },
      {
        key: q(91), label: "As principais barreiras identificadas estão relacionadas a:", type: "checkbox", other: true, showIf: ifSim(q(89)),
        options: ["Distância/localização dos familiares", "Ausência ou baixa adesão familiar", "Dificuldade de transporte", "Restrições judiciais", "Dificuldade de articulação com a rede",
          "Ausência/insuficiência de recursos da unidade", "Ausência de familiares/referências disponíveis"],
      },
      {
        key: q(92), label: "Providências, articulações e evolução das dificuldades relacionadas à convivência familiar e comunitária", type: "textarea",
        help: "Quando houver dificuldades, informe as medidas adotadas ou solicitadas, eventual articulação com a rede, retorno obtido e situação atual.",
      },
    ],
  },
  {
    title: "11. Escuta e Participação dos Acolhidos",
    questions: [
      { key: q(93), label: "Foram realizadas escutas com acolhidos nesta fiscalização?", type: "radio", options: ["Não", "Sim"], required: true },
      { key: q(94), label: "Se sim, qual a quantidade de acolhidos escutados?", type: "number", showIf: ifSim(q(93)) },
      { key: q(95), label: "Se sim, qual a forma da escuta?", type: "radio", options: ["Individual", "Grupo/roda de conversa", "Ambas"], showIf: ifSim(q(93)) },
      {
        key: q(96), label: "Se sim, quais aspectos identificados nas escutas?", type: "checkbox", other: true, showIf: ifSim(q(93)),
        options: ["Satisfação com o atendimento", "Queixa sobre equipe", "Conflitos entre acolhidos", "Queixa sobre alimentação/estrutura", "Dificuldade familiar",
          "Sofrimento emocional", "Relato de violência", "Insegurança", "Nenhuma queixa/situação relevante identificada"],
      },
      {
        key: q(97), label: "Síntese dos aspectos relevantes identificados na escuta dos acolhidos", type: "textarea", showIf: ifSim(q(93)),
        help: "Registre, de forma objetiva e sem identificação nominal, os principais aspectos relacionados ao funcionamento da unidade, atendimento recebido, rotina, convivência, participação, dificuldades ou aspectos positivos mencionados pelos acolhidos.",
      },
    ],
  },
  {
    title: "12. Escuta com Técnicos e Demais Funcionários",
    questions: [
      { key: q(98), label: "Foram realizadas escutas com profissionais da unidade?", type: "radio", options: ["Não", "Sim"], required: true },
      { key: q(99), label: "Se sim, qual a quantidade de profissionais escutados?", type: "number", showIf: ifSim(q(98)) },
      { key: q(100), label: "Se sim, qual a forma da escuta?", type: "radio", options: ["Individual", "Grupo/roda de conversa", "Ambas"], showIf: ifSim(q(98)) },
      {
        key: q(101), label: "Se sim, quais aspectos identificados nas escutas?", type: "checkbox", other: true, showIf: ifSim(q(98)),
        options: ["Condições adequadas/favoráveis", "Sobrecarga de trabalho", "Insuficiência de recursos/insumos", "Dificuldade com gestão/coordenação",
          "Falta de clareza nos fluxos/atribuições", "Bom clima de trabalho", "Ruídos de comunicação/conflitos", "Desgaste emocional/estresse elevado",
          "Relato de assédio/desrespeito/postura inadequada", "Dificuldade no manejo dos acolhidos", "Impasses na execução dos PIAs", "Articulação frágil com a rede",
          "Necessidade de capacitação/suporte técnico", "Sugestões de melhoria", "Nenhuma dificuldade relevante identificada"],
      },
      {
        key: q(102), label: "Síntese e contextualização dos aspectos identificados na escuta dos profissionais", type: "textarea", showIf: ifSim(q(98)),
        help: "Contextualize, quando necessário, os aspectos assinalados anteriormente, registrando de forma objetiva as principais dificuldades, aspectos positivos, providências já adotadas ou outras informações relevantes para compreensão do funcionamento da unidade. Evite identificação nominal, salvo quando indispensável.",
      },
    ],
  },
  {
    title: "13. Ocorrências Relevantes",
    questions: [
      { key: q(103), label: "Houve ocorrência relevante desde a última fiscalização?", type: "radio", options: SN, required: true },
      {
        key: q(104), label: "Se sim, quais os tipo(s) de ocorrência?", type: "checkbox", other: true, showIf: ifSim(q(103)),
        options: ["Evasão", "Agressão/conflito", "Violência intrainstitucional", "Uso de substâncias", "Ocorrência policial", "Ocorrência hospitalar", "Transferência decorrente de ocorrência"],
      },
      {
        key: q(105), label: "Descrição sucinta da(s) ocorrência(s) relevante(s)", type: "textarea", showIf: ifSim(q(103)),
        help: "Descreva objetivamente a natureza da ocorrência, o contexto necessário à sua compreensão e seus principais desdobramentos, sem exposição de dados pessoais além do necessário para fins de fiscalização.",
      },
      { key: q(106), label: "Se sim, a ocorrência foi devidamente registrada pela unidade?", type: "radio", options: ["Sim", "Parcialmente", "Não"], showIf: ifSim(q(103)) },
      { key: q(107), label: "Foram adotadas providências?", type: "radio", options: SPNN, showIf: ifSim(q(103)) },
      { key: q(108), label: "Providências adotadas", type: "textarea", showIf: ifSim(q(103)) },
      {
        key: q(109), label: "Qual foi o resultado das providências adotadas até o momento?", type: "radio", showIf: ifSim(q(103)),
        options: ["Resolvida", "Parcialmente resolvida", "Em acompanhamento", "Sem resultado até o momento", "Não foi possível verificar"],
      },
    ],
  },
  {
    title: "14. Acompanhamento das Pendências Anteriores",
    questions: [
      { key: q(110), label: "Existem pendências de fiscalizações anteriores a serem acompanhadas?", type: "radio", options: SN, required: true },
      { key: q(111), label: "Se sim, qual pendência está sendo atualizada?", type: "textarea", showIf: ifSim(q(110)) },
      {
        key: q(112), label: "Situação atual da pendência", type: "radio", showIf: ifSim(q(110)),
        options: ["Pendente", "Em andamento", "Parcialmente resolvida", "Resolvida", "Reiterada", "Prazo redefinido", "Não foi possível verificar"],
      },
      {
        key: q(113), label: "O que foi realizado desde a última fiscalização em relação a essa pendência?", type: "textarea", showIf: ifSim(q(110)),
        help: "Informe as providências adotadas pela unidade ou pela rede desde a última fiscalização, incluindo solicitações, reparos, encaminhamentos, reuniões, respostas recebidas ou outras medidas relacionadas à pendência.",
      },
      {
        key: q(114), label: "Resultado das providências e situação atual", type: "textarea", showIf: ifSim(q(110)),
        help: "Informe o que efetivamente mudou após as providências adotadas, o que permanece sem solução e, quando aplicável, o que ainda está aguardando resposta ou execução.",
      },
    ],
  },
  {
    title: "15. Novas Pendências",
    questions: [
      { key: q(115), label: "Foram identificadas novas pendências nesta fiscalização?", type: "radio", options: SN, required: true },
      {
        key: q(116), label: "Descreva a nova pendência identificada", type: "textarea", showIf: ifSim(q(115)),
        help: "Registre objetivamente o problema ou situação que necessita de acompanhamento nas próximas fiscalizações. Caso existam pendências distintas, descreva-as separadamente. Quando houver mais de uma pendência, registre cada situação em uma nova linha.",
      },
      {
        key: q(117), label: "Providência necessária ou já solicitada", type: "textarea", showIf: ifSim(q(115)),
        help: "Informe a medida necessária e, caso alguma providência já tenha sido adotada ou solicitada, descreva o que foi realizado.",
      },
      { key: q(118), label: "Responsável pela providência", type: "text", showIf: ifSim(q(115)) },
    ],
  },
  {
    title: "16. Articulação Necessária",
    questions: [
      { key: q(119), label: "Foi necessário acionar outro serviço, órgão ou setor em razão de alguma situação identificada/acompanhada nesta fiscalização?", type: "radio", options: SN, required: true },
      {
        key: q(120), label: "Se sim, quem foi acionado?", type: "checkbox", other: true, showIf: ifSim(q(119)),
        options: ["Gestão", "SEMIAS", "ADRA", "Saúde", "CAPS", "Educação", "CREAS/CRAS", "Conselho Tutelar", "Sistema de Justiça"],
      },
      {
        key: q(121), label: "Motivo da articulação, providência solicitada e situação atual", type: "textarea", showIf: ifSim(q(119)),
        help: "Informe, de forma sucinta, por que o órgão ou serviço foi acionado, o que foi solicitado ou pactuado e, quando houver informação disponível, o retorno recebido ou a situação atual.",
      },
      { key: q(122), label: "Houve retorno?", type: "radio", options: [...SN, "Aguardando retorno"], showIf: ifSim(q(119)) },
      { key: q(123), label: "Qual foi o resultado até o momento?", type: "textarea", showIf: ifSim(q(119)) },
    ],
  },
];

export const OTHER = "Outro: ";

// A pergunta aparece segundo as respostas dadas (get devolve o valor atual de outra pergunta).
export function visible(q: FQ, get: (key: string) => string): boolean {
  if (!q.showIf) return true;
  const v = get(q.showIf.key);
  if (q.showIf.is) return q.showIf.is.includes(v);
  if (q.showIf.isNot) return !q.showIf.isNot.includes(v);
  return true;
}

export const rowKey = (key: string, i: number) => `${key}__${i}`;

export type Visit = {
  unit: string; date: string; professionals: string[];
  status: "agendada" | "realizada";
  responded_at?: string; responded_by?: string;
};

const iso = (v: string) => { const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : v; };
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

// Monta o relatório da fiscalização (mesmo padrão do Cadastro inicial e do Acompanhamento).
function parasOf(answers: Ans, now = new Date()): Para[] {
  const font = "Times New Roman";
  const mk = (runs: Run[], o: { jc?: Para["jc"]; line?: string; before?: string; after?: string; left?: string; first?: string } = {}): Para => ({
    jc: o.jc, font, sz: 24,
    sp: { line: o.line ?? "276", lineRule: "auto", ...(o.before ? { before: o.before } : {}), ...(o.after ? { after: o.after } : {}) },
    ind: { ...(o.left ? { left: o.left } : {}), ...(o.first ? { firstLine: o.first } : {}) },
    runs,
  });
  const run = (t: string, bold = false): Run => ({ t, sz: 24, ...(bold ? { b: true } : {}) });
  const blank = () => mk([]);
  const val = (k: string) => (answers[k]?.value ?? "").trim();
  const get = (k: string) => val(k);

  const out: Para[] = [
    mk([run("RELATÓRIO DE FISCALIZAÇÃO MENSAL DE UNIDADE DE ACOLHIMENTO", true)], { jc: "center", line: "360", before: "360" }),
    blank(),
  ];

  for (const sec of FISC_SECTIONS) {
    const items: Para[] = [];
    for (const qn of sec.questions) {
      if (!visible(qn, get)) continue;
      if (qn.type === "matrix") {
        const rows = (qn.rows ?? []).map((r, i) => [r, val(rowKey(qn.key, i))] as const).filter(([, v]) => v);
        if (!rows.length) continue;
        items.push(mk([run(qn.label, true)], { jc: "both", after: "60" }));
        for (const [r, v] of rows) items.push(mk([run(`• ${r}: `), run(v, true)], { left: "360" }));
        items.push(blank());
        continue;
      }
      const v = val(qn.key);
      if (!v) continue;
      const shown = qn.type === "date" ? iso(v) : v.split("; ").map((s) => (s.startsWith(OTHER) ? `Outro: ${s.slice(OTHER.length)}` : s)).join("; ");
      if (qn.type === "textarea") {
        items.push(mk([run(qn.label, true)], { jc: "both", after: "60" }));
        for (const line of shown.split(/\r?\n+/).map((l) => l.trim()).filter(Boolean)) items.push(mk([run(line)], { jc: "both", first: "720" }));
        items.push(blank());
      } else {
        items.push(mk([run(/[?:.]$/.test(qn.label) ? `${qn.label} ` : `${qn.label}: `, true), run(shown)], { jc: "both", after: "120" }));
      }
    }
    if (!items.length) continue;
    out.push(mk([run(sec.title.toUpperCase(), true)], { line: "360" }), ...items);
  }

  out.push(
    blank(),
    mk([run(`Porto Velho/RO, ${now.getDate()} de ${MESES[now.getMonth()]} de ${now.getFullYear()}.`)], { jc: "right" }),
    blank(),
    mk([run(val("q3").split("; ").filter(Boolean).join(" / ") || "")], { jc: "center" }),
  );
  return out;
}

export async function buildFiscDoc(base: Buffer, rec: Rec): Promise<Buffer> {
  return serializeDocx(base, parasOf(rec.answers));
}

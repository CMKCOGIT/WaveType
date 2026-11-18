// js/ui/pdf.js
// PDFs gerados no navegador (jsPDF + jspdf-autotable), sem servidor: os
// dados já chegam filtrados pelo banco (RLS e RPCs do professor), então o
// arquivo só contém o que a pessoa já pode ver na tela.
// As bibliotecas são carregadas só quando alguém exporta.

let bibliotecas = null;
async function carregar() {
  bibliotecas ??= Promise.all([import('jspdf'), import('jspdf-autotable')]).then(([{ jsPDF }, tabela]) => ({
    jsPDF,
    autoTable: tabela.autoTable ?? tabela.default,
  }));
  return bibliotecas;
}

const AZUL = [49, 95, 214];
const TINTA = [24, 32, 56];
const CINZA = [96, 105, 130];

const LINHA = [214, 221, 238];

/**
 * Quebra um texto na largura disponível e limita o número de linhas
 * (a última termina em "…"). Nomes longos de turmas e exercícios não
 * atravessam a margem nem empurram a tabela para fora da página.
 */
export function linhasLimitadas(doc, texto, largura, maximo) {
  const linhas = doc.splitTextToSize(String(texto ?? '').replace(/\s+/g, ' ').trim(), largura);
  if (linhas.length <= maximo) return linhas;
  const cortadas = linhas.slice(0, maximo);
  let ultima = cortadas[maximo - 1];
  while (ultima.length && doc.getTextWidth(`${ultima}…`) > largura) ultima = ultima.slice(0, -1);
  cortadas[maximo - 1] = `${ultima.trimEnd()}…`;
  return cortadas;
}

/**
 * Gera e baixa um PDF com uma tabela.
 *   titulo, subtitulo: cabeçalho do documento
 *   colunas: ['Nome', ...]; linhas: [[...], ...]
 *   arquivo: nome do arquivo sem extensão
 *   resumo: linhas curtas abaixo do subtítulo (ex.: totais)
 * Devolve o Blob gerado (útil para testes).
 */
export async function baixarPdfTabela({ titulo, subtitulo = '', colunas, linhas, arquivo, resumo = [], paisagem = false, larguras = {} }) {
  const { jsPDF, autoTable } = await carregar();
  const doc = new jsPDF({ orientation: paisagem ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const largura = doc.internal.pageSize.getWidth();
  const margem = 14;
  const util = largura - 2 * margem;
  const gerado = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  // Faixa da marca e identificação
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, largura, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...AZUL);
  doc.setCharSpace(0.6);
  doc.text('WAVETYPE', margem, 13);
  doc.setCharSpace(0);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...CINZA);
  doc.text(gerado, largura - margem, 13, { align: 'right' });

  // Título: até 2 linhas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...TINTA);
  const linhasTitulo = linhasLimitadas(doc, titulo, util, 2);
  let y = 21;
  doc.text(linhasTitulo, margem, y, { lineHeightFactor: 1.2 });
  y += (linhasTitulo.length - 1) * 6.4;

  // Subtítulo (até 2 linhas) e resumo (cada item até 3 linhas)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...CINZA);
  if (subtitulo) {
    const linhasSub = linhasLimitadas(doc, subtitulo, util, 2);
    y += 6;
    doc.text(linhasSub, margem, y, { lineHeightFactor: 1.3 });
    y += (linhasSub.length - 1) * 4.6;
  }
  doc.setFontSize(9);
  for (const item of resumo) {
    const linhasResumo = linhasLimitadas(doc, item, util, 3);
    y += 5;
    doc.text(linhasResumo, margem, y, { lineHeightFactor: 1.3 });
    y += (linhasResumo.length - 1) * 4.4;
  }
  y += 4;
  doc.setDrawColor(...LINHA);
  doc.setLineWidth(0.3);
  doc.line(margem, y, largura - margem, y);

  const TOTAL = '{t}'; // curto: o texto é alinhado à direita antes da troca pelo total
  autoTable(doc, {
    startY: y + 4,
    head: [colunas],
    body: linhas.map((l) => l.map((v) => (v == null ? '' : String(v)))),
    margin: { top: 16, left: margem, right: margem, bottom: 16 },
    styles: {
      font: 'helvetica',
      fontSize: 8.8,
      cellPadding: { top: 2.2, right: 2.4, bottom: 2.2, left: 2.4 },
      textColor: TINTA,
      lineColor: [226, 230, 240],
      lineWidth: 0.2,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: 'bold', valign: 'middle' },
    alternateRowStyles: { fillColor: [245, 247, 252] },
    columnStyles: larguras,
    rowPageBreak: 'avoid',
    didDrawPage: () => {
      const pagina = doc.internal.getCurrentPageInfo().pageNumber;
      const altura = doc.internal.pageSize.getHeight();
      if (pagina > 1) {
        // Páginas seguintes: faixa fina e o título encurtado, para não perder o contexto
        doc.setFillColor(...AZUL);
        doc.rect(0, 0, largura, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...CINZA);
        doc.text(linhasLimitadas(doc, titulo, util, 1), margem, 10);
      }
      doc.setDrawColor(...LINHA);
      doc.line(margem, altura - 12, largura - margem, altura - 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...CINZA);
      doc.text(`© CMKCOGIT – Todos os direitos reservados · Gerado em ${gerado}`, margem, altura - 7.5);
      doc.text(`Página ${pagina} de ${TOTAL}`, largura - margem, altura - 7.5, { align: 'right' });
    },
  });
  if (typeof doc.putTotalPages === 'function') doc.putTotalPages(TOTAL);

  const blob = doc.output('blob');
  baixarArquivo(blob, `${arquivo}.pdf`);
  return blob;
}

export function baixarArquivo(blob, nome) {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: nome });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

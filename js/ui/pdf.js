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

  doc.setFillColor(...AZUL);
  doc.rect(0, 0, largura, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...AZUL);
  doc.text('WAVETYPE', margem, 14);
  doc.setFontSize(16);
  doc.setTextColor(...TINTA);
  doc.text(String(titulo), margem, 23);
  let y = 23;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...CINZA);
  if (subtitulo) {
    y += 6;
    doc.text(doc.splitTextToSize(String(subtitulo), largura - 2 * margem), margem, y);
  }
  for (const linha of resumo) {
    y += 5;
    doc.text(String(linha), margem, y);
  }

  autoTable(doc, {
    startY: y + 6,
    head: [colunas],
    body: linhas.map((l) => l.map((v) => (v == null ? '' : String(v)))),
    margin: { left: margem, right: margem, bottom: 16 },
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.4, textColor: TINTA, lineColor: [226, 230, 240], lineWidth: 0.2 },
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 252] },
    columnStyles: larguras,
    didDrawPage: () => {
      const pagina = doc.internal.getCurrentPageInfo().pageNumber;
      const altura = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(...CINZA);
      doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, margem, altura - 8);
      doc.text(`Página ${pagina}`, largura - margem, altura - 8, { align: 'right' });
    },
  });

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

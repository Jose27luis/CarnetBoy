import { Injectable } from '@nestjs/common';
import type { AnemiaClass, AppointmentType, DoseStatus, GuardianCarnet, IronProduct, IronPurpose } from '@carnet/contracts';
import PDFDocument from 'pdfkit';
import { todayInLima } from '../../common/clinical/record-meta';
import { CarnetService } from './carnet.service';

const CELESTE = '#0b7fb3';
const INK = '#0e2a3a';
const MUTED = '#4b6577';
const LINE = '#d3e6f0';
const MARGIN = 48;

const DATE = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' });

const DOSE_STATUS: Record<DoseStatus, string> = { APPLIED: 'Aplicada', DUE: 'Le toca', OVERDUE: 'Atrasada', FUTURE: 'Próxima' };
const ANEMIA: Record<AnemiaClass, string> = { NONE: 'Sin anemia', MILD: 'Leve', MODERATE: 'Moderada', SEVERE: 'Severa', UNCLASSIFIED: 'Sin clasificación' };
const APPOINTMENT: Record<AppointmentType, string> = { GROWTH_CHECK: 'Control de crecimiento', VACCINATION: 'Vacunación', HEMOGLOBIN_TEST: 'Dosaje de hemoglobina' };
const PRODUCT: Record<IronProduct, string> = { DROPS: 'Gotas', SYRUP: 'Jarabe', MICRONUTRIENTS: 'Micronutrientes', TABLETS: 'Tabletas' };
const PURPOSE: Record<IronPurpose, string> = { PREVENTION: 'Prevención', TREATMENT: 'Tratamiento' };
const GROWTH: Record<string, string> = {
  NORMAL: 'Normal',
  UNDERWEIGHT: 'Bajo peso',
  SEVERELY_UNDERWEIGHT: 'Bajo peso severo',
  STUNTED: 'Talla baja',
  SEVERELY_STUNTED: 'Talla baja severa',
  WASTED: 'Desnutrición aguda',
  SEVERELY_WASTED: 'Desnutrición aguda severa',
  OVERWEIGHT: 'Sobrepeso',
  OBESE: 'Obesidad',
};

function date(value: string): string {
  return DATE.format(new Date(`${value}T12:00:00Z`));
}

interface Column {
  label: string;
  width: number;
}

type Doc = InstanceType<typeof PDFDocument>;

function ensureSpace(doc: Doc, height: number): void {
  if (doc.y + height > doc.page.height - MARGIN - 30) {
    doc.addPage();
  }
}

function section(doc: Doc, title: string): void {
  ensureSpace(doc, 60);
  doc.moveDown(0.8).font('Helvetica-Bold').fontSize(13).fillColor(CELESTE).text(title, MARGIN, doc.y);
  doc.moveDown(0.3);
}

function table(doc: Doc, columns: readonly Column[], rows: readonly string[][], empty: string): void {
  if (rows.length === 0) {
    doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(empty, MARGIN, doc.y);
    return;
  }

  const drawRow = (cells: readonly string[], bold: boolean): void => {
    const heights = cells.map((cell, index) => doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).heightOfString(cell, { width: (columns[index]?.width ?? 60) - 6 }));
    const height = Math.max(...heights) + 8;
    ensureSpace(doc, height);
    const top = doc.y;
    let x = MARGIN;

    cells.forEach((cell, index) => {
      const width = columns[index]?.width ?? 60;
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(bold ? MUTED : INK).text(cell, x + 3, top + 4, { width: width - 6 });
      x += width;
    });
    doc.moveTo(MARGIN, top + height).lineTo(doc.page.width - MARGIN, top + height).strokeColor(LINE).lineWidth(0.6).stroke();
    doc.y = top + height;
  };

  drawRow(columns.map((column) => column.label), true);
  rows.forEach((row) => drawRow(row, false));
}

@Injectable()
export class CarnetPdfService {
  constructor(private readonly carnet: CarnetService) {}

  async render(accountId: string, childId: string, now: Date = new Date()): Promise<{ fileName: string; content: Buffer }> {
    const data = await this.carnet.carnet(accountId, childId, now);
    const content = await this.draw(data, now);
    const slug = `${data.child.givenNames}-${data.child.paternalSurname}`
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .toLowerCase();

    return { fileName: `carnet-cred-${slug}.pdf`, content };
  }

  private draw(data: GuardianCarnet, now: Date): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true, info: { Title: `Carnet CRED de ${data.child.givenNames}`, Author: 'Carnet CRED' } });
    const chunks: Buffer[] = [];
    const finished = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
    const child = data.child;

    doc.rect(0, 0, doc.page.width, 92).fill(CELESTE);
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#ffffff').text('Carnet CRED', MARGIN, 30);
    doc.font('Helvetica').fontSize(10).text('Crecimiento, vacunación y anemia', MARGIN, 58);
    doc.y = 116;
    doc.font('Helvetica-Bold').fontSize(18).fillColor(INK).text(`${child.givenNames} ${child.paternalSurname} ${child.maternalSurname}`, MARGIN);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(MUTED)
      .text(
        `Nació el ${date(child.birthDate)}. ${child.sex === 'FEMALE' ? 'Niña' : 'Niño'}.${child.gestationalWeeks === null ? '' : ` ${child.gestationalWeeks} semanas de gestación.`}`,
      );

    section(doc, 'Vacunas');
    table(
      doc,
      [
        { label: 'Vacuna', width: 150 },
        { label: 'Dosis', width: 40 },
        { label: 'Estado', width: 70 },
        { label: 'Fecha', width: 70 },
        { label: 'Establecimiento', width: 110 },
        { label: 'Lote', width: 59 },
      ],
      data.doses.map((dose) => [
        dose.vaccineName,
        String(dose.doseNumber),
        DOSE_STATUS[dose.status],
        dose.appliedOn === null ? date(dose.recommendedDate) : date(dose.appliedOn),
        dose.facilityName ?? '',
        dose.lot ?? '',
      ]),
      data.scheduleNorm === null ? 'El esquema de vacunación aún no está publicado.' : 'Sin dosis en el esquema.',
    );

    section(doc, 'Controles de crecimiento');
    table(
      doc,
      [
        { label: 'Fecha', width: 70 },
        { label: 'Peso', width: 60 },
        { label: 'Talla', width: 60 },
        { label: 'Cabeza', width: 60 },
        { label: 'Peso para la talla', width: 129 },
        { label: 'Talla para la edad', width: 120 },
      ],
      data.growth.map((check) => [
        date(check.measuredOn),
        `${check.weightKg} kg`,
        `${check.lengthCm} cm`,
        check.headCircumferenceCm === null ? '' : `${check.headCircumferenceCm} cm`,
        check.weightForLength === null ? '' : (GROWTH[check.weightForLength] ?? check.weightForLength),
        check.lengthForAge === null ? '' : (GROWTH[check.lengthForAge] ?? check.lengthForAge),
      ]),
      'Sin controles registrados.',
    );

    section(doc, 'Hemoglobina');
    table(
      doc,
      [
        { label: 'Fecha', width: 80 },
        { label: 'Observada', width: 80 },
        { label: 'Ajustada', width: 80 },
        { label: 'Resultado', width: 100 },
        { label: 'Establecimiento', width: 159 },
      ],
      data.hemoglobin.map((test) => [date(test.testedOn), `${test.observed} g/dL`, `${test.adjusted} g/dL`, ANEMIA[test.classification], test.facilityName]),
      'Sin dosajes registrados.',
    );

    section(doc, 'Hierro');
    table(
      doc,
      [
        { label: 'Fecha', width: 80 },
        { label: 'Producto', width: 90 },
        { label: 'Finalidad', width: 80 },
        { label: 'Indicación', width: 249 },
      ],
      data.iron.map((supply) => [date(supply.suppliedOn), `${PRODUCT[supply.product]} x ${supply.quantity}`, PURPOSE[supply.purpose], supply.doseInstructions]),
      'Sin entregas de hierro.',
    );

    section(doc, 'Próximas citas');
    table(
      doc,
      [
        { label: 'Fecha', width: 80 },
        { label: 'Tipo', width: 150 },
        { label: 'Establecimiento', width: 269 },
      ],
      data.appointments.map((appointment) => [date(appointment.scheduledOn), APPOINTMENT[appointment.type], appointment.facilityName]),
      'Sin citas programadas.',
    );

    const range = doc.bufferedPageRange();

    for (let page = range.start; page < range.start + range.count; page += 1) {
      doc.switchToPage(page);
      doc.page.margins.bottom = 0;
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(MUTED)
        .text(
          `Generado el ${date(todayInLima(now))} desde Carnet CRED. Documento informativo; no reemplaza la historia clínica. Página ${page - range.start + 1} de ${range.count}.`,
          MARGIN,
          doc.page.height - MARGIN + 14,
          { width: doc.page.width - MARGIN * 2, align: 'center', lineBreak: false },
        );
    }

    doc.end();

    return finished;
  }
}

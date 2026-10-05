import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';

const SOURCE_BASE = 'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators';
const OUTPUT_DIRECTORY = path.join(import.meta.dirname, '..', 'src', 'who-2006');

interface TableSource {
  file: string;
  url: string;
}

const SOURCES: readonly TableSource[] = [
  { file: 'wfa-boys', url: `${SOURCE_BASE}/weight-for-age/expanded-tables/wfa-boys-zscore-expanded-tables.xlsx` },
  { file: 'wfa-girls', url: `${SOURCE_BASE}/weight-for-age/expanded-tables/wfa-girls-zscore-expanded-tables.xlsx` },
  { file: 'lhfa-boys', url: `${SOURCE_BASE}/length-height-for-age/expandable-tables/lhfa-boys-zscore-expanded-tables.xlsx` },
  { file: 'lhfa-girls', url: `${SOURCE_BASE}/length-height-for-age/expandable-tables/lhfa-girls-zscore-expanded-tables.xlsx` },
  { file: 'hcfa-boys', url: `${SOURCE_BASE}/head-circumference-for-age/expanded-tables/hcfa-boys-zscore-expanded-tables.xlsx` },
  { file: 'hcfa-girls', url: `${SOURCE_BASE}/head-circumference-for-age/expanded-tables/hcfa-girls-zscore-expanded-tables.xlsx` },
  { file: 'wfl-boys', url: `${SOURCE_BASE}/weight-for-length-height/expanded-tables/wfl-boys-zscore-expanded-table.xlsx` },
  { file: 'wfl-girls', url: `${SOURCE_BASE}/weight-for-length-height/expanded-tables/wfl-girls-zscore-expanded-table.xlsx` },
  { file: 'wfh-boys', url: `${SOURCE_BASE}/weight-for-length-height/expanded-tables/wfh-boys-zscore-expanded-tables.xlsx` },
  { file: 'wfh-girls', url: `${SOURCE_BASE}/weight-for-length-height/expanded-tables/wfh-girls-zscore-expanded-tables.xlsx` },
];

function cellNumber(value: ExcelJS.CellValue): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }

  throw new Error(`Valor no numérico en la tabla: ${JSON.stringify(value)}`);
}

function columnIndex(header: ExcelJS.Row, name: string): number {
  let found = -1;

  header.eachCell((cell, column) => {
    if (String(cell.value).trim().toUpperCase() === name.toUpperCase()) {
      found = column;
    }
  });

  if (found === -1) {
    throw new Error(`La tabla no tiene la columna ${name}.`);
  }

  return found;
}

async function importTable(source: TableSource): Promise<void> {
  const response = await fetch(source.url);

  if (!response.ok) {
    throw new Error(`No se pudo descargar ${source.url}: ${response.status}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()));
  const sheet = workbook.worksheets[0];

  if (sheet === undefined) {
    throw new Error(`El archivo ${source.url} no tiene hojas.`);
  }

  const header = sheet.getRow(1);
  const variable = String(header.getCell(1).value).trim();
  const columns = { l: columnIndex(header, 'L'), m: columnIndex(header, 'M'), s: columnIndex(header, 'S') };
  const rows: [number, number, number, number][] = [];

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);

    if (row.getCell(1).value === null) {
      continue;
    }

    rows.push([
      cellNumber(row.getCell(1).value),
      cellNumber(row.getCell(columns.l).value),
      cellNumber(row.getCell(columns.m).value),
      cellNumber(row.getCell(columns.s).value),
    ]);
  }

  const table = { source: source.url, variable, rows };
  await writeFile(path.join(OUTPUT_DIRECTORY, `${source.file}.json`), `${JSON.stringify(table)}\n`);
  process.stdout.write(`${source.file}: ${rows.length} filas, ${variable} de ${rows[0]?.[0]} a ${rows.at(-1)?.[0]}\n`);
}

await mkdir(OUTPUT_DIRECTORY, { recursive: true });

for (const source of SOURCES) {
  await importTable(source);
}

import { auth } from '@/auth';
import { unauthorized, notFound, badRequest, forbidden, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Script from '@/models/script.model';
import Project from '@/models/project.model';
import { checkActionLimit, incrementActionUsage } from '@/lib/subscription';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from 'docx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import path from 'path';
import fs from 'fs';

type Params = { params: Promise<{ id: string; sid: string }> };

type ScriptLine = { startTime: string; endTime: string; text: string };

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;

/**
 * GET /api/projects/[id]/scripts/[sid]/export?format=txt|json|docx|pdf
 * Export a script in the requested format.
 *
 * txt  — plain timestamped text
 * json — full script JSON
 * docx — Office Open XML .docx (proper Word format)
 * pdf  — styled PDF with logo and script content
 */
export async function GET(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id: projectId, sid } = await params;
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') ?? 'txt';

  if (!['txt', 'json', 'docx', 'pdf'].includes(format)) {
    return badRequest('format must be txt, json, docx, or pdf');
  }

  try {
    await connectDB();

    const exportCheck = await checkActionLimit(session.user.id, 'export');
    if (!exportCheck.allowed) {
      return forbidden('Monthly limit for export reached. Upgrade or wait until next month.');
    }

    const script = await Script.findOne({
      _id:       sid,
      projectId,
      userId:    session.user.id,
      deletedAt: null,
    }).lean();

    if (!script) return notFound('Script not found');

    await incrementActionUsage(session.user.id, 'export');

    const filename = script.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    if (format === 'json') {
      const json = JSON.stringify(
        {
          title:     script.title,
          platform:  'unknown',
          lines:     script.lines,
          plainText: script.plainText,
          createdAt: script.createdAt,
        },
        null,
        2
      );
      return new Response(json, {
        headers: {
          'Content-Type':        'application/json',
          'Content-Disposition': `attachment; filename="${filename}.json"`,
        },
      });
    }

    if (format === 'txt') {
      const text = script.lines.length > 0
        ? (script.lines as ScriptLine[]).map((l) => `${l.startTime} --> ${l.endTime}\n${l.text}`).join('\n\n')
        : script.plainText;

      return new Response(text, {
        headers: {
          'Content-Type':        'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.txt"`,
        },
      });
    }

    if (format === 'pdf') {
      const project = await Project.findById(projectId).select('title').lean();
      const projectTitle = (project as { title?: string } | null)?.title ?? 'Project';
      const scriptLines = (script.lines ?? []) as ScriptLine[];

      const pdfDoc = await PDFDocument.create();
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      const yFromTop = (py: number) => PAGE_HEIGHT - py;

      const logoPath = path.join(process.cwd(), 'public', 'assets', 'logo', 'logo-script-minder.png');
      if (fs.existsSync(logoPath)) {
        const logoBytes = fs.readFileSync(logoPath);
        const png = await pdfDoc.embedPng(logoBytes);
        page.drawImage(png, { x: MARGIN, y: yFromTop(74), width: 100, height: 34 });
      } else {
        page.drawText('ScriptMinder', {
          x: MARGIN,
          y: yFromTop(64),
          size: 20,
          font: helveticaBold,
          color: rgb(0.02, 0.71, 0.83),
        });
      }
      page.drawText('AI-Powered Script Writing', {
        x: MARGIN,
        y: yFromTop(98),
        size: 9,
        font: helvetica,
        color: rgb(0.42, 0.45, 0.5),
      });

      let contentY = 120;
      page.drawText(projectTitle, {
        x: MARGIN,
        y: yFromTop(contentY),
        size: 10,
        font: helvetica,
        color: rgb(0.42, 0.45, 0.5),
      });
      contentY += 22;
      page.drawText(script.title, {
        x: MARGIN,
        y: yFromTop(contentY),
        size: 22,
        font: helveticaBold,
        color: rgb(0.07, 0.09, 0.15),
      });
      contentY += 40;

      page.drawLine({
        start: { x: MARGIN, y: yFromTop(contentY) },
        end: { x: PAGE_WIDTH - MARGIN, y: yFromTop(contentY) },
        thickness: 1,
        color: rgb(0.9, 0.91, 0.92),
      });
      contentY += 30;

      if (scriptLines.length > 0) {
        for (let i = 0; i < scriptLines.length; i++) {
          const line = scriptLines[i];
          const timeStr = `${line.startTime} -> ${line.endTime}`;
          const text = line.text || '—';
          if (contentY > PAGE_HEIGHT - 80) {
            page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            contentY = 50;
          }
          page.drawText(timeStr, {
            x: MARGIN,
            y: yFromTop(contentY),
            size: 9,
            font: helvetica,
            color: rgb(0.42, 0.45, 0.5),
          });
          page.drawText(text, {
            x: 220,
            y: yFromTop(contentY),
            size: 10,
            font: helvetica,
            color: rgb(0.07, 0.09, 0.15),
            maxWidth: 325,
          });
          const textWidth = helvetica.widthOfTextAtSize(text, 10);
          const estimatedLines = Math.ceil(textWidth / 325);
          const lineHeight = Math.max(14, estimatedLines * 14);
          contentY += lineHeight + 10;
        }
      } else if (script.plainText) {
        page.drawText(script.plainText, {
          x: MARGIN,
          y: yFromTop(contentY),
          size: 10,
          font: helvetica,
          color: rgb(0.07, 0.09, 0.15),
          maxWidth: PAGE_WIDTH - 2 * MARGIN,
        });
      } else {
        page.drawText('No content.', {
          x: MARGIN,
          y: yFromTop(contentY),
          size: 10,
          font: helvetica,
          color: rgb(0.61, 0.64, 0.69),
        });
      }

      const pages = pdfDoc.getPages();
      for (const p of pages) {
        p.drawText(`ScriptMinder · ${script.title}`, {
          x: MARGIN,
          y: 30,
          size: 8,
          font: helvetica,
          color: rgb(0.61, 0.64, 0.69),
        });
      }

      const pdfBytes = await pdfDoc.save();
      const pdf = Buffer.from(pdfBytes);

      return new Response(pdf, {
        headers: {
          'Content-Type':        'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}.pdf"`,
          'Content-Length':      String(pdf.length),
        },
      });
    }

    // docx — proper Office Open XML format (real .docx)
    if (format === 'docx') {
      const tableRows =
        script.lines.length > 0
          ? script.lines.map(
              (l) =>
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `${l.startTime} -> ${l.endTime}`,
                              size: 22, // ~11pt
                              color: '888888',
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun(l.text)] })],
                    }),
                  ],
                })
            )
          : [
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 2,
                    children: [new Paragraph({ children: [new TextRun(script.plainText)] })],
                  }),
                ],
              }),
            ];

      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                text: script.title,
                heading: 'Heading1',
                spacing: { after: 400 },
              }),
              new Table({
                rows: tableRows,
                width: { size: 100, type: 'pct' },
              }),
            ],
          },
        ],
      });

      const buffer = await Packer.toBuffer(doc);
      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}.docx"`,
        },
      });
    }

    return badRequest('Unknown format');
  } catch (err) {
    return serverError(err);
  }
}

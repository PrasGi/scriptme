import { auth } from '@/auth';
import { unauthorized, notFound, badRequest, forbidden, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Script from '@/models/script.model';
import Project from '@/models/project.model';
import ExportSettings from '@/models/export-settings.model';
import { checkActionLimit, incrementActionUsage } from '@/lib/subscription';
import { stripHtml } from '@/lib/utils';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from 'docx';
import { PDFDocument, StandardFonts, rgb, PDFImage } from 'pdf-lib';
import path from 'path';
import fs from 'fs';

type Params = { params: Promise<{ id: string; sid: string }> };

type ScriptLine = { startTime: string; endTime: string; text: string };

/** Count how many lines the text will wrap to at the given font/size/maxWidth (word wrap). */
function countWrappedLines(
  font: { widthOfTextAtSize: (t: string, size: number) => number },
  text: string,
  fontSize: number,
  maxWidth: number
): number {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return 1;
  const words = normalized.split(' ');
  let lines = 1;
  let currentWidth = font.widthOfTextAtSize(words[0], fontSize);
  for (let i = 1; i < words.length; i++) {
    const segment = ' ' + words[i];
    const w = font.widthOfTextAtSize(segment, fontSize);
    if (currentWidth + w <= maxWidth) {
      currentWidth += w;
    } else {
      lines += 1;
      currentWidth = font.widthOfTextAtSize(words[i], fontSize);
    }
  }
  return lines;
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 52;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

// PDF theme (matches app accent #7C3AED)
const COLORS = {
  brand:      { r: 0.49, g: 0.23, b: 0.93 },
  brandLight: { r: 0.95, g: 0.93, b: 1 },
  title:      { r: 0.09, g: 0.09, b: 0.14 },
  body:       { r: 0.18, g: 0.19, b: 0.24 },
  muted:      { r: 0.45, g: 0.48, b: 0.55 },
  border:      { r: 0.91, g: 0.90, b: 0.94 },
  divider:    { r: 0.88, g: 0.86, b: 0.94 },
} as const;

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
        ? (script.lines as ScriptLine[]).map((l) => `${l.startTime} --> ${l.endTime}\n${stripHtml(l.text)}`).join('\n\n')
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
      const exportSettings = await ExportSettings.findOne({ userId: session.user.id }).lean();
      const logoUrl = exportSettings?.logoUrl?.trim() || null;
      const headerPlaceholder = exportSettings?.headerPlaceholder?.trim() || null;
      const footerPlaceholder = exportSettings?.footerPlaceholder?.trim() || null;
      const formality = exportSettings?.formality ?? 'standard';
      const companyName = exportSettings?.companyName?.trim() || null;
      const tagline = exportSettings?.tagline?.trim() || null;

      const pdfDoc = await PDFDocument.create();
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const r = (c: { r: number; g: number; b: number }) => rgb(c.r, c.g, c.b);

      let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      const yFromTop = (py: number) => PAGE_HEIGHT - py;

      // —— Header: light brand band and branding block ——
      const headerTop = 32;
      const logoMaxWidth = 160;
      const logoMaxHeight = 52;
      const centerX = PAGE_WIDTH / 2;
      const headerBandHeight = 92;

      const drawLogoProportional = (img: PDFImage, topFromTop: number) => {
        const scale = Math.min(logoMaxWidth / img.width, logoMaxHeight / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;
        page.drawImage(img, {
          x: centerX - w / 2,
          y: yFromTop(topFromTop + h),
          width: w,
          height: h,
        });
      };

      page.drawRectangle({
        x: 0,
        y: yFromTop(headerTop + 2),
        width: PAGE_WIDTH,
        height: headerBandHeight,
        color: r(COLORS.brandLight),
      });

      let logoDrawn = false;
      if (logoUrl) {
        try {
          const logoRes = await fetch(logoUrl);
          if (logoRes.ok) {
            const logoBuf = await logoRes.arrayBuffer();
            const bytes = new Uint8Array(logoBuf);
            try {
              const png = await pdfDoc.embedPng(bytes);
              drawLogoProportional(png, headerTop + logoMaxHeight + 8);
              logoDrawn = true;
            } catch {
              try {
                const jpeg = await pdfDoc.embedJpg(bytes);
                drawLogoProportional(jpeg, headerTop + logoMaxHeight + 8);
                logoDrawn = true;
              } catch {
                /* fall through */
              }
            }
          }
        } catch {
          /* fall through */
        }
      }
      if (!logoDrawn) {
        const logoPath = path.join(process.cwd(), 'public', 'assets', 'logo', 'logo-script-minder.png');
        if (fs.existsSync(logoPath)) {
          const logoBytes = fs.readFileSync(logoPath);
          const png = await pdfDoc.embedPng(logoBytes);
          drawLogoProportional(png, headerTop + logoMaxHeight + 8);
        } else {
          const brandText = companyName || 'ScriptMe';
          const brandW = helveticaBold.widthOfTextAtSize(brandText, 22);
          page.drawText(brandText, {
            x: centerX - brandW / 2,
            y: yFromTop(headerTop + 28),
            size: 22,
            font: helveticaBold,
            color: r(COLORS.brand),
          });
        }
      }
      const subtitleText = tagline || companyName || 'AI-Powered Script Writing';
      const subW = helvetica.widthOfTextAtSize(subtitleText, 9);
      page.drawText(subtitleText, {
        x: centerX - subW / 2,
        y: yFromTop(headerTop + logoMaxHeight + 22),
        size: 9,
        font: helvetica,
        color: r(COLORS.muted),
      });
      if (headerPlaceholder) {
        const placeW = helvetica.widthOfTextAtSize(headerPlaceholder, 8);
        page.drawText(headerPlaceholder, {
          x: centerX - placeW / 2,
          y: yFromTop(headerTop + logoMaxHeight + 34),
          size: 8,
          font: helvetica,
          color: r(COLORS.muted),
        });
      }

      // —— Accent line under header ——
      const headerBottom = headerTop + headerBandHeight;
      page.drawLine({
        start: { x: MARGIN, y: yFromTop(headerBottom) },
        end: { x: PAGE_WIDTH - MARGIN, y: yFromTop(headerBottom) },
        thickness: 2,
        color: r(COLORS.brand),
      });

      // —— Title block (centered) ——
      let contentY = headerBottom + 28;
      const projW = helvetica.widthOfTextAtSize(projectTitle, 9);
      page.drawText(projectTitle, {
        x: centerX - projW / 2,
        y: yFromTop(contentY),
        size: 9,
        font: helvetica,
        color: r(COLORS.muted),
      });
      contentY += 18;
      const titleLabel = formality === 'formal' ? `${script.title} – Formal` : script.title;
      const titleW = helveticaBold.widthOfTextAtSize(titleLabel, 24);
      page.drawText(titleLabel, {
        x: centerX - titleW / 2,
        y: yFromTop(contentY),
        size: 24,
        font: helveticaBold,
        color: r(COLORS.title),
      });
      contentY += 36;
      page.drawLine({
        start: { x: MARGIN, y: yFromTop(contentY) },
        end: { x: PAGE_WIDTH - MARGIN, y: yFromTop(contentY) },
        thickness: 0.5,
        color: r(COLORS.divider),
      });
      contentY += 24;

      // —— Body: two columns with vertical divider ——
      const TS_COLUMN_WIDTH = 165;
      const TEXT_X = MARGIN + TS_COLUMN_WIDTH + 16;
      const TEXT_MAX_WIDTH = CONTENT_WIDTH - TS_COLUMN_WIDTH - 16;
      const ROW_GAP = 10;
      const TS_FONT_SIZE = 9;
      const BODY_FONT_SIZE = 11;
      const BODY_LINE_HEIGHT = 14;

      if (scriptLines.length > 0) {
        let bodyDividerDrawn = false;
        for (let i = 0; i < scriptLines.length; i++) {
          const line = scriptLines[i];
          const timeStr = `${line.startTime} -> ${line.endTime}`;
          const text = stripHtml(line.text) || '—';
          if (contentY > PAGE_HEIGHT - 72) {
            page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            contentY = 52;
            page.drawLine({
              start: { x: TEXT_X - 8, y: 52 },
              end: { x: TEXT_X - 8, y: PAGE_HEIGHT - 52 },
              thickness: 0.5,
              color: r(COLORS.border),
            });
          }
          if (!bodyDividerDrawn) {
            bodyDividerDrawn = true;
            page.drawLine({
              start: { x: TEXT_X - 8, y: 52 },
              end: { x: TEXT_X - 8, y: yFromTop(contentY) },
              thickness: 0.5,
              color: r(COLORS.border),
            });
          }
          page.drawText(timeStr, {
            x: MARGIN,
            y: yFromTop(contentY),
            size: TS_FONT_SIZE,
            font: helvetica,
            color: r(COLORS.muted),
          });
          page.drawText(text, {
            x: TEXT_X,
            y: yFromTop(contentY),
            size: BODY_FONT_SIZE,
            font: helvetica,
            color: r(COLORS.body),
            maxWidth: TEXT_MAX_WIDTH,
          });
          const estimatedLines = countWrappedLines(helvetica, text, BODY_FONT_SIZE, TEXT_MAX_WIDTH);
          const blockHeight = Math.max(1, Math.min(30, estimatedLines)) * BODY_LINE_HEIGHT;
          contentY += blockHeight + ROW_GAP;
        }
      } else if (script.plainText) {
        page.drawText(script.plainText, {
          x: MARGIN,
          y: yFromTop(contentY),
          size: BODY_FONT_SIZE,
          font: helvetica,
          color: r(COLORS.body),
          maxWidth: CONTENT_WIDTH,
        });
      } else {
        page.drawText('No content.', {
          x: MARGIN,
          y: yFromTop(contentY),
          size: BODY_FONT_SIZE,
          font: helvetica,
          color: r(COLORS.muted),
        });
      }

      // —— Footer on every page ——
      const pages = pdfDoc.getPages();
      const totalPages = pages.length;
      const brand = companyName || 'ScriptMe';
      const FOOTER_Y = 42;
      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        const pageNum = i + 1;
        const footerText = footerPlaceholder
          ? footerPlaceholder.replace(/\{page\}/gi, String(pageNum)).replace(/\{total\}/gi, String(totalPages))
          : `${brand} · Page ${pageNum} of ${totalPages}`;
        const footerW = helvetica.widthOfTextAtSize(footerText, 8);
        p.drawLine({
          start: { x: MARGIN, y: FOOTER_Y + 14 },
          end: { x: PAGE_WIDTH - MARGIN, y: FOOTER_Y + 14 },
          thickness: 0.5,
          color: r(COLORS.divider),
        });
        p.drawText(footerText, {
          x: centerX - footerW / 2,
          y: FOOTER_Y,
          size: 8,
          font: helvetica,
          color: r(COLORS.muted),
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
      const exportSettingsDocx = await ExportSettings.findOne({ userId: session.user.id }).lean();
      const companyNameDocx = exportSettingsDocx?.companyName?.trim() || null;
      const taglineDocx = exportSettingsDocx?.tagline?.trim() || null;
      const formalityDocx = exportSettingsDocx?.formality ?? 'standard';
      const headerPlaceholderDocx = exportSettingsDocx?.headerPlaceholder?.trim() || null;

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
                      children: [new Paragraph({ children: [new TextRun(stripHtml(l.text))] })],
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

      const docChildren: (Paragraph | Table)[] = [];
      if (companyNameDocx || taglineDocx) {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: companyNameDocx || taglineDocx || '', size: 22, color: '888888' })],
            spacing: { after: 200 },
          })
        );
      }
      if (headerPlaceholderDocx) {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: headerPlaceholderDocx, size: 20, color: '999999' })],
            spacing: { after: 200 },
          })
        );
      }
      const titleText = formalityDocx === 'formal' ? `${script.title} – Formal` : script.title;
      docChildren.push(
        new Paragraph({
          text: titleText,
          heading: 'Heading1',
          spacing: { after: 400 },
        })
      );
      docChildren.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: 'pct' },
        })
      );

      const doc = new Document({
        sections: [{ children: docChildren }],
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

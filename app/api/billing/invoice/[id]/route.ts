/**
 * GET /api/billing/invoice/[id]
 * Returns invoice PDF for a transaction.
 */
import { auth } from '@/auth';
import { unauthorized, notFound, badRequest } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Transaction from '@/models/transaction.model';
import User from '@/models/user.model';
import { Types } from 'mongoose';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import path from 'path';
import fs from 'fs';

type Params = { params: Promise<{ id: string }> };

function formatRp(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function isValidObjectId(id: string): boolean {
  return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;

export async function GET(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  if (!id || !isValidObjectId(id)) return badRequest('Invalid transaction ID');

  try {
    await connectDB();
    const tx = await Transaction.findOne({
      _id:    new Types.ObjectId(id),
      userId: new Types.ObjectId(session.user.id),
    })
      .populate<{ planId: { name: string; slug: string } }>('planId', 'name slug')
      .lean();

    if (!tx) return notFound('Transaction not found');

    const user = await User.findById(session.user.id).select('name email').lean();
    const userName = user?.name ?? session.user.name ?? 'Customer';
    const userEmail = user?.email ?? session.user.email ?? '';

    const planName = (tx.planId as { name?: string })?.name ?? 'Subscription';
    const planSlug = (tx.planId as { slug?: string })?.slug ?? '';

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const y = (py: number) => PAGE_HEIGHT - py;

    // Logo or title
    const logoPath = path.join(process.cwd(), 'public', 'assets', 'logo', 'logo-script-minder.png');
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath);
      const png = await pdfDoc.embedPng(logoBytes);
      page.drawImage(png, { x: MARGIN, y: y(90), width: 120, height: 40 });
    } else {
      page.drawText('ScriptMinder', {
        x: MARGIN,
        y: y(70),
        size: 24,
        font: helveticaBold,
        color: rgb(0.024, 0.714, 0.831),
      });
    }
    page.drawText('AI-Powered Script Writing', {
      x: MARGIN,
      y: y(105),
      size: 10,
      font: helvetica,
      color: rgb(0.42, 0.45, 0.5),
    });

    // Invoice title
    page.drawText('INVOICE', {
      x: PAGE_WIDTH - MARGIN - 70,
      y: y(55),
      size: 20,
      font: helveticaBold,
      color: rgb(0.07, 0.09, 0.15),
    });
    page.drawText(`#${id.slice(-8).toUpperCase()}`, {
      x: PAGE_WIDTH - MARGIN - 80,
      y: y(80),
      size: 10,
      font: helvetica,
      color: rgb(0.42, 0.45, 0.5),
    });

    // Bill to
    const billToY = 160;
    page.drawText('Bill to', {
      x: MARGIN,
      y: y(billToY),
      size: 12,
      font: helveticaBold,
      color: rgb(0.07, 0.09, 0.15),
    });
    page.drawText(userName, { x: MARGIN, y: y(billToY + 22), size: 11, font: helvetica, color: rgb(0.22, 0.25, 0.32) });
    page.drawText(userEmail, { x: MARGIN, y: y(billToY + 38), size: 10, font: helvetica, color: rgb(0.42, 0.45, 0.5) });

    page.drawText('Invoice Date', {
      x: PAGE_WIDTH - MARGIN - 120,
      y: y(billToY),
      size: 10,
      font: helvetica,
      color: rgb(0.42, 0.45, 0.5),
    });
    page.drawText(formatDate(new Date(tx.createdAt)), {
      x: PAGE_WIDTH - MARGIN - 120,
      y: y(billToY + 18),
      size: 11,
      font: helvetica,
      color: rgb(0.07, 0.09, 0.15),
    });
    page.drawText('Status', {
      x: PAGE_WIDTH - MARGIN - 120,
      y: y(billToY + 48),
      size: 10,
      font: helvetica,
      color: rgb(0.42, 0.45, 0.5),
    });
    const statusColor =
      tx.status === 'completed' ? rgb(0.02, 0.59, 0.41) : tx.status === 'pending' ? rgb(0.85, 0.47, 0.02) : rgb(0.42, 0.45, 0.5);
    page.drawText(tx.status.toUpperCase(), {
      x: PAGE_WIDTH - MARGIN - 80,
      y: y(billToY + 66),
      size: 11,
      font: helveticaBold,
      color: statusColor,
    });

    // Divider
    page.drawLine({
      start: { x: MARGIN, y: y(250) },
      end: { x: PAGE_WIDTH - MARGIN, y: y(250) },
      thickness: 1,
      color: rgb(0.9, 0.91, 0.92),
    });

    // Table header
    const tableTop = 265;
    page.drawRectangle({
      x: MARGIN,
      y: y(tableTop + 28),
      width: PAGE_WIDTH - 2 * MARGIN,
      height: 28,
      color: rgb(0.95, 0.96, 0.96),
      borderColor: rgb(0.9, 0.91, 0.92),
    });
    page.drawText('Description', { x: MARGIN + 10, y: y(tableTop + 12), size: 10, font: helveticaBold, color: rgb(0.22, 0.25, 0.32) });
    page.drawText('Quantity', { x: 350, y: y(tableTop + 12), size: 10, font: helveticaBold, color: rgb(0.22, 0.25, 0.32) });
    page.drawText('Amount', { x: PAGE_WIDTH - MARGIN - 75, y: y(tableTop + 12), size: 10, font: helveticaBold, color: rgb(0.22, 0.25, 0.32) });

    // Table row
    const rowY = tableTop + 28;
    page.drawRectangle({
      x: MARGIN,
      y: y(rowY + 36),
      width: PAGE_WIDTH - 2 * MARGIN,
      height: 36,
      color: rgb(1, 1, 1),
    });
    page.drawText(`${planName} — ${tx.months} month${tx.months > 1 ? 's' : ''}`, {
      x: MARGIN + 10,
      y: y(rowY + 20),
      size: 11,
      font: helvetica,
      color: rgb(0.07, 0.09, 0.15),
    });
    page.drawText(`${tx.months} month${tx.months > 1 ? 's' : ''}`, { x: 350, y: y(rowY + 20), size: 11, font: helvetica, color: rgb(0.07, 0.09, 0.15) });
    page.drawText(formatRp(tx.amountIdr), {
      x: PAGE_WIDTH - MARGIN - 110,
      y: y(rowY + 20),
      size: 11,
      font: helvetica,
      color: rgb(0.07, 0.09, 0.15),
    });

    let totalY = rowY + 36;
    if (tx.voucherCode && (tx.voucherDiscountIdr ?? 0) > 0) {
      totalY += 28;
      page.drawRectangle({
        x: MARGIN,
        y: y(totalY),
        width: PAGE_WIDTH - 2 * MARGIN,
        height: 28,
        color: rgb(0.94, 0.99, 0.96),
      });
      page.drawText(`Coupon: ${tx.voucherCode}`, {
        x: MARGIN + 10,
        y: y(totalY - 12),
        size: 10,
        font: helvetica,
        color: rgb(0.02, 0.59, 0.41),
      });
      page.drawText(`-${formatRp(tx.voucherDiscountIdr!)}`, {
        x: PAGE_WIDTH - MARGIN - 110,
        y: y(totalY - 12),
        size: 10,
        font: helvetica,
        color: rgb(0.02, 0.59, 0.41),
      });
    }

    totalY += 20;
    page.drawRectangle({
      x: 350,
      y: y(totalY + 40),
      width: 195,
      height: 40,
      color: rgb(0.02, 0.71, 0.83),
    });
    page.drawText('Total', { x: 365, y: y(totalY + 12), size: 12, font: helveticaBold, color: rgb(1, 1, 1) });
    page.drawText(formatRp(tx.amountIdr), {
      x: PAGE_WIDTH - MARGIN - 110,
      y: y(totalY + 12),
      size: 12,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });

    // Footer
    page.drawText('Thank you for your business.', {
      x: MARGIN,
      y: y(782),
      size: 9,
      font: helvetica,
      color: rgb(0.61, 0.64, 0.69),
    });
    page.drawText('ScriptMinder — AI-Powered Script Writing for Creators', {
      x: MARGIN,
      y: y(796),
      size: 9,
      font: helvetica,
      color: rgb(0.61, 0.64, 0.69),
    });

    const pdfBytes = await pdfDoc.save();
    const pdf = Buffer.from(pdfBytes);

    const filename = `invoice-${planSlug}-${id.slice(-8)}.pdf`;
    return new Response(pdf, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      String(pdf.length),
      },
    });
  } catch (err) {
    console.error('[invoice]', err);
    return notFound('Transaction not found');
  }
}

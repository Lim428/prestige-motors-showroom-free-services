import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { hasVerifiedTrustEvidence } from "@/lib/trust-evidence";
import { dealerName, siteUrl } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 48;
const ink = rgb(0.067, 0.067, 0.067);
const copper = rgb(0.65, 0.34, 0.18);
const champagne = rgb(0.85, 0.71, 0.42);
const muted = rgb(0.38, 0.38, 0.38);
const line = rgb(0.88, 0.87, 0.84);

function safePdfText(value: string) {
  return value
    .replace(/[–—]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];

  function splitLongWord(word: string) {
    const chunks: string[] = [];
    let chunk = "";

    for (const character of word) {
      const candidate = `${chunk}${character}`;
      if (chunk && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        chunks.push(chunk);
        chunk = character;
      } else {
        chunk = candidate;
      }
    }

    if (chunk) {
      chunks.push(chunk);
    }

    return chunks;
  }

  for (const paragraph of safePdfText(text).split(/\r?\n/)) {
    const words = paragraph
      .split(/\s+/)
      .filter(Boolean)
      .flatMap((word) =>
        font.widthOfTextAtSize(word, size) <= maxWidth ? [word] : splitLongWord(word)
      );
    let current = "";

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;

      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        if (current) {
          lines.push(current);
        }
        current = word;
      }
    }

    lines.push(current || " ");
  }

  return lines;
}

function reportFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const car = await prisma.car.findFirst({
    where: { isPublished: true, OR: [{ id }, { slug: id }] },
    include: {
      trustProfile: true,
      trustDocuments: {
        where: { verified: true },
        orderBy: [{ category: "asc" }, { createdAt: "desc" }],
      },
    },
  });

  if (
    !car ||
    !car.trustProfile ||
    car.trustProfile.inspectionStatus !== "VERIFIED" ||
    !hasVerifiedTrustEvidence(car.trustProfile, car.trustDocuments)
  ) {
    return Response.json(
      { error: "A verified trust report is not available for this vehicle." },
      { status: 404 },
    );
  }

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const reportTitle = `${car.year} ${car.brand} ${car.model}`;
  let page!: PDFPage;
  let y!: number;

  function addPage() {
    page = pdf.addPage([pageWidth, pageHeight]);
    page.drawRectangle({ x: 0, y: pageHeight - 12, width: pageWidth, height: 12, color: champagne });
    page.drawText(safePdfText(dealerName().toUpperCase()), {
      x: margin,
      y: pageHeight - 42,
      size: 9,
      font: bold,
      color: copper,
    });
    page.drawText("VERIFIED VEHICLE TRUST PACK", {
      x: pageWidth - margin - 168,
      y: pageHeight - 42,
      size: 8,
      font: bold,
      color: muted,
    });
    page.drawLine({
      start: { x: margin, y: pageHeight - 54 },
      end: { x: pageWidth - margin, y: pageHeight - 54 },
      thickness: 0.75,
      color: line,
    });
    y = pageHeight - 86;
  }

  function ensureSpace(requiredHeight: number) {
    if (y - requiredHeight < 60) {
      addPage();
    }
  }

  function heading(label: string) {
    ensureSpace(50);
    page.drawText(safePdfText(label.toUpperCase()), {
      x: margin,
      y,
      size: 9,
      font: bold,
      color: copper,
    });
    y -= 20;
  }

  function paragraph(value: string, size = 10.5) {
    const lines = wrapText(value, regular, size, pageWidth - margin * 2);

    for (const textLine of lines) {
      ensureSpace(15);
      page.drawText(textLine, { x: margin, y, size, font: regular, color: muted });
      y -= 15;
    }
    y -= 8;
  }

  function fact(label: string, value: string, column: 0 | 1, rowY: number) {
    const x = margin + 12 + column * 248;
    page.drawText(safePdfText(label.toUpperCase()), {
      x,
      y: rowY,
      size: 7.5,
      font: bold,
      color: muted,
    });
    page.drawText(safePdfText(value), {
      x,
      y: rowY - 17,
      size: 11,
      font: bold,
      color: ink,
    });
  }

  addPage();
  page.drawText(safePdfText(reportTitle), {
    x: margin,
    y,
    size: 26,
    font: bold,
    color: ink,
  });
  y -= 31;
  page.drawText(`Report generated ${new Intl.DateTimeFormat("en-MY", { dateStyle: "long", timeZone: "Asia/Kuala_Lumpur" }).format(new Date())}`, {
    x: margin,
    y,
    size: 9,
    font: regular,
    color: muted,
  });
  y -= 14;
  page.drawText(
    `Inspection completed ${new Intl.DateTimeFormat("en-MY", { dateStyle: "long", timeZone: "Asia/Kuala_Lumpur" }).format(car.trustProfile.lastInspectedAt!)}`,
    {
      x: margin,
      y,
      size: 9,
      font: regular,
      color: muted,
    },
  );
  y -= 34;

  page.drawRectangle({
    x: margin,
    y: y - 88,
    width: pageWidth - margin * 2,
    height: 100,
    color: rgb(0.97, 0.96, 0.93),
    borderColor: line,
    borderWidth: 0.75,
  });
  fact("Inspection status", "Verified", 0, y - 17);
  fact(
    "Inspection score",
    car.trustProfile.inspectionScore === null
      ? "Not scored"
      : `${car.trustProfile.inspectionScore}/100`,
    1,
    y - 17,
  );
  fact("Ownership", car.trustProfile.ownershipCount ? `${car.trustProfile.ownershipCount} owner(s)` : "Not stated", 0, y - 59);
  fact(
    "Accident declaration",
    car.trustProfile.accidentFree === null
      ? "Not stated"
      : car.trustProfile.accidentFree
        ? "Declared accident-free"
        : "See inspection notes",
    1,
    y - 59,
  );
  y -= 122;

  heading("Inspection summary");
  paragraph(car.trustProfile.inspectionSummary || "No additional inspection summary has been published.");

  heading("Service and warranty");
  paragraph(car.trustProfile.serviceHistorySummary || "No service-history summary has been published.");
  paragraph(
    car.trustProfile.warrantyMonths
      ? `${car.trustProfile.warrantyMonths} month warranty${car.trustProfile.warrantyProvider ? ` through ${car.trustProfile.warrantyProvider}` : ""}. Confirm final coverage and exclusions with the showroom.`
      : "No warranty term is currently recorded. Confirm current coverage with the showroom.",
  );

  heading("Verified documents");
  if (car.trustDocuments.length === 0) {
    paragraph("No supporting documents have been published with this report.");
  } else {
    for (const document of car.trustDocuments) {
      const titleLines = wrapText(document.title, bold, 10.5, pageWidth - margin * 2);
      for (const titleLine of titleLines) {
        ensureSpace(15);
        page.drawText(titleLine, {
          x: margin,
          y,
          size: 10.5,
          font: bold,
          color: ink,
        });
        y -= 15;
      }
      ensureSpace(15);
      page.drawText(
        safePdfText(
          `${document.category.replaceAll("_", " ")} - ${document.issuedAt ? new Intl.DateTimeFormat("en-MY", { dateStyle: "medium" }).format(document.issuedAt) : "Issue date not stated"}`,
        ),
        { x: margin, y, size: 8.5, font: regular, color: muted },
      );
      y -= 22;
    }
  }

  ensureSpace(64);
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 0.75,
    color: line,
  });
  y -= 18;
  paragraph(
    `This trust pack summarizes dealership records available on the issue date. It is not a substitute for an independent inspection, financing approval, insurance review, or final sale documentation. Verify current details with ${dealerName()}.`,
    8.5,
  );
  page.drawText(safePdfText(`${siteUrl()}/cars/${car.slug}`), {
    x: margin,
    y: Math.max(y, 38),
    size: 8,
    font: regular,
    color: copper,
  });

  pdf.setTitle(`${reportTitle} - Verified Vehicle Trust Pack`);
  pdf.setAuthor(dealerName());
  pdf.setSubject("Verified vehicle inspection, service, ownership, and warranty summary");
  pdf.setCreator("Prestige Motors Showroom");
  pdf.setCreationDate(new Date());
  const bytes = await pdf.save();

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${reportFileName(reportTitle)}-trust-pack.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

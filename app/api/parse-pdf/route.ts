import { NextRequest, NextResponse } from "next/server";
import PDFParser from "pdf2json";

interface PdfParserErrorPayload {
    parserError?: unknown;
}

type PdfParserWithRawText = PDFParser & {
    getRawTextContent(): string;
};

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json(
                { success: false, error: "No file uploaded." },
                { status: 400 }
            );
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Parse PDF using pdf2json
        const text = await new Promise<string>((resolve, reject) => {
            const pdfParser = new PDFParser(null, true);
            const parserWithRawText = pdfParser as PdfParserWithRawText;

            pdfParser.on("pdfParser_dataError", (errData: PdfParserErrorPayload) =>
                reject(errData.parserError ?? errData)
            );
            pdfParser.on("pdfParser_dataReady", () => {
                const rawText = parserWithRawText.getRawTextContent();
                resolve(rawText);
            });

            pdfParser.parseBuffer(buffer);
        });

        // Return raw text
        return NextResponse.json({
            success: true,
            text,
        });
    } catch (error) {
        console.error("PDF parsing error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to parse PDF document." },
            { status: 500 }
        );
    }
}

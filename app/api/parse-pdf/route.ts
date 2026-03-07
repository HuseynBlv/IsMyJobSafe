import { NextRequest, NextResponse } from "next/server";
import PDFParser from "pdf2json";
import { enforceRateLimit } from "@/lib/rate-limit";

type PdfParserError = Error | { parserError: Error };

type PdfParserWithRawText = PDFParser & {
    getRawTextContent(): string;
};

const MAX_PDF_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const PDF_MIME_TYPE = "application/pdf";
const PDF_SIGNATURE = "%PDF-";

function bytesToMb(bytes: number) {
    return (bytes / (1024 * 1024)).toFixed(1);
}

function hasPdfSignature(buffer: Buffer) {
    return buffer.subarray(0, PDF_SIGNATURE.length).toString("utf8") === PDF_SIGNATURE;
}

export async function POST(req: NextRequest) {
    const rateLimitResponse = await enforceRateLimit(req, {
        keyPrefix: "parse-pdf",
        limit: 5,
        windowMs: 60_000,
    });
    if (rateLimitResponse) {
        return rateLimitResponse;
    }

    try {
        const formData = await req.formData();
        const fileValue = formData.get("file");

        if (!(fileValue instanceof File)) {
            return NextResponse.json(
                {
                    success: false,
                    code: "MISSING_FILE",
                    error: "No file was uploaded. Please choose a PDF resume file.",
                },
                { status: 400 }
            );
        }

        const file = fileValue;

        if (file.size === 0) {
            return NextResponse.json(
                {
                    success: false,
                    code: "EMPTY_FILE",
                    error: "The uploaded file is empty. Please upload a valid PDF file.",
                },
                { status: 400 }
            );
        }

        if (file.type !== PDF_MIME_TYPE) {
            return NextResponse.json(
                {
                    success: false,
                    code: "UNSUPPORTED_MIME",
                    error: "Only PDF files are accepted for resume parsing.",
                },
                { status: 415 }
            );
        }

        if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
            return NextResponse.json(
                {
                    success: false,
                    code: "FILE_TOO_LARGE",
                    error: `PDF is too large (${bytesToMb(file.size)} MB). Maximum allowed size is ${bytesToMb(MAX_PDF_FILE_SIZE_BYTES)} MB.`,
                },
                { status: 413 }
            );
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (!hasPdfSignature(buffer)) {
            return NextResponse.json(
                {
                    success: false,
                    code: "INVALID_PDF",
                    error: "The uploaded file is not a valid PDF document.",
                },
                { status: 415 }
            );
        }

        // Parse PDF using pdf2json
        const text = await new Promise<string>((resolve, reject) => {
            const pdfParser = new PDFParser(null, true);
            const parserWithRawText = pdfParser as PdfParserWithRawText;

            pdfParser.on("pdfParser_dataError", (errData: PdfParserError) => {
                if (errData instanceof Error) {
                    reject(errData);
                    return;
                }

                reject(errData.parserError);
            });
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
            {
                success: false,
                code: "PARSE_FAILED",
                error: "We could not extract text from this PDF. Please upload a text-based PDF or paste your resume manually.",
            },
            { status: 422 }
        );
    }
}

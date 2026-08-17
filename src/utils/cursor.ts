export interface PaginationCursor {
     createdAt: string;
     id: string;
}

export function encodeCursor(cursor: PaginationCursor): string {
     return Buffer
          .from(JSON.stringify(cursor))
          .toString("base64url");
}

export function decodeCursor(cursor: string): PaginationCursor {
     const decoded = Buffer
          .from(cursor, "base64url")
          .toString("utf8");

     const parsed: unknown = JSON.parse(decoded);

     if (
          typeof parsed !== "object" ||
          parsed === null ||
          !("createdAt" in parsed) ||
          !("id" in parsed) ||
          typeof parsed.createdAt !== "string" ||
          typeof parsed.id !== "string"
     ) {
          throw new Error("Invalid cursor");
     }

     return {
          createdAt: parsed.createdAt,
          id: parsed.id,
     };
}

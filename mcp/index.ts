import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { GET_LAST_USERS } from "./tools/tools";
import prisma from "../src/config/prisma";

const server = new Server({
     name: "srvj-backend",
     version: "1.0.0",
}, {
     capabilities: { tools: {} }
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
     tools: [
          GET_LAST_USERS
     ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
     if (request.params.name === "get_last_users") {
          const limit = Number(request.params.arguments?.limit ?? 10);

          const users = await prisma.user.findMany({
               take: limit,
               orderBy: { createdAt: "desc" }
          });

          return {
               content: [{
                    type: "text",
                    text: JSON.stringify(users)
               }]
          };
     }

     return {
          isError: true,
          content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }]
     };
});

async function main() {
     const transport = new StdioServerTransport();
     await server.connect(transport);
     console.error("MCP of SRVJ backend started");
}

main().catch((err: unknown) => {
     console.error(err instanceof Error ? err.message : err);
     process.exit(1);
});

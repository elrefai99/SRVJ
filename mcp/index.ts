import '../src/config/dotenv'
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { getUsers, getUserUsername, totalUsers } from './functions/users';
import { lastNotifications } from './functions/notifications';
import { notification, system, user } from './tools';
import { architectureProject } from './CallTool/project_architecture';

const server = new Server({
     name: "srvj-backend",
     version: "1.0.0",
}, {
     capabilities: { tools: {} }
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
     tools: [
          user.GET_LAST_USERS,
          user.USER_DATA_BY_USERNAME,
          user.TOTAL_USERS,
          notification.GET_LAST_Notifications,
          system.GET_FEATURE_EXAMPLE,
          system.PROJECT_ARCHITECTURE
     ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
     if (request.params.name === "get_username_data") {
          const username = String(request.params.arguments?.username)
          const user = await getUserUsername(username)
          return {
               content: [{
                    type: "text",
                    text: JSON.stringify(user)
               }]
          };
     }
     if (request.params.name === "get_last_users") {
          const limit = Number(request.params.arguments?.limit ?? 10);

          const user = await getUsers(limit)
          return {
               content: [{
                    type: "text",
                    text: JSON.stringify(user)
               }]
          };
     }
     if (request.params.name === "total_users") {
          const status = String(request.params.arguments?.status ?? 'active');
          const totalUsersDB = await totalUsers(status)
          return {
               content: [{
                    type: "text",
                    text: JSON.stringify(totalUsersDB)
               }]
          };
     }
     if (request.params.name === "get_last_notification") {
          const limit = Number(request.params.arguments?.limit ?? 10);

          const notification = await lastNotifications(limit)
          return {
               content: [{
                    type: "text",
                    text: JSON.stringify(notification)
               }]
          };
     }
     if (request.params.name === 'get_project_architecture') {
          architectureProject()
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

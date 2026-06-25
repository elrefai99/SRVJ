import { Tool } from "@modelcontextprotocol/sdk/types";

export const GET_LAST_Notifications: Tool = {
     name: "get_last_notification",
     description: "Fetch the most recently created notifications from the database",
     inputSchema: {
          type: "object",
          properties: {
               limit: {
                    type: "number",
                    description: "Maximum number of notifications to return (default 10)"
               }
          }
     }
} as const

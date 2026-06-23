import { Tool } from '@modelcontextprotocol/sdk/types.js'

export const GET_LAST_USERS: Tool = {
     name: "get_last_users",
     description: "Fetch the most recently created users from the database",
     inputSchema: {
          type: "object",
          properties: {
               limit: {
                    type: "number",
                    description: "Maximum number of users to return (default 10)"
               }
          }
     }
} as const
export const TOTAL_USERS: Tool = {
     name: "total_users",
     description: "Count the total number of users in the database, filtered by status",
     inputSchema: {
          type: "object",
          properties: {
               status: {
                    type: "string",
                    enum: ["active", "inactive", "delete", "ban"],
                    description: "User status to count (default active)"
               }
          }
     }
} as const
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

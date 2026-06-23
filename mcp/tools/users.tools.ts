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

export const USER_DATA_BY_USERNAME: Tool = {
     name: "get_username_data",
     description: "Fetch user data with username",
     inputSchema: {
          type: "object",
          properties: {
               username: {
                    type: "string",
                    description: "User username always requeird"
               }
          },
          required: ["username"]
     }
} as const

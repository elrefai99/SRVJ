import { Tool } from '@modelcontextprotocol/sdk/types.js'

export const GET_LAST_USERS: Tool = {
     name: "get_last_users",
     description: "Fetch a user from database by ID",
     inputSchema: {
          type: "object",
          properties: {
               id: { type: "string" }
          },
          required: ["id"]
     }
} as const

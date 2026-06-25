import { Tool } from "@modelcontextprotocol/sdk/types";

export const GET_FEATURE_EXAMPLE: Tool = {
     name: 'get_feature_example',
     description: 'Returns an existing feature structure to use as a template.',
     inputSchema: {
          type: 'object',
          properties: {
               feature: {
                    type: 'string'
               }
          }
     }
} as const

export const PROJECT_ARCHITECTURE: Tool = {
     name: 'get_project_architecture',
     description: 'Returns the backend architecture and conventions that all new features must follow.',
     inputSchema: {
          type: 'object',
          properties: {}
     }
}

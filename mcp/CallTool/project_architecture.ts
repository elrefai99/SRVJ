export const architectureProject = () => {
     return {
          content: [
               {
                    type: 'text',
                    text: `
All new features MUST strictly follow this architecture:

Module/
  FeatureName/
    feature.module.ts       # Express Router — applies validateDTO + wires controllers
    feature.controller.ts   # Barrel re-exporting all controllers

    DTO/
      index.dto.ts          # Zod schemas + inferred types

    Controller/
      action.controller.ts  # One file per endpoint

    Service/
      feature.service.ts    # Business logic class

    utils/                  # Optional feature utilities

    @types/
      index.d.ts            # Optional feature types

Rules:
- One controller file per endpoint.
- Controllers must export a single RequestHandler.
- Controllers should contain no business logic.
- All business logic belongs in Service classes.
- Use Zod for all DTOs.
- Export both schema and inferred type from DTO files.
- feature.module.ts is responsible for routes and middleware wiring.
- feature.controller.ts should only re-export controllers.
- Follow existing naming conventions used in the codebase.
                    `.trim()
               }
          ]
     }
}

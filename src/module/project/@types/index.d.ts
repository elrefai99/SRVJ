
type visibility = 'PRIVATE' | 'PUBLIC' | 'UNLISTED'
export interface IPayloadProject {
     public readonly title?: string
     public readonly description?: string
     public readonly visibility?: visibility
     public readonly user?: number
     public readonly project?: string
     public readonly oldProject?: any
     public readonly search?: string
     public readonly limit?: string
     public readonly cursor?: string
}


export interface YoutubeTitleOption {
  style: string
  title: string
}

export type YoutubeMetadataTone = 'balanced' | 'funny' | 'seo'

export interface YoutubeMetadataDraft {
  id: string
  clipId: string
  model: string
  tone: string
  promptVersion: string
  sourceHash: string
  sourceStartMs: number
  sourceEndMs: number
  summary: string
  titles: YoutubeTitleOption[]
  selectedTitle: string
  description: string
  hashtags: string[]
  tags: string[]
  isStale: boolean
  createdAt: string
  updatedAt: string
}

export interface OllamaModels {
  models: string[]
  defaultModel: string | null
}

export interface MetadataGenerationInput {
  model?: string
  tone: YoutubeMetadataTone
}

export interface MetadataEditInput {
  selectedTitle: string
  description: string
  tags: string[]
  hashtags: string[]
}

export type TranslationLanguage = 'hindi' | 'english'

export type VerseTheme =
  | 'soul'
  | 'war'
  | 'meditation'
  | 'divine'
  | 'knowledge'
  | 'action'
  | 'devotion'
  | 'nature'
  | 'cosmos'

export interface TranslationOption {
  language: TranslationLanguage
  author: string
  text: string
}

export interface CommentaryOption {
  language: TranslationLanguage
  author: string
  text: string
}

export interface ScenePalette {
  primary: string
  secondary: string
  accent: string
  fog: string
}

export interface Verse {
  id: number
  externalId: number
  chapterId: number
  chapterNumber: number
  verseNumber: number
  verseOrder: number
  title: string
  sanskrit: string
  transliteration: string
  wordMeanings: string
  translations: Record<TranslationLanguage, string>
  translationOptions: TranslationOption[]
  editorialSummary: string
  commentary: string
  commentaryAuthor: string
  commentaryOptions: CommentaryOption[]
  audioUrl: string
  theme: VerseTheme
  keywords: string[]
  scene: ScenePalette
}

export interface Chapter {
  id: number
  chapterNumber: number
  name: string
  nameMeaning: string
  nameTranslation: string
  nameTransliterated: string
  summary: string
  summaryHindi: string
  verseCount: number
  scene: ScenePalette
  symbol: string
}

export interface GitaData {
  chapters: Chapter[]
  verses: Verse[]
  metadata: {
    title: string
    source: string
    verseCount: number
    chapterCount: number
  }
}

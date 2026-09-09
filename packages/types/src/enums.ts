import { z } from 'zod'

// packages/db 의 pgEnum 과 값이 일치해야 함. 한쪽만 바꾸면 런타임에서 갈림
export const reportKind = z.enum(['sighting', 'lost', 'sheltered'])
export const reportStatus = z.enum(['draft', 'open', 'matched', 'resolved', 'hidden'])
export const animalType = z.enum(['dog', 'cat', 'other', 'unknown'])
export const animalSize = z.enum(['small', 'medium', 'large', 'unknown'])
export const animalSex = z.enum(['male', 'female', 'unknown'])
export const neuterStatus = z.enum(['done', 'not_done', 'unknown'])

export type ReportKind = z.infer<typeof reportKind>
export type ReportStatus = z.infer<typeof reportStatus>
export type AnimalType = z.infer<typeof animalType>
export type AnimalSize = z.infer<typeof animalSize>
export type AnimalSex = z.infer<typeof animalSex>
export type NeuterStatus = z.infer<typeof neuterStatus>

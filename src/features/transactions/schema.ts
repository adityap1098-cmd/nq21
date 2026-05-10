import { z } from 'zod'

export const transactionSchema = z.object({
  id: z.string(),
})

export type Transaction = z.infer<typeof transactionSchema>

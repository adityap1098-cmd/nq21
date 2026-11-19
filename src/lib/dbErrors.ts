interface PostgrestLikeError {
  code?: string
  message?: string
}

/**
 * Turns a Supabase/PostgREST error from a master-data write into a message a cashier
 * can act on. `entity` is the Indonesian noun shown to the user ("customer", "supplier").
 */
export function masterWriteError(err: unknown, entity: string): Error {
  const e = (err ?? {}) as PostgrestLikeError
  switch (e.code) {
    case '23505':
      return new Error(`Nama ${entity} sudah ada (mungkin nonaktif — cek "Tampilkan Nonaktif").`)
    case '42501':
      return new Error(`Akses ditolak: kamu tidak punya izin mengubah ${entity}.`)
    case 'PGRST116':
      // .single() got 0 rows: RLS hid the row or it no longer exists
      return new Error(`Tidak bisa menyimpan ${entity}: akses ditolak atau data tidak ditemukan.`)
    default:
      return new Error(e.message || `Gagal menyimpan ${entity}.`)
  }
}

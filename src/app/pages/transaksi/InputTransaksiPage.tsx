import { TransactionForm } from '@/features/transactions/components/TransactionForm'
import { PageHeader } from '@/components/nq21/PageHeader'

export default function InputTransaksiPage() {
  return (
    <>
      <PageHeader
        title="INPUT TRANSAKSI"
        subtitle="Catat transaksi baru — pemasukan atau pengeluaran"
      />
      <TransactionForm mode="add" />
    </>
  )
}

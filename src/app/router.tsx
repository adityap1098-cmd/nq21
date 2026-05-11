import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from './Layout'
import PlaceholderPage from './pages/PlaceholderPage'
import Login from './pages/Login'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import { LoadingFallback } from './components/LoadingFallback'

// Heavy pages — lazy loaded (split into own chunks)
const Dashboard = lazy(() => import('./pages/Dashboard'))
const InputTransaksiPage = lazy(() => import('./pages/transaksi/InputTransaksiPage'))
const DaftarTransaksiPage = lazy(() => import('./pages/transaksi/DaftarTransaksiPage'))
const DetailTransaksiPage = lazy(() => import('./pages/transaksi/DetailTransaksiPage'))
const EditTransaksiPage = lazy(() => import('./pages/transaksi/EditTransaksiPage'))
const LaporanKategoriPage = lazy(() => import('./pages/laporan/LaporanKategoriPage'))
const LaporanCashFlowPage = lazy(() => import('./pages/laporan/LaporanCashFlowPage'))
const LaporanJasaPage = lazy(() => import('./pages/laporan/LaporanJasaPage'))
const LaporanDynoPage = lazy(() => import('./pages/laporan/LaporanDynoPage'))
const PeriodeKomisiPage = lazy(() => import('./pages/komisi/PeriodeKomisiPage'))
const SlipPage = lazy(() => import('./pages/komisi/SlipPage'))
const MekanikKomisiPage = lazy(() => import('./pages/komisi/MekanikKomisiPage'))

// Master pages — lazy (moderate weight, access on demand)
const MasterCustomerPage = lazy(() => import('./pages/master/MasterCustomerPage'))
const MasterSupplierPage = lazy(() => import('./pages/master/MasterSupplierPage'))
const MasterKategoriPage = lazy(() => import('./pages/master/MasterKategoriPage'))
const MasterMekanikPage = lazy(() => import('./pages/master/MasterMekanikPage'))
const MasterUserPage = lazy(() => import('./pages/master/MasterUserPage'))


const wrap = (el: React.ReactElement) => (
  <Suspense fallback={<LoadingFallback />}>{el}</Suspense>
)

const ph = (heading: string, sub?: string) => (
  <PlaceholderPage heading={heading} sub={sub} />
)

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      // Standalone pages (no sidebar/topbar)
      { path: 'komisi/slip/:periodId/:mechanicId', element: wrap(<SlipPage />) },
      {
        element: <Layout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard',            element: wrap(<Dashboard />) },
          { path: 'transaksi',            element: wrap(<DaftarTransaksiPage />) },
          { path: 'transaksi/baru',       element: wrap(<InputTransaksiPage />) },
          { path: 'transaksi/:id',        element: wrap(<DetailTransaksiPage />) },
          { path: 'transaksi/:id/edit',   element: wrap(<EditTransaksiPage />) },
          { path: 'laporan/kategori',     element: wrap(<LaporanKategoriPage />) },
          { path: 'laporan/cash-flow',    element: wrap(<LaporanCashFlowPage />) },
          { path: 'laporan/jasa',         element: wrap(<LaporanJasaPage />) },
          { path: 'laporan/dyno',         element: wrap(<LaporanDynoPage />) },
          { path: 'komisi/periode',       element: wrap(<PeriodeKomisiPage />) },
          { path: 'komisi/periode/:id',   element: ph('DETAIL PERIODE') },
          { path: 'komisi/mekanik',       element: wrap(<MekanikKomisiPage />) },
          { path: 'master/customer',      element: wrap(<MasterCustomerPage />) },
          { path: 'master/supplier',      element: wrap(<MasterSupplierPage />) },
          { path: 'master/kategori',      element: wrap(<MasterKategoriPage />) },
          { path: 'master/mekanik',       element: wrap(<MasterMekanikPage />) },
          { path: 'master/user',          element: wrap(<MasterUserPage />) },
          ...(import.meta.env.DEV
            ? (() => {
                const TestPage = lazy(() => import('./test'))
                const TestMasterCRUDPage = lazy(() => import('./pages/_test-master-crud'))
                return [
                  { path: 'test',        element: wrap(<TestPage />) },
                  { path: 'test-master', element: wrap(<TestMasterCRUDPage />) },
                ]
              })()
            : []),
        ],
      },
    ],
  },
])

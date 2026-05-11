import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from './Layout'
import TestPage from './test'
import PlaceholderPage from './pages/PlaceholderPage'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import TestMasterCRUDPage from './pages/_test-master-crud'
import MasterMekanikPage from './pages/master/MasterMekanikPage'
import MasterCustomerPage from './pages/master/MasterCustomerPage'
import MasterSupplierPage from './pages/master/MasterSupplierPage'
import MasterKategoriPage from './pages/master/MasterKategoriPage'
import MasterUserPage from './pages/master/MasterUserPage'
import InputTransaksiPage from './pages/transaksi/InputTransaksiPage'
import DaftarTransaksiPage from './pages/transaksi/DaftarTransaksiPage'
import DetailTransaksiPage from './pages/transaksi/DetailTransaksiPage'
import EditTransaksiPage from './pages/transaksi/EditTransaksiPage'
import LaporanKategoriPage from './pages/laporan/LaporanKategoriPage'
import LaporanCashFlowPage from './pages/laporan/LaporanCashFlowPage'
import LaporanJasaPage from './pages/laporan/LaporanJasaPage'
import LaporanDynoPage from './pages/laporan/LaporanDynoPage'
import PeriodeKomisiPage from './pages/komisi/PeriodeKomisiPage'
import SlipPage from './pages/komisi/SlipPage'
import MekanikKomisiPage from './pages/komisi/MekanikKomisiPage'
import ProtectedRoute from '@/components/layout/ProtectedRoute'

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
      { path: 'komisi/slip/:periodId/:mechanicId', element: <SlipPage /> },
      {
        element: <Layout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard',                       element: <Dashboard /> },
          { path: 'transaksi',                       element: <DaftarTransaksiPage /> },
          { path: 'transaksi/baru',                  element: <InputTransaksiPage /> },
          { path: 'transaksi/:id',                   element: <DetailTransaksiPage /> },
          { path: 'transaksi/:id/edit',              element: <EditTransaksiPage /> },
          { path: 'laporan/kategori',                element: <LaporanKategoriPage /> },
          { path: 'laporan/cash-flow',               element: <LaporanCashFlowPage /> },
          { path: 'laporan/jasa',                    element: <LaporanJasaPage /> },
          { path: 'laporan/dyno',                    element: <LaporanDynoPage /> },
          { path: 'komisi/periode',                  element: <PeriodeKomisiPage /> },
          { path: 'komisi/periode/:id',              element: ph('DETAIL PERIODE') },
          { path: 'komisi/mekanik',                  element: <MekanikKomisiPage /> },
          { path: 'master/customer',                 element: <MasterCustomerPage /> },
          { path: 'master/supplier',                 element: <MasterSupplierPage /> },
          { path: 'master/kategori',                 element: <MasterKategoriPage /> },
          { path: 'master/mekanik',                  element: <MasterMekanikPage /> },
          { path: 'master/user',                     element: <MasterUserPage /> },
          { path: 'test',                            element: <TestPage /> },
          { path: 'test-master',                     element: <TestMasterCRUDPage /> },
        ],
      },
    ],
  },
])

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Clock, User, Calendar } from 'lucide-react'
import UploadPage from './pages/UploadPage'
import AnalysisPage from './pages/AnalysisPage'
import HistoryPage from './pages/HistoryPage'
import ProfilePage from './pages/ProfilePage'
import CalendarPage from './pages/CalendarPage'
import { AnalysisResult } from './types'

type Tab = 'home' | 'calendar' | 'history' | 'profile'
type Page = 'upload' | 'analysis' | 'calendar' | 'history' | 'profile'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [currentPage, setCurrentPage] = useState<Page>('upload')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [images, setImages] = useState<{ myImage: string; masterImage: string } | null>(null)

  const handleAnalysisComplete = (
    result: AnalysisResult,
    myImage: string,
    masterImage: string
  ) => {
    setAnalysisResult(result)
    setImages({ myImage, masterImage })
    setCurrentPage('analysis')
  }

  const handleBackToUpload = () => {
    setCurrentPage('upload')
    setAnalysisResult(null)
    setImages(null)
  }

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    if (tab === 'home') {
      if (currentPage === 'analysis') {
        // 保持在分析页
      } else {
        setCurrentPage('upload')
      }
    } else if (tab === 'calendar') {
      setCurrentPage('calendar')
    } else if (tab === 'history') {
      setCurrentPage('history')
    } else if (tab === 'profile') {
      setCurrentPage('profile')
    }
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'upload':
        return <UploadPage onAnalysisComplete={handleAnalysisComplete} />
      case 'analysis':
        return analysisResult && images ? (
          <AnalysisPage
            result={analysisResult}
            myImage={images.myImage}
            masterImage={images.masterImage}
            onBack={handleBackToUpload}
          />
        ) : null
      case 'calendar':
        return <CalendarPage />
      case 'history':
        return <HistoryPage />
      case 'profile':
        return <ProfilePage />
      default:
        return <UploadPage onAnalysisComplete={handleAnalysisComplete} />
    }
  }

  const showTabBar = currentPage !== 'analysis'

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* 页面内容 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>

      {/* 底部 TabBar */}
      {showTabBar && (
        <nav className="tabbar">
          <button
            className={`tabbar-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => handleTabChange('home')}
          >
            <Home className="tabbar-icon" />
            <span className="tabbar-label">首页</span>
          </button>

          <button
            className={`tabbar-item ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => handleTabChange('calendar')}
          >
            <Calendar className="tabbar-icon" />
            <span className="tabbar-label">日历</span>
          </button>

          <button
            className={`tabbar-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => handleTabChange('history')}
          >
            <Clock className="tabbar-icon" />
            <span className="tabbar-label">历史</span>
          </button>

          <button
            className={`tabbar-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => handleTabChange('profile')}
          >
            <User className="tabbar-icon" />
            <span className="tabbar-label">我的</span>
          </button>
        </nav>
      )}
    </div>
  )
}

export default App

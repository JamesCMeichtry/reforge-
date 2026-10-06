import { useEffect, useState } from 'react'
import TabBar, { TABS } from './components/TabBar.jsx'
import { SCREENS } from './screens.jsx'

const DEFAULT_TAB = 'today'

function tabFromHash() {
  const id = window.location.hash.replace('#', '')
  return TABS.some((tab) => tab.id === id) ? id : DEFAULT_TAB
}

export default function App() {
  const [activeTab, setActiveTab] = useState(tabFromHash)

  // Keeps the tab in sync with the URL, so refresh and the back button work
  useEffect(() => {
    const onHashChange = () => setActiveTab(tabFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [activeTab])

  const selectTab = (id) => {
    if (id !== activeTab) window.location.hash = id
  }

  const Screen = SCREENS[activeTab]

  return (
    <div className="min-h-dvh bg-ink text-white">
      <main
        className="mx-auto max-w-xl px-5"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 2rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 6.5rem)',
        }}
      >
        <Screen />
      </main>
      <TabBar activeTab={activeTab} onSelect={selectTab} />
    </div>
  )
}

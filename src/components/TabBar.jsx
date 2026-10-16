export const TABS = [
  {
    id: 'today',
    label: 'Today',
    icon: (
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M10 21v-6h4v6" />
      </>
    ),
  },
  {
    id: 'programme',
    label: 'Programme',
    icon: <path d="M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12" />,
  },
  {
    id: 'body-map',
    label: 'Body map',
    icon: (
      <>
        <circle cx="12" cy="4.5" r="2" />
        <path d="M12 7.5v7M6 9.5l6 1 6-1M12 14.5l-3 6.5M12 14.5l3 6.5" />
      </>
    ),
  },
  {
    id: 'progress',
    label: 'Progress',
    icon: (
      <>
        <path d="M3 20h18" />
        <path d="m5 16 5-5 3 3 6-7" />
        <path d="M15 7h4v4" />
      </>
    ),
  },
  {
    id: 'rehab',
    label: 'Rehab',
    icon: <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z" />,
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
      </>
    ),
  },
]

// Extra tab for physio, PT and coach accounts
export const CLIENTS_TAB = {
  id: 'clients',
  label: 'Clients',
  icon: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M17.5 14.3c2.4.6 4 2.6 4 5.7" />
    </>
  ),
}

function Icon({ size = 24, children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// Phones and tablets: tabs along the bottom
export default function TabBar({ activeTab, onSelect, tabs = TABS }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-ink/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto grid max-w-xl" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => onSelect(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex w-full flex-col items-center gap-1 whitespace-nowrap pt-3 pb-2 text-[10px] font-medium tracking-tight transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold ${
                  isActive ? 'text-gold' : 'text-muted hover:text-white'
                }`}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-gold"
                  />
                )}
                <Icon>{tab.icon}</Icon>
                <span>{tab.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// Laptops: a sidebar down the left. Professionals get their clients at the top, their own training below.
export function SideBar({ activeTab, onSelect, tabs = TABS }) {
  const isPro = tabs.some((tab) => tab.id === CLIENTS_TAB.id)
  const groups = isPro
    ? [
        ['Your clients', tabs.filter((tab) => tab.id === CLIENTS_TAB.id)],
        ['Your training', tabs.filter((tab) => tab.id !== CLIENTS_TAB.id)],
      ]
    : [[null, tabs]]

  return (
    <nav
      aria-label="Main"
      className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-panel px-4 py-8 lg:flex"
    >
      <button type="button" onClick={() => onSelect(tabs[0].id)} className="px-3 text-left">
        <span className="block font-display text-4xl font-bold uppercase leading-none tracking-tight text-white">
          Reforge
        </span>
        <span aria-hidden="true" className="mt-2 block h-1 w-8 bg-gold" />
        {isPro && (
          <span className="mt-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Pro desk</span>
        )}
      </button>
      <div className="mt-8 space-y-6">
        {groups.map(([title, list]) => (
          <div key={title ?? 'all'}>
            {title && <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">{title}</p>}
            <ul className="space-y-1">
              {list.map((tab) => {
                const isActive = tab.id === activeTab
                return (
                  <li key={tab.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(tab.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-gold ${
                        isActive ? 'bg-gold/10 text-gold' : 'text-muted hover:bg-ink/60 hover:text-white'
                      }`}
                    >
                      {isActive && (
                        <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gold" />
                      )}
                      <Icon size={20}>{tab.icon}</Icon>
                      {tab.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}

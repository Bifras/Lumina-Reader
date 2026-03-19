import { BookOpenText, Maximize2, Minus, X } from 'lucide-react'
import type { ReactElement } from 'react'

type WindowChromeTheme = 'light' | 'dark' | 'sepia'

interface WindowTitleBarProps {
  theme: WindowChromeTheme
  contextLabel?: string | null
  contextDetail?: string
  progress?: number
  isReading?: boolean
}

function WindowTitleBar({
  theme,
  contextLabel,
  contextDetail,
  progress,
  isReading
}: WindowTitleBarProps): ReactElement | null {
  const electronAPI = window.electronAPI

  if (!electronAPI) {
    return null
  }

  // Se non c'è un capitolo specifico, non mostriamo alcun testo "placeholder", ma solo le altre info.
  const displayChapter = contextLabel;

  return (
    <header className="title-bar" data-chrome-theme={theme}>
      <div className="title-drag-area">
        <div className="title-bar__brand">
          <BookOpenText size={16} aria-hidden="true" />
          <span className="title-bar__brand-name">Lumina</span>
        </div>

        {contextDetail ? (
          <>
            <span className="title-bar__separator" aria-hidden="true" />
            <span className="title-bar__context-detail" title={contextDetail}>
              {contextDetail}
            </span>
          </>
        ) : null}

        {displayChapter ? (
          <>
            <span className="title-bar__separator title-bar__separator--subtle" aria-hidden="true" />
            <span className="title-bar__context-label title-bar__context-label--chapter" title={displayChapter}>
              {displayChapter}
            </span>
          </>
        ) : null}

        {isReading && progress !== undefined ? (
          <span className="title-bar__progress">
            {progress}%
          </span>
        ) : null}
      </div>

      <div className="window-controls" role="group" aria-label="Controlli finestra">
        <button
          type="button"
          className="control-btn"
          onClick={() => void electronAPI.minimize()}
          aria-label="Minimizza finestra"
          title="Minimizza"
        >
          <Minus size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="control-btn"
          onClick={() => void electronAPI.maximize()}
          aria-label="Ingrandisci o ripristina finestra"
          title="Ingrandisci o ripristina"
        >
          <Maximize2 size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="control-btn control-btn--close"
          onClick={() => void electronAPI.close()}
          aria-label="Chiudi finestra"
          title="Chiudi"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}

export default WindowTitleBar

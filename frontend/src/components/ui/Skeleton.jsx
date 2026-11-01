import { LogoMark } from "./Logo"

export function AppSkeleton() {
  return (
    <div className="shell skeleton-shell" aria-busy="true" aria-label="Loading">
      <div className="sidebar skel-sidebar">
        <div className="skel-row"><LogoMark size={26} /><span className="skel w60" /></div>
        <span className="skel block h42" />
        <span className="skel block h36" />
        <div className="skel-list"><span /><span /><span /><span /><span /></div>
      </div>
      <main className="main">
        <div className="skel-main">
          <span className="skel w30 h24" />
          <div className="skel-center">
            <LogoMark size={44} thinking />
          </div>
        </div>
      </main>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="page-skeleton" aria-busy="true" aria-label="Loading">
      <span className="skel w20 h20" />
      <span className="skel w70 h56" />
      <span className="skel w50 h56" />
      <span className="skel w45 h20" />
      <span className="skel block h320" />
    </div>
  )
}

export function ChatSkeleton() {
  return (
    <div className="chat-skeleton" aria-busy="true" aria-label="Loading chat">
      <span className="skel w40 h40 right" />
      <span className="skel w70 h18" />
      <span className="skel w55 h18" />
      <span className="skel block h44" />
      <span className="skel w65 h18" />
    </div>
  )
}

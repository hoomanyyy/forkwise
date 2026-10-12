import "../styles/Dashboard.css"

export default function ProgressBar({ done, total }) {
    const percent = total > 0 ? Math.round((done / total) * 100) : 0
    return (
        <div className="d-flex align-items-center gap-2">
            <div className="ProgressTrack">
                <div className="ProgressFill" style={{ width: `${percent}%` }} />
            </div>
            <span className="ProgressText">{done}/{total}</span>
        </div>
    )
}
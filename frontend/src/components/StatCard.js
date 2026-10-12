import "../styles/Dashboard.css"

export function StatCard({ title, value }) {
    return (
        <div className="ContainerInfo">
            <p className="InfoTitle mb-0">{title}</p>
            <h3 className="InfoValue">{value}</h3>
        </div>
    )
}
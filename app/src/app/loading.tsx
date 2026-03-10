import MageHandLogo from "@/components/ui/MageHandLogo";

export default function RootLoading() {
    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "#0a0f1a",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
            }}
        >
            <MageHandLogo size={100} />
            <p
                style={{
                    color: "rgba(93, 226, 255, 0.7)",
                    marginTop: "1.5rem",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.9rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                }}
            >
                In viaggio tra i reami...
            </p>
        </div>
    );
}

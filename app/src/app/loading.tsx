import D20Dice from "@/components/ui/D20Dice";

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
            <D20Dice size={80} autoRollInterval={3000} />
            <p
                style={{
                    color: "rgba(0, 229, 160, 0.7)",
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

function ToolTip(props: any) {
  const { innterRef, data } = props;
  const { text } = data;

  return (
    <div
      ref={innterRef}
      style={{
        position: "absolute",
        zIndex: 999,
        background: "#010209",
        minWidth: "200px",
        padding: "12px 16px",
        border: "2px solid #163FA2",
        borderRadius: "4px",
        visibility: "hidden",
        color: "#3B93E6",
        pointerEvents: "none",
        whiteSpace: "pre-line",
        lineHeight: "1.6",
        fontSize: "14px",
      }}
    >
      {text || "this is ToolTip"}
    </div>
  );
}

export default ToolTip;

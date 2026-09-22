/** Three slow-drifting blurred color fields behind the page. */
export function AmbientBlobs({ darker = false }: { darker?: boolean }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 -z-20 overflow-hidden ${darker ? "blobs-darker" : ""}`}
    >
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
    </div>
  );
}

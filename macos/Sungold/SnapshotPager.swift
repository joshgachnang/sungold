import Foundation

/// Pages GET /sync/snapshot for one stream the way @terreno/syncdb's bootstrap does:
/// - echo `legacyCursor` while the server drains legacy seq-0 rows;
/// - never advance past `frontierSeq`;
/// - if the stored cursor is below `oldestRetainedSeq`, purge the stream and restart from 0 once;
/// - stop when the server says there is no more, or when a page makes no progress.
/// Runs on the main actor: its closures read and write SessionStore's published state.
@MainActor
struct SnapshotPager {
    let fetch: (_ cursor: Int, _ legacyCursor: String?) async throws -> SnapshotPage
    let currentCursor: () -> Int
    /// Applies a page's entities and, when given, advances the stream cursor.
    let applyPage: (_ page: SnapshotPage, _ advanceCursorTo: Int?) -> Void
    let purge: () -> Void
    /// False once the caller has been superseded (sign-out, restart); stops paging.
    let isCurrent: () -> Bool

    struct Superseded: Error {}

    func run() async throws {
        var cursor = currentCursor()
        var legacyCursor: String?
        var retentionChecked = false
        while true {
            let page = try await fetch(cursor, legacyCursor)
            guard isCurrent() else { throw Superseded() }

            if !retentionChecked {
                retentionChecked = true
                if cursor > 0, cursor < (page.oldestRetainedSeq ?? 0) {
                    purge()
                    cursor = 0
                    legacyCursor = nil
                    continue
                }
            }

            if let nextLegacy = page.legacyCursor {
                applyPage(page, nil)
                let advanced = nextLegacy != legacyCursor
                legacyCursor = nextLegacy
                if !advanced { return }
                continue
            }
            legacyCursor = nil

            let clamped = min(page.cursor, page.frontierSeq ?? page.cursor)
            let madeProgress = clamped > cursor
            applyPage(page, madeProgress ? clamped : nil)
            if madeProgress { cursor = clamped }
            // A server reporting more pages without moving the cursor would otherwise loop forever.
            if !(page.hasMore && madeProgress) { return }
        }
    }
}

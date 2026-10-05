import {Box, Button, Card, Heading, Text, TextArea, TextField} from "@terreno/ui";
import type React from "react";
import {useCallback, useMemo, useState} from "react";
import {
  useFocussessionsReviewMutation,
  useFocussessionsSkipReviewMutation,
} from "@/store/openApiSdk";

export interface ReviewSession {
  _id: string;
  endedAt?: string | null;
  intention?: string;
}

export interface ReviewParkingLotItem {
  _id: string;
  text: string;
  status: "open" | "done" | "dismissed";
  created?: string;
}

/**
 * Items a session's review may resolve, matching the server rule: still open and already
 * captured when the session ended (in it or carried into it). Thoughts parked in a later
 * session are not offered.
 */
export const reviewableItems = (
  session: ReviewSession,
  items: ReviewParkingLotItem[]
): ReviewParkingLotItem[] =>
  items.filter(
    (item) =>
      item.status === "open" &&
      Boolean(session.endedAt) &&
      Boolean(item.created) &&
      (item.created as string) <= (session.endedAt as string)
  );

type ReviewItemStatus = "open" | "done" | "dismissed";

const statusLabel = (status: ReviewItemStatus): string => {
  if (status === "done") {
    return "Done";
  }
  if (status === "dismissed") {
    return "Dismiss";
  }
  return "Carry";
};

export const ReviewSheet: React.FC<{
  items: ReviewParkingLotItem[];
  onClose: () => void;
  session: ReviewSession;
}> = ({items: allItems, onClose, session}) => {
  const items = useMemo(() => reviewableItems(session, allItems), [allItems, session]);
  const [done, setDone] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [itemStatuses, setItemStatuses] = useState<Record<string, ReviewItemStatus>>(() =>
    Object.fromEntries(items.map((item) => [item._id, "open" as const]))
  );
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitReview, {isLoading: isSubmitting}] = useFocussessionsReviewMutation();
  const [skipReview, {isLoading: isSkipping}] = useFocussessionsSkipReviewMutation();

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.text.localeCompare(b.text)),
    [items]
  );

  const setItemStatus = useCallback((id: string, status: ReviewItemStatus): void => {
    setItemStatuses((current) => ({...current, [id]: status}));
  }, []);

  const handleSubmit = useCallback(async (): Promise<void> => {
    setError(undefined);
    const result = await submitReview({
      body: {
        done: done.trim(),
        items: sortedItems.map((item) => ({
          id: item._id,
          status: itemStatuses[item._id] ?? "open",
        })),
        note: note.trim(),
      },
      id: session._id,
    });
    if ("error" in result && result.error) {
      setError("Could not save the review. Try again.");
      return;
    }
    onClose();
  }, [done, itemStatuses, note, onClose, session._id, sortedItems, submitReview]);

  const handleSkip = useCallback(async (): Promise<void> => {
    setError(undefined);
    const result = await skipReview(session._id);
    if ("error" in result && result.error) {
      setError("Could not skip the review. Try again.");
      return;
    }
    onClose();
  }, [onClose, session._id, skipReview]);

  return (
    <Card>
      <Box gap={3} testID="review-sheet">
        <Heading size="sm">Review your focus block</Heading>
        {session.intention ? (
          <Box testID="review-session-intention">
            <Text color="secondaryDark">{session.intention}</Text>
          </Box>
        ) : null}
        <TextField
          onChange={setDone}
          testIDs={{input: "review-done-input"}}
          title="What got done"
          value={done}
        />
        <TextArea
          helperText="One line is enough."
          onChange={setNote}
          testIDs={{input: "review-note-input"}}
          title="Note"
          value={note}
        />
        <Box gap={2} testID="review-items">
          <Heading color="primary" size="sm">
            Parking lot
          </Heading>
          {sortedItems.length === 0 ? (
            <Box testID="review-items-empty">
              <Text color="secondaryDark">No parked thoughts to review.</Text>
            </Box>
          ) : (
            sortedItems.map((item) => {
              const status = itemStatuses[item._id] ?? "open";
              return (
                <Box gap={2} key={item._id} testID={`review-item-${item._id}`}>
                  <Text skipLinking>{item.text}</Text>
                  <Box direction="row" gap={2} wrap>
                    {(["done", "open", "dismissed"] as const).map((option) => (
                      <Button
                        key={option}
                        onClick={() => setItemStatus(item._id, option)}
                        testID={`review-item-${item._id}-${option}-button`}
                        text={
                          status === option
                            ? `${statusLabel(option)} selected`
                            : statusLabel(option)
                        }
                        variant={status === option ? undefined : "secondary"}
                      />
                    ))}
                  </Box>
                </Box>
              );
            })
          )}
        </Box>
        {error ? (
          <Box testID="review-error">
            <Text color="error">{error}</Text>
          </Box>
        ) : null}
        <Box direction="row" gap={2} wrap>
          <Button
            disabled={isSubmitting || isSkipping}
            loading={isSubmitting}
            onClick={handleSubmit}
            testID="review-submit-button"
            text="Save review"
          />
          <Button
            disabled={isSubmitting || isSkipping}
            loading={isSkipping}
            onClick={handleSkip}
            testID="review-skip-button"
            text="Skip"
            variant="secondary"
          />
        </Box>
      </Box>
    </Card>
  );
};

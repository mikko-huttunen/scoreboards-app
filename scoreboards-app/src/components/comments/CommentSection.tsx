import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Avatar,
  Box,
  Divider,
  IconButton,
  Paper,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Button,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendIcon from '@mui/icons-material/Send';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import type { Comment } from '../../types/Comment.ts';
import { useDateFormat } from '../../utils/Utils.ts';
import { useCurrentUser } from '../../contexts/CurrentUserContext.tsx';
import { LoadingSpinner } from '../common/spinner/LoadingSpinner.tsx';
import { ConfirmDialog } from '../common/dialog/ConfirmDialog.tsx';

// Comments are read newest first, so only the last page is rendered and older ones are added
// five at a time as the reader scrolls back up.
const COMMENTS_PAGE_SIZE = 5;

// How close to the top of the list counts as "scrolled up far enough" to pull in older comments.
const LOAD_OLDER_SCROLL_THRESHOLD_PX = 48;

type CommentSectionProps = {
  title: string;
  comments: Comment[];
  isScoreboardOwner: boolean;
  maxLength?: number;
  placeholder?: string;
  onCreateComment: (comment: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  refresh?: () => Promise<void> | void;
};

export const CommentSection: React.FC<CommentSectionProps> = ({
  title,
  comments,
  isScoreboardOwner,
  maxLength = 100,
  placeholder = 'Write a comment...',
  onCreateComment,
  onDeleteComment,
  refresh,
}) => {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingCommentIds, setDeletingCommentIds] = useState<Set<string>>(
    new Set()
  );
  const [commentPendingDeletion, setCommentPendingDeletion] =
    useState<Comment | null>(null);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const { format_date } = useDateFormat();
  const { user } = useCurrentUser();

  const sortedComments = useMemo(
    () =>
      [...comments].sort(
        (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()
      ),
    [comments]
  );

  // The window of loaded comments is pinned by the id of its oldest comment, so comments arriving
  // at the bottom never push already loaded ones back out. The count is the fallback for when that
  // comment is deleted.
  const [loadedCount, setLoadedCount] = useState(COMMENTS_PAGE_SIZE);
  const [oldestLoadedId, setOldestLoadedId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Scroll height captured right before older comments are prepended, used to hold the reader's
  // place afterwards.
  const scrollHeightBeforeLoadRef = useRef<number | null>(null);
  const hasScrolledToLatestRef = useRef(false);
  const shouldScrollToNewCommentRef = useRef(false);

  const startIndex = useMemo(() => {
    const anchorIndex = oldestLoadedId
      ? sortedComments.findIndex((item) => item.id === oldestLoadedId)
      : -1;

    if (anchorIndex >= 0) return anchorIndex;

    return Math.max(0, sortedComments.length - loadedCount);
  }, [loadedCount, oldestLoadedId, sortedComments]);

  const visibleComments = useMemo(
    () => sortedComments.slice(startIndex),
    [sortedComments, startIndex]
  );

  const olderCommentCount = startIndex;

  const loadOlderComments = useCallback(() => {
    if (startIndex <= 0) return;

    const nextStartIndex = Math.max(0, startIndex - COMMENTS_PAGE_SIZE);

    scrollHeightBeforeLoadRef.current = scrollRef.current?.scrollHeight ?? null;
    setLoadedCount(sortedComments.length - nextStartIndex);
    setOldestLoadedId(sortedComments[nextStartIndex]?.id ?? null);
  }, [sortedComments, startIndex]);

  const handleCommentsScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    if (element.scrollTop > LOAD_OLDER_SCROLL_THRESHOLD_PX) return;

    loadOlderComments();
  }, [loadOlderComments]);

  // Open on the most recent comments instead of the oldest ones, and pin the window to the first
  // page from the start so later comments extend the list instead of sliding it.
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element || hasScrolledToLatestRef.current) return;
    if (sortedComments.length === 0) return;

    element.scrollTop = element.scrollHeight;
    hasScrolledToLatestRef.current = true;
    setOldestLoadedId(sortedComments[startIndex]?.id ?? null);
  }, [sortedComments, startIndex]);

  // Comments added at the bottom widen the loaded window, so the fallback count has to grow with
  // it or a deleted anchor would snap the list back to a single page.
  useLayoutEffect(() => {
    const currentlyLoaded = sortedComments.length - startIndex;
    if (currentlyLoaded > loadedCount) setLoadedCount(currentlyLoaded);
  }, [loadedCount, sortedComments.length, startIndex]);

  // Older comments are added above the ones already on screen, so the scroll position is shifted
  // down by exactly their height to keep the reader looking at the same comment.
  useLayoutEffect(() => {
    const element = scrollRef.current;
    const scrollHeightBeforeLoad = scrollHeightBeforeLoadRef.current;
    if (!element || scrollHeightBeforeLoad === null) return;

    scrollHeightBeforeLoadRef.current = null;
    element.scrollTop += element.scrollHeight - scrollHeightBeforeLoad;
  }, [startIndex]);

  // A posted comment lands at the bottom of the list, which can be out of view when older
  // comments have been loaded. The scroll waits for the parent to hand the comment back.
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element || !shouldScrollToNewCommentRef.current) return;

    shouldScrollToNewCommentRef.current = false;
    element.scrollTop = element.scrollHeight;
  }, [sortedComments.length]);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      await onCreateComment(trimmed);
      setValue('');
      shouldScrollToNewCommentRef.current = true;
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    if (!refresh || isRefreshing) return;

    try {
      setIsRefreshing(true);
      await refresh();
      shouldScrollToNewCommentRef.current = true;
    } finally {
      setIsRefreshing(false);
    }
  };

  // Emojis are dropped where the caret is rather than appended, so they can be written mid-sentence.
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const input = inputRef.current;
    const selectionStart = input?.selectionStart ?? value.length;
    const selectionEnd = input?.selectionEnd ?? value.length;

    const next =
      value.slice(0, selectionStart) +
      emojiData.emoji +
      value.slice(selectionEnd);

    setEmojiAnchorEl(null);

    if (next.length > maxLength) return;

    setValue(next);

    const caret = selectionStart + emojiData.emoji.length;
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(caret, caret);
    });
  };

  const handleDeleteConfirm = async () => {
    const commentId = commentPendingDeletion?.id;
    if (!commentId) return;

    setDeletingCommentIds((prev) => new Set(prev).add(commentId));
    try {
      await onDeleteComment(commentId);
    } finally {
      setCommentPendingDeletion(null);
      setDeletingCommentIds((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  };

  const isDeleting = commentPendingDeletion
    ? deletingCommentIds.has(commentPendingDeletion.id)
    : false;

  return (
    <Stack sx={{ width: '100%' }} spacing={2}>
      <Stack direction="row" alignItems="center">
        <Typography variant="h6" sx={{ color: '#1b5e20' }}>
          {title}
        </Typography>

        {refresh && (
          <Tooltip title="Refresh">
            <span>
              <IconButton
                onClick={handleRefresh}
                disabled={isRefreshing}
                aria-label="refresh comments"
                sx={{ color: '#38a14f' }}
              >
                {isRefreshing ? <LoadingSpinner size={20} /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Stack>

      <Paper elevation={1} sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
        <Stack spacing={2}>
          <Box
            ref={scrollRef}
            onScroll={handleCommentsScroll}
            sx={{
              maxHeight: { xs: 360, sm: 420 },
              overflowY: 'auto',
              pr: 0.5,
            }}
          >
            {sortedComments.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  textAlign: 'center',
                  color: 'text.secondary',
                  backgroundColor: '#fafafa',
                }}
              >
                <Typography variant="body2">
                  No comments yet. Be the first to comment.
                </Typography>
              </Paper>
            ) : (
              <Stack spacing={1.5}>
                {/*
                  Scrolling up loads the next page on its own, but a short list leaves nothing to
                  scroll, so the older comments stay reachable through this button as well.
                */}
                {olderCommentCount > 0 && (
                  <Button
                    size="small"
                    onClick={loadOlderComments}
                    sx={{ alignSelf: 'center', textTransform: 'none' }}
                  >
                    {`Load older comments (${olderCommentCount} more)`}
                  </Button>
                )}

                {visibleComments.map((item) => {
                  const isAuthor =
                    !!user?.id &&
                    (item.userId === user.id || item.createdBy === user.id);
                  const canDelete = isAuthor || isScoreboardOwner;

                  const deleting = deletingCommentIds.has(item.id);

                  return (
                    <Paper
                      key={item.id}
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: '#fcfcfc',
                      }}
                    >
                      <Stack spacing={1}>
                        <Stack
                          direction="row"
                          alignItems="flex-start"
                          justifyContent="space-between"
                          spacing={1}
                        >
                          <Stack
                            direction="row"
                            spacing={1.25}
                            alignItems="center"
                          >
                            <Avatar
                              src={item.avatar || undefined}
                              alt={item.username ?? undefined}
                              sx={{ width: 36, height: 36 }}
                            >
                              {item.username?.charAt(0)?.toUpperCase() || '?'}
                            </Avatar>

                            <Box>
                              <Typography
                                variant="subtitle2"
                                sx={{
                                  lineHeight: 1.2,
                                  wordBreak: 'break-word',
                                }}
                              >
                                {item.username || '[Removed user]'}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {format_date(item.created)}
                              </Typography>
                            </Box>
                          </Stack>

                          {canDelete && (
                            <Tooltip title="Delete comment">
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={deleting}
                                  onClick={() =>
                                    setCommentPendingDeletion(item)
                                  }
                                  aria-label="delete comment"
                                  sx={{
                                    color: '#38a14f',
                                    p: 0.25,
                                    '& .MuiSvgIcon-root': { fontSize: 18 },
                                  }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                        </Stack>

                        <Typography
                          variant="body2"
                          sx={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            lineHeight: 1.5,
                          }}
                        >
                          {item.comment}
                        </Typography>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Box>

          <Divider />

          <Stack spacing={1.25}>
            <TextField
              fullWidth
              multiline
              minRows={3}
              maxRows={6}
              value={value}
              disabled={submitting}
              inputRef={inputRef}
              onChange={(e) => {
                if (e.target.value.length <= maxLength) {
                  setValue(e.target.value);
                }
              }}
              placeholder={placeholder}
              helperText={`${value.length}/${maxLength}`}
            />

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              spacing={1}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <Tooltip title="Add emoji">
                  <span>
                    <IconButton
                      size="small"
                      disabled={submitting}
                      onClick={(event) => setEmojiAnchorEl(event.currentTarget)}
                      aria-label="add emoji"
                    >
                      <EmojiEmotionsOutlinedIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                <Button
                  variant="contained"
                  endIcon={<SendIcon />}
                  onClick={handleSubmit}
                  disabled={submitting || value.trim().length === 0}
                  sx={{
                    alignSelf: { xs: 'stretch', sm: 'flex-end' },
                    backgroundColor: '#1b5e20',
                    ':hover': { backgroundColor: '#154a19' },
                  }}
                >
                  Comment
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      <Popover
        open={!!emojiAnchorEl}
        anchorEl={emojiAnchorEl}
        onClose={() => setEmojiAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { backgroundColor: 'transparent' } } }}
      >
        <EmojiPicker
          onEmojiClick={handleEmojiClick}
          width={320}
          height={400}
          previewConfig={{ showPreview: false }}
        />
      </Popover>

      <ConfirmDialog
        open={!!commentPendingDeletion}
        onCancel={() => {
          if (!isDeleting) setCommentPendingDeletion(null);
        }}
        title="Delete Comment"
        text="Are you sure you want to delete this comment? This action cannot be undone."
        confirmLabel="Delete comment"
        loading={isDeleting}
        confirmDisabled={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </Stack>
  );
};

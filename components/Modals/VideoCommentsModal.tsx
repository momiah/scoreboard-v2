import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  Modal,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  orderBy,
  query,
} from "firebase/firestore";
import { Comment, GameVideoCommentReply, GameVideo } from "@shared/types";
import { COLLECTION_NAMES } from "@shared";
import { UserContext } from "../../context/UserContext";
import { formatDisplayName } from "@/helpers/formatDisplayName";
import { ccImageEndpoint } from "@shared";

import { timeAgo } from "@/helpers/formatDate";

interface VideoCommentsModalProps {
  visible: boolean;
  onClose: () => void;
  video: GameVideo;
}

const VideoCommentsModal: React.FC<VideoCommentsModalProps> = ({
  visible,
  onClose,
  video,
}) => {
  const { currentUser } = useContext(UserContext);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedCommentIds, setExpandedCommentIds] = useState<Set<string>>(
    new Set(),
  );
  const [replies, setReplies] = useState<
    Record<string, GameVideoCommentReply[]>
  >({});
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState("");

  const db = getFirestore();

  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    try {
      const commentsQuery = query(
        collection(
          db,
          COLLECTION_NAMES.gameVideos,
          video.gameId,
          COLLECTION_NAMES.comments,
        ),
        orderBy("createdAt", "desc"),
      );
      const snapshot = await getDocs(commentsQuery);
      const fetched = snapshot.docs.map((d) => ({
        ...(d.data() as Comment),
        commentId: (d.data() as Comment).commentId || d.id,
      }));
      setComments(fetched);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [video.gameId]);

  useEffect(() => {
    if (visible) fetchComments();
  }, [visible]);

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !currentUser) return;
    setIsSubmitting(true);
    try {
      const newComment: Comment = {
        commentId: "",
        gameId: video.gameId,
        text: commentText.trim(),
        createdAt: new Date(),
        postedBy: {
          userId: currentUser.userId,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          username: currentUser.username,
          profileImage: currentUser.profileImage,
        },
        likes: 0,
        likedBy: [],
        replyCount: 0,
      };

      const docRef = await addDoc(
        collection(
          db,
          COLLECTION_NAMES.gameVideos,
          video.gameId,
          COLLECTION_NAMES.comments,
        ),
        newComment,
      );

      await updateDoc(docRef, { commentId: docRef.id });

      await updateDoc(doc(db, COLLECTION_NAMES.gameVideos, video.gameId), {
        commentCount: increment(1),
      });

      setComments((prev) => [{ ...newComment, commentId: docRef.id }, ...prev]);
      setCommentText("");
    } catch (error) {
      console.error("Failed to submit comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (comment: Comment) => {
    if (!currentUser) return;
    const isLiked = comment.likedBy.includes(currentUser.userId);
    const commentRef = doc(
      db,
      COLLECTION_NAMES.gameVideos,
      video.gameId,
      COLLECTION_NAMES.comments,
      comment.commentId,
    );

    // Optimistic update
    setComments((prev) =>
      prev.map((c) =>
        c.commentId === comment.commentId
          ? {
              ...c,
              likes: isLiked ? c.likes - 1 : c.likes + 1,
              likedBy: isLiked
                ? c.likedBy.filter((id) => id !== currentUser.userId)
                : [...c.likedBy, currentUser.userId],
            }
          : c,
      ),
    );

    try {
      await updateDoc(commentRef, {
        likedBy: isLiked
          ? arrayRemove(currentUser.userId)
          : arrayUnion(currentUser.userId),
        likes: increment(isLiked ? -1 : 1),
      });
    } catch (error) {
      console.error("Failed to like comment:", error);
      fetchComments(); // revert on failure
    }
  };

  const fetchReplies = async (commentId: string) => {
    try {
      const repliesQuery = query(
        collection(
          db,
          COLLECTION_NAMES.gameVideos,
          video.gameId,
          COLLECTION_NAMES.comments,
          commentId,
          COLLECTION_NAMES.replies,
        ),
        orderBy("createdAt", "asc"),
      );
      const snapshot = await getDocs(repliesQuery);
      const fetched = snapshot.docs.map((d) => ({
        ...(d.data() as GameVideoCommentReply),
        replyId: (d.data() as GameVideoCommentReply).replyId || d.id,
      }));
      setReplies((prev) => ({ ...prev, [commentId]: fetched }));
    } catch (error) {
      console.error("Failed to fetch replies:", error);
    }
  };

  const handleToggleReplies = (commentId: string) => {
    setExpandedCommentIds((prev) => {
      const updated = new Set(prev);
      if (updated.has(commentId)) {
        updated.delete(commentId);
      } else {
        updated.add(commentId);
        if (!replies[commentId]) fetchReplies(commentId);
      }
      return updated;
    });
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || !currentUser || !replyingTo) return;
    try {
      const newReply: GameVideoCommentReply = {
        replyId: "",
        commentId: replyingTo.commentId,
        text: replyText.trim(),
        createdAt: new Date(),
        postedBy: {
          userId: currentUser.userId,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          username: currentUser.username,
          profileImage: currentUser.profileImage,
        },
        likes: 0,
        likedBy: [],
      };

      const docRef = await addDoc(
        collection(
          db,
          COLLECTION_NAMES.gameVideos,
          video.gameId,
          COLLECTION_NAMES.comments,
          replyingTo.commentId,
          COLLECTION_NAMES.replies,
        ),
        newReply,
      );

      await updateDoc(docRef, { replyId: docRef.id });

      const replyWithId = { ...newReply, replyId: docRef.id };

      await updateDoc(
        doc(
          db,
          COLLECTION_NAMES.gameVideos,
          video.gameId,
          COLLECTION_NAMES.comments,
          replyingTo.commentId,
        ),
        { replyCount: increment(1) },
      );

      setReplies((prev) => ({
        ...prev,
        [replyingTo.commentId]: [
          ...(prev[replyingTo.commentId] ?? []),
          replyWithId,
        ],
      }));

      setComments((prev) =>
        prev.map((c) =>
          c.commentId === replyingTo.commentId
            ? { ...c, replyCount: c.replyCount + 1 }
            : c,
        ),
      );

      setReplyText("");
      setReplyingTo(null);
      setExpandedCommentIds((prev) => new Set(prev).add(replyingTo.commentId));
    } catch (error) {
      console.error("Failed to submit reply:", error);
    }
  };
  const handleLikeReply = async (reply: GameVideoCommentReply) => {
    if (!currentUser) return;
    const isLiked = reply.likedBy.includes(currentUser.userId);
    const replyRef = doc(
      db,
      COLLECTION_NAMES.gameVideos,
      video.gameId,
      COLLECTION_NAMES.comments,
      reply.commentId,
      COLLECTION_NAMES.replies,
      reply.replyId,
    );

    // Optimistic update
    setReplies((prev) => ({
      ...prev,
      [reply.commentId]: prev[reply.commentId].map((r) =>
        r.replyId === reply.replyId
          ? {
              ...r,
              likes: isLiked ? r.likes - 1 : r.likes + 1,
              likedBy: isLiked
                ? r.likedBy.filter((id) => id !== currentUser.userId)
                : [...r.likedBy, currentUser.userId],
            }
          : r,
      ),
    }));

    try {
      await updateDoc(replyRef, {
        likedBy: isLiked
          ? arrayRemove(currentUser.userId)
          : arrayUnion(currentUser.userId),
        likes: increment(isLiked ? -1 : 1),
      });
    } catch (error) {
      console.error("Failed to like reply:", error);
    }
  };

  const renderReply = (reply: GameVideoCommentReply) => {
    const isReplyLiked = currentUser
      ? reply.likedBy.includes(currentUser.userId)
      : false;

    return (
      <ReplyContainer key={reply.replyId}>
        <CommentAvatar
          source={
            reply.postedBy.profileImage
              ? { uri: reply.postedBy.profileImage }
              : { uri: ccImageEndpoint }
          }
        />
        <ReplyContent>
          <CommentName>{formatDisplayName(reply.postedBy)}</CommentName>
          <CommentText>{reply.text}</CommentText>
          <CommentTime>{timeAgo(reply.createdAt)}</CommentTime>
        </ReplyContent>
        <LikeButton onPress={() => handleLikeReply(reply)}>
          <Ionicons
            name={isReplyLiked ? "heart" : "heart-outline"}
            size={16}
            color={isReplyLiked ? "#FF4B6E" : "rgba(255,255,255,0.5)"}
          />
          {reply.likes > 0 && <LikeCount>{reply.likes}</LikeCount>}
        </LikeButton>
      </ReplyContainer>
    );
  };

  const renderComment = ({ item }: { item: Comment }) => {
    const isLiked = currentUser
      ? item.likedBy.includes(currentUser.userId)
      : false;
    const isExpanded = expandedCommentIds.has(item.commentId);

    return (
      <CommentContainer>
        <CommentRow>
          <CommentAvatar
            source={
              item.postedBy.profileImage
                ? { uri: item.postedBy.profileImage }
                : { uri: ccImageEndpoint }
            }
          />
          <CommentContent>
            <CommentName>{formatDisplayName(item.postedBy)}</CommentName>
            <CommentText>{item.text}</CommentText>
            <CommentFooter>
              <CommentTime>{timeAgo(item.createdAt)}</CommentTime>
              {item.replyCount > 0 && (
                <TouchableOpacity
                  onPress={() => handleToggleReplies(item.commentId)}
                >
                  <ReplyToggleText>
                    {isExpanded
                      ? "Hide replies"
                      : `View ${item.replyCount} ${item.replyCount === 1 ? "reply" : "replies"}`}
                  </ReplyToggleText>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setReplyingTo(item)}>
                <ReplyToggleText>Reply</ReplyToggleText>
              </TouchableOpacity>
            </CommentFooter>

            {isExpanded && replies[item.commentId]?.map(renderReply)}
          </CommentContent>

          <LikeButton onPress={() => handleLikeComment(item)}>
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={16}
              color={isLiked ? "#FF4B6E" : "rgba(255,255,255,0.5)"}
            />
            {item.likes > 0 && <LikeCount>{item.likes}</LikeCount>}
          </LikeButton>
        </CommentRow>
      </CommentContainer>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <ModalOverlay>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Comments</ModalTitle>
              <TouchableOpacity onPress={onClose}>
                <AntDesign name="closecircleo" size={26} color="red" />
              </TouchableOpacity>
            </ModalHeader>

            {isLoading ? (
              <ActivityIndicator
                size="small"
                color="#00A2FF"
                style={{ paddingVertical: 32 }}
              />
            ) : (
              <FlatList
                data={comments}
                renderItem={renderComment}
                keyExtractor={(item) => item.commentId}
                ListEmptyComponent={
                  <EmptyText>
                    No comments yet. Be the first to comment!
                  </EmptyText>
                }
                style={{ maxHeight: 400 }}
              />
            )}

            {/* Reply indicator */}
            {replyingTo && (
              <ReplyingToRow>
                <ReplyingToText>
                  Replying to {formatDisplayName(replyingTo.postedBy)}
                </ReplyingToText>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <Ionicons name="close" size={16} color="#888" />
                </TouchableOpacity>
              </ReplyingToRow>
            )}

            {/* Input */}
            <InputRow>
              <CommentInput
                placeholder={
                  replyingTo ? "Write a reply..." : "Add a comment..."
                }
                placeholderTextColor="#555"
                value={replyingTo ? replyText : commentText}
                onChangeText={replyingTo ? setReplyText : setCommentText}
                multiline
              />
              <SendButton
                onPress={replyingTo ? handleSubmitReply : handleSubmitComment}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#00A2FF" />
                ) : (
                  <Ionicons name="send" size={20} color="#00A2FF" />
                )}
              </SendButton>
            </InputRow>
          </ModalContent>
        </KeyboardAvoidingView>
      </ModalOverlay>
    </Modal>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const ModalOverlay = styled(BlurView).attrs({
  intensity: 50,
  tint: "dark",
})({
  flex: 1,
  justifyContent: "flex-end",
});

const ModalContent = styled.View({
  backgroundColor: "rgba(2, 13, 24, 1)",
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  paddingBottom: 40,
  minHeight: "60%",
});

const ModalHeader = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 20,
  borderBottomWidth: 1,
  borderBottomColor: "#1a2b3d",
});

const ModalTitle = styled.Text({
  fontSize: 18,
  fontWeight: "bold",
  color: "white",
});

// ── Comment ───────────────────────────────────────────────────────────────────

const CommentContainer = styled.View({
  paddingHorizontal: 16,
  paddingVertical: 12,
  //   borderBottomWidth: 1,
  //   borderBottomColor: "#0d1f30",
});

const CommentRow = styled.View({
  flexDirection: "row",
  gap: 10,
});

const CommentAvatar = styled.Image({
  width: 34,
  height: 34,
  borderRadius: 17,
  borderWidth: 1,
  borderColor: "#1a2b3d",
});

const CommentContent = styled.View({
  flex: 1,
});

const CommentName = styled.Text({
  color: "white",
  fontSize: 13,
  fontWeight: "600",
  marginBottom: 2,
});

const CommentText = styled.Text({
  color: "rgba(255,255,255,0.85)",
  fontSize: 13,
  lineHeight: 18,
});

const CommentFooter = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  marginTop: 6,
});

const CommentTime = styled.Text({
  color: "#555",
  fontSize: 11,
});

const ReplyToggleText = styled.Text({
  color: "#00A2FF",
  fontSize: 11,
  fontWeight: "600",
});

const LikeButton = styled.TouchableOpacity({
  alignItems: "center",
  justifyContent: "flex-start",
  alignSelf: "flex-start",
  paddingLeft: 8,
  paddingTop: 2,
});

const LikeCount = styled.Text({
  color: "rgba(255,255,255,0.5)",
  fontSize: 10,
  marginTop: 2,
});

// ── Reply ─────────────────────────────────────────────────────────────────────

const ReplyContainer = styled.View({
  flexDirection: "row",
  gap: 8,
  marginTop: 10,
  paddingLeft: 5,
});

const ReplyContent = styled.View({
  flex: 1,
});

// ── Input ─────────────────────────────────────────────────────────────────────

const ReplyingToRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 16,
  paddingVertical: 8,
  backgroundColor: "#0d1f30",
});

const ReplyingToText = styled.Text({
  color: "#888",
  fontSize: 12,
});

const InputRow = styled.View({
  flexDirection: "row",
  alignItems: "flex-end",
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderTopWidth: 1,
  borderTopColor: "#1a2b3d",
  gap: 10,
});

const CommentInput = styled.TextInput({
  flex: 1,
  backgroundColor: "#0d1f30",
  borderRadius: 20,
  paddingHorizontal: 16,
  paddingVertical: 10,
  color: "white",
  fontSize: 14,
  maxHeight: 100,
});

const SendButton = styled.TouchableOpacity({
  paddingBottom: 10,
});

const EmptyText = styled.Text({
  color: "#555",
  fontSize: 13,
  textAlign: "center",
  paddingVertical: 32,
});

export default VideoCommentsModal;

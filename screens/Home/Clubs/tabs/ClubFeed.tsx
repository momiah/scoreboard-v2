import React, { useCallback, useRef, useState } from "react";
import {
  Image,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { db } from "../../../../services/firebase.config";
import { COLLECTION_NAMES, ccImageEndpoint } from "@shared";
import type { ClubFeedDocument } from "@shared/types";

type FeedRow = ClubFeedDocument & { id: string };
type IoniconName = keyof typeof Ionicons.glyphMap;

const PAGE_SIZE = 20;

const toDate = (value: unknown): Date => {
  if (value instanceof Date) return value;
  const seconds = (value as { seconds?: number })?.seconds;
  return seconds ? new Date(seconds * 1000) : new Date();
};

const timeAgo = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
    { label: "second", seconds: 1 },
  ];
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count > 0) return `${count} ${interval.label}${count > 1 ? "s" : ""} ago`;
  }
  return "just now";
};

interface ClubFeedProps {
  clubId?: string;
}

const ClubFeed: React.FC<ClubFeedProps> = ({ clubId }) => {
  const [feed, setFeed] = useState<FeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Cursor to the last loaded doc, used by startAfter for the next page.
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const hasLoadedRef = useRef(false);

  const applyFirstPage = useCallback(
    (docs: QueryDocumentSnapshot<DocumentData>[]) => {
      const rows = docs.map((d) => ({ id: d.id, ...d.data() }) as FeedRow);
      lastDocRef.current = docs[docs.length - 1] ?? null;
      setFeed(rows);
      setHasMore(docs.length === PAGE_SIZE);
    },
    [],
  );

  // First page: runs on focus (and pull-to-refresh). New items that arrive
  // between loads are only picked up here — not while scrolling.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const load = async () => {
        if (!clubId) {
          setLoading(false);
          return;
        }
        if (!hasLoadedRef.current) setLoading(true);
        try {
          const snap = await getDocs(
            query(
              collection(db, COLLECTION_NAMES.clubs, clubId, "feed"),
              orderBy("createdAt", "desc"),
              limit(PAGE_SIZE),
            ),
          );
          if (cancelled) return;
          applyFirstPage(snap.docs);
          hasLoadedRef.current = true;
        } catch (e) {
          console.error("Club feed load error:", e);
          if (!cancelled) setFeed([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      };

      load();
      return () => {
        cancelled = true;
      };
    }, [clubId, applyFirstPage]),
  );

  const handleRefresh = useCallback(async () => {
    if (!clubId) return;
    setRefreshing(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, COLLECTION_NAMES.clubs, clubId, "feed"),
          orderBy("createdAt", "desc"),
          limit(PAGE_SIZE),
        ),
      );
      applyFirstPage(snap.docs);
    } catch (e) {
      console.error("Club feed refresh error:", e);
    } finally {
      setRefreshing(false);
    }
  }, [clubId, applyFirstPage]);

  const handleEndReached = useCallback(async () => {
    if (loadingMore || refreshing || !hasMore || !clubId) return;
    const cursor = lastDocRef.current;
    if (!cursor) return;

    setLoadingMore(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, COLLECTION_NAMES.clubs, clubId, "feed"),
          orderBy("createdAt", "desc"),
          startAfter(cursor),
          limit(PAGE_SIZE),
        ),
      );
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FeedRow);
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? cursor;
      setFeed((prev) => [...prev, ...rows]);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (e) {
      console.error("Club feed pagination error:", e);
    } finally {
      setLoadingMore(false);
    }
  }, [clubId, loadingMore, refreshing, hasMore]);

  const renderItem = useCallback(({ item }: { item: FeedRow }) => {
    const created = toDate(item.createdAt);
    const avatar = item.actor?.profileImage;
    return (
      <Row>
        <Leading>
          {item.thumbnail ? (
            <Thumb source={{ uri: item.thumbnail || ccImageEndpoint }} />
          ) : avatar ? (
            <Avatar source={{ uri: avatar || ccImageEndpoint }} />
          ) : (
            <IconCircle>
              <Ionicons
                name={(item.icon as IoniconName) || "ellipse-outline"}
                size={18}
                color="#00A2FF"
              />
            </IconCircle>
          )}
        </Leading>
        <Body>
          <Title>{item.title}</Title>
          <Message>{item.message}</Message>
          {item.media?.imageUrl ? (
            <Media source={{ uri: item.media.imageUrl }} />
          ) : null}
          <Timestamp>{timeAgo(created)}</Timestamp>
        </Body>
      </Row>
    );
  }, []);

  if (loading) {
    return (
      <Centered>
        <ActivityIndicator size="small" color="#00A2FF" />
      </Centered>
    );
  }

  if (feed.length === 0) {
    return (
      <Centered>
        <Ionicons name="newspaper-outline" size={40} color="#33506e" />
        <EmptyText>
          No club activity yet. New members, competitions, and results will show
          up here.
        </EmptyText>
      </Centered>
    );
  }

  return (
    <FlatList
      data={feed}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#00A2FF"
          colors={["#00A2FF"]}
        />
      }
      ListFooterComponent={
        loadingMore ? (
          <FooterLoader>
            <ActivityIndicator size="small" color="#00A2FF" />
          </FooterLoader>
        ) : null
      }
    />
  );
};

const Centered = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: 40,
  paddingHorizontal: 24,
  gap: 12,
});

const EmptyText = styled.Text({
  color: "#888",
  fontStyle: "italic",
  fontSize: 14,
  lineHeight: 21,
  textAlign: "center",
});

const FooterLoader = styled.View({
  paddingVertical: 16,
});

const Row = styled.View({
  flexDirection: "row",
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: "rgb(9, 33, 62)",
});

const Leading = styled.View({
  marginRight: 12,
});

const Avatar = styled.Image({
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: "rgb(5, 26, 51)",
});

const Thumb = styled.Image({
  width: 44,
  height: 44,
  borderRadius: 8,
  backgroundColor: "rgb(5, 26, 51)",
});

const IconCircle = styled.View({
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: "rgba(0, 162, 255, 0.12)",
  justifyContent: "center",
  alignItems: "center",
});

const Body = styled.View({
  flex: 1,
});

const Title = styled.Text({
  color: "white",
  fontSize: 15,
  fontWeight: "bold",
  marginBottom: 2,
});

const Message = styled.Text({
  color: "#cdd6e0",
  fontSize: 14,
  lineHeight: 20,
});

const Media = styled(Image)({
  width: "100%",
  height: 180,
  borderRadius: 10,
  marginTop: 8,
  backgroundColor: "rgb(5, 26, 51)",
});

const Timestamp = styled.Text({
  color: "#6b7d92",
  fontSize: 12,
  marginTop: 6,
});

export default ClubFeed;

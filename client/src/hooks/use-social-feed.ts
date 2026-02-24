// Hook for managing social feed
// Location: client/src/hooks/use-social-feed.ts

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState, useCallback } from "react";

interface PostData {
  id: number;
  authorId: number;
  content: string;
  imageUrls?: string[];
  tags?: string[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  engagementScore: number;
  isTrending: boolean;
  createdAt: Date;
  author?: {
    id: number;
    displayName: string;
    profession?: string;
    profileImageUrl?: string;
    verifiedBadge: boolean;
    premiumMember: boolean;
  };
}

interface FeedResponse {
  success: boolean;
  data: PostData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export const useSocialFeed = (
  initialPage: number = 1,
  limit: number = 10,
  sort: "recent" | "trending" = "recent",
) => {
  const [page, setPage] = useState(initialPage);
  const queryClient = useQueryClient();

  // Fetch posts
  const {
    data: feedData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["socialFeed", page, limit, sort],
    queryFn: async () => {
      const response = await fetch(
        `/api/social/posts?page=${page}&limit=${limit}&sort=${sort}`,
      );
      if (!response.ok) throw new Error("Failed to fetch feed");
      return (await response.json()) as FeedResponse;
    },
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Like post mutation
  const likePostMutation = useMutation({
    mutationFn: async ({
      postId,
      userId,
    }: {
      postId: number;
      userId: number;
    }) => {
      const response = await fetch(`/api/social/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) throw new Error("Failed to like post");
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate feed to refresh counts
      queryClient.invalidateQueries({ queryKey: ["socialFeed"] });
    },
  });

  // Unlike post mutation
  const unlikePostMutation = useMutation({
    mutationFn: async ({
      postId,
      userId,
    }: {
      postId: number;
      userId: number;
    }) => {
      const response = await fetch(`/api/social/posts/${postId}/like`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) throw new Error("Failed to unlike post");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["socialFeed"] });
    },
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (postData: {
      authorId: number;
      content: string;
      imageUrls?: string[];
      tags?: string[];
      postType?: string;
    }) => {
      const response = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });
      if (!response.ok) throw new Error("Failed to create post");
      return response.json();
    },
    onSuccess: () => {
      // Reset to page 1 to show new post
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ["socialFeed"] });
    },
  });

  // Handle infinite scroll
  const handleLoadMore = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  const posts = feedData?.data || [];

  return {
    posts,
    isLoading,
    isError,
    error,
    page,
    setPage,
    hasNextPage:
      posts.length === limit &&
      (feedData?.pagination.total
        ? page * limit < feedData.pagination.total
        : false),
    loadMore: handleLoadMore,
    likePost: likePostMutation.mutate,
    unlikePost: unlikePostMutation.mutate,
    createPost: createPostMutation.mutate,
    isCreatingPost: createPostMutation.isPending,
  };
};

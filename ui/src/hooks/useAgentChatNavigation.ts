import { useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Agent, Issue } from "@paperclipai/shared";
import { agentsApi } from "@/api/agents";
import { agentChatsApi } from "@/api/agentChats";
import { authApi } from "@/api/auth";
import { useCompany } from "@/context/CompanyContext";
import { useSidebar } from "@/context/SidebarContext";
import { queryKeys } from "@/lib/queryKeys";
import { useLocation, useNavigate } from "@/lib/router";
import { agentRouteRef } from "@/lib/utils";
import { useAgentChatEnabled } from "./useAgentChatEnabled";
import { useHoldOpenChatUnread } from "./useOpenChatUnread";

export function useAgentChatNavigation() {
  const { selectedCompanyId: companyId } = useCompany();
  const { enabled, loaded } = useAgentChatEnabled();
  const session = useQuery({ queryKey: queryKeys.auth.session, queryFn: () => authApi.getSession() });
  const userId = session.data?.user?.id ?? session.data?.session?.userId ?? null;
  const agents = useQuery({
    queryKey: queryKeys.agents.list(companyId!), queryFn: () => agentsApi.list(companyId!),
    enabled: enabled && !!companyId,
  });
  const openAgentRef = useLocation().pathname.split("/chats/")[1]?.split("/")[0];
  const openAgentId = openAgentRef
    ? agents.data?.find(agent => agent.id === openAgentRef || encodeURIComponent(agentRouteRef(agent)) === openAgentRef)?.id ?? null
    : null;
  const chatList = {
    queryKey: queryKeys.agentChats.list(companyId, userId), queryFn: () => agentChatsApi.list(companyId!),
    enabled: enabled && !!companyId && session.isSuccess,
  };
  const openChatUnread = useQuery({
    ...chatList,
    select: (list: Issue[]) => list.some(chat => chat.conversationAgentId === openAgentId && !!(chat.isUnreadForMe || chat.unreadMessageCount)),
  }).data ?? false;
  const held = useHoldOpenChatUnread(openAgentId, openChatUnread);
  const chats = useQuery({
    ...chatList,
    select: useCallback((list: Issue[]) => held
      ? list.map(chat => chat.conversationAgentId === openAgentId && (chat.isUnreadForMe || chat.unreadMessageCount)
        ? { ...chat, isUnreadForMe: false, unreadMessageCount: 0 } : chat)
      : list, [held, openAgentId]),
  });
  return { companyId, userId, enabled, loaded, agents, chats, session };
}

/** Explicitly adding a chat uses the existing atomic, one-per-agent resolver. */
export function useOpenAgentChat(companyId: string | null, userId: string | null) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const { isMobile, setSidebarOpen } = useSidebar();
  const scope = useRef({ companyId, userId, mounted: true });
  useEffect(() => {
    const current = { companyId, userId, mounted: true };
    scope.current = current;
    return () => { current.mounted = false; };
  }, [companyId, userId]);
  return useCallback(async (agent: Agent, signal?: AbortSignal) => {
    if (!companyId || agent.companyId !== companyId) throw new Error("Choose an agent from this company.");
    const current = scope.current;
    const chat = await agentChatsApi.ensure(companyId, agent.id);
    client.setQueryData(queryKeys.agentChats.detail(companyId, userId, agent.id), chat);
    client.setQueryData(queryKeys.issues.detail(chat.id), chat);
    client.setQueryData<Issue[]>(queryKeys.agentChats.list(companyId, userId), previous =>
      [chat, ...(previous ?? []).filter(item => item.id !== chat.id)]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() || b.id.localeCompare(a.id)));
    if (!current.mounted || scope.current !== current || signal?.aborted) return;
    navigate(`/chats/${encodeURIComponent(agentRouteRef(agent))}`);
    if (isMobile) setSidebarOpen(false);
  }, [client, companyId, userId, navigate, isMobile, setSidebarOpen]);
}
